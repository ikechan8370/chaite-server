import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins"
import {User, Session, account} from "./db/schema";
import { drizzle } from "drizzle-orm/d1";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/schema";
import { createMiddleware } from "hono/factory";
import { Hono } from "hono";
import { generateKey, decryptKey } from "./utils/key";
import {and, eq, or} from "drizzle-orm";
import {generateSalt, hashPassword, verifyPassword} from "./utils/crypto";

const app = new Hono<{
	Bindings: Env;
	Variables: {
		user: User;
		session: Session;
	};
}>();

export const db = (env: Env) => drizzle(env.USERS_DATABASE);

export const auth = (env: Env) =>
	betterAuth({
		database: drizzleAdapter(drizzle(env.USERS_DATABASE), {
			provider: "sqlite",
			schema: {
				account: schema.account,
				session: schema.session,
				user: schema.user,
				verification: schema.verification,
			},
		}),
		secret: env.SECRET,
		socialProviders: {
			github: {
				clientId: env.AUTH_GITHUB_ID,
				clientSecret: env.AUTH_GITHUB_SECRET,
				redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/github`,
			}
		},
		plugins: [
			genericOAuth({
				config: [
					{
						providerId: "linuxdo",
						clientId: env.AUTH_LINUXDO_ID,
						clientSecret: env.AUTH_LINUXDO_SECRET,
						authorizationUrl: "https://connect.linux.do/oauth2/authorize",
						tokenUrl: "https://connect.linux.do/oauth2/token",
						userInfoUrl: "https://connect.linux.do/api/user",
						// ... other config options
					},
					// Add more providers as needed
				]
			})
		]
	});

export const authMiddleware = createMiddleware(async (c, next) => {
	// Check for bearer token
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		try {
			const [userId, lastKeyGeneratedAtTimestamp] = await decryptKey(token, c.env.SECRET);
			console.log(userId)
			const user = await db(c.env)
				.select()
				.from(schema.user)
				.where(eq(schema.user.id, userId))
				.get();

			if (user) {
				console.log(user)
				if (!user.lastKeyGeneratedAt || user.lastKeyGeneratedAt === null) {
					// Update user with current timestamp if no lastKeyGeneratedAt
					const now = new Date();
					await db(c.env)
						.update(schema.user)
						.set({ lastKeyGeneratedAt: now })
						.where(eq(schema.user.id, userId))
						.run();
					user.lastKeyGeneratedAt = now;
				}

				// Convert both timestamps to numbers for comparison
				const storedTimestamp = user.lastKeyGeneratedAt.getTime();
				const providedTimestamp = Number(lastKeyGeneratedAtTimestamp);
				console.log({storedTimestamp, providedTimestamp})
				if (storedTimestamp === providedTimestamp) {
					c.set("user", user);
					c.set("session", null);
					await next();
					return;
				}
			}
		} catch (e) {
			console.error("API Key validation failed:", e);
			return c.json({ error: "Invalid API key" }, 401);
		}

		// If we reach here, the API key was invalid
		return c.json({ error: "Invalid API key" }, 401);
	}

	// Fall back to session-based auth
	const session = await auth(c.env).api.getSession({
		headers: c.req.raw.headers,
	});

	if (session?.user) {
		const user = await db(c.env)
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, session.user.id))
			.get();

		if (user && (!user.lastKeyGeneratedAt || user.lastKeyGeneratedAt === null)) {
			// Update user with current timestamp if no lastKeyGeneratedAt
			const now = new Date();
			await db(c.env)
				.update(schema.user)
				.set({ lastKeyGeneratedAt: now })
				.where(eq(schema.user.id, user.id))
				.run();
			user.lastKeyGeneratedAt = now;
		}

		c.set("session", session.session || null);
		c.set("user", user || null);
	}
	await next();
});

export const authRouter = app
	.all("/api/auth/*", (c) => {
		const authHandler = auth(c.env).handler;
		return authHandler(c.req.raw);
	})
	.get("/signout", async (c) => {
		await auth(c.env).api.signOut({
			headers: c.req.raw.headers,
		});
		return c.redirect("/");
	})
	.post("/register", async (c) => {
		const { username, email, password } = await c.req.parseBody();
		// check if it has registered
		const existingUser = await db(c.env)
			.select()
			.from(schema.user)
			.where(
				or(
					eq(schema.user.email, email as string),
					eq(schema.user.name, username as string)
				)
			)
			.get();
		if (existingUser) {
			return c.json({ error: "Username or email already exists" }, 400);
		}
		const result = await db(c.env)
			.insert(schema.user)
			// @ts-ignore
			.values({
				email: email as string,
				name: email as string,
				username: username as string,
				subscriptionId: null,
				emailVerified: false,
			})
			.returning();
		if (!result) {
			return c.json({ error: "Failed to create user" }, 500);
		}
		const salt = generateSalt()
		const accountResult = await db(c.env)
			.insert(schema.account)
			// @ts-ignore
			.values({
				userId: result[0].id,
				password: hashPassword(password as string, salt),
				salt,
			})
			.returning();
		if (!accountResult) {
			return c.json({ error: "Failed to create account" }, 500);
		}

		const lastKeyGeneratedAt = new Date().getTime();
		const token = await generateKey(result[0].id, String(lastKeyGeneratedAt), c.env.SECRET);
		return c.json({
			code: 0,
			data: { token },
			msg: 'success'
		});
})
	.post('/signin', async (c) => {
		const { email, password } = await c.req.parseBody();
		const result = await db(c.env)
			.select({
				user_id: schema.user.id,
				user_email: schema.user.email,
				account_salt: schema.account.salt,
				account_passwordHash: schema.account.password,
			})
			.from(schema.account)
			.leftJoin(schema.user, eq(schema.account.userId, schema.user.id))
			.where(eq(schema.user.email, email as string))
			.get();
		if (!result) return c.json({ error: "用户不存在或用户名密码错误" }, 401);
		const isValid = verifyPassword(
			password as string,
			result.account_passwordHash!,
			result.account_salt!
		);

		if (!isValid) return c.json({ error: "用户不存在或用户名密码错误" }, 401);

		const lastKeyGeneratedAt = new Date().getTime();
		const token = await generateKey(result.user_id!, String(lastKeyGeneratedAt), c.env.SECRET);

		return c.json({
			code: 0,
			data: { token },
			msg: 'success'
		});

})
	.get("/signin/:provider", async (c) => {
		const provider = c.req.param("provider");
		const signinUrl = await auth(c.env).api.signInWithOAuth2({
			body: {
				providerId: provider,
				callbackURL: '/'
			}
		});

		if (!signinUrl || !signinUrl.url) {
			return c.text("Failed to sign in", 500);
		}

		return c.redirect(signinUrl.url);
	})
	.post("/api/auth/token", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const lastKeyGeneratedAt = new Date().getTime();
		const token = await generateKey(user.id, String(lastKeyGeneratedAt), c.env.SECRET);

		return c.json({ token });
	});

