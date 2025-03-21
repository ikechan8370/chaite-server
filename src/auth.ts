import {betterAuth, logger} from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { User, Session, account } from "./db/schema";
import { drizzle } from "drizzle-orm/d1";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/schema";
import { createMiddleware } from "hono/factory";
import { Hono } from "hono";
import { generateKey, decryptKey } from "./utils/key";
import { and, eq, or } from "drizzle-orm";

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
		emailAndPassword: {
			enabled: true,
		},
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
					},
				]
			})
		]
	});

export const authMiddleware = createMiddleware(async (c, next) => {
	const skipAuthPaths = ["/register"];
	const requestPath = c.req.path;

	if (skipAuthPaths.includes(requestPath)) {
		await next();
		return;
	}
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		try {
			const [userId, lastKeyGeneratedAtTimestamp] = await decryptKey(token, c.env.SECRET);
			const user = await db(c.env)
				.select()
				.from(schema.user)
				.where(eq(schema.user.id, userId))
				.get();
			logger.info(JSON.stringify(user))
			if (user) {
				if (!user.lastKeyGeneratedAt) {
					const now = new Date();
					await db(c.env)
						.update(schema.user)
						.set({ lastKeyGeneratedAt: now })
						.where(eq(schema.user.id, userId))
						.run();
					user.lastKeyGeneratedAt = now;
				}

				const storedTimestamp = user.lastKeyGeneratedAt.getTime() / 1000;
				const providedTimestamp = Number(lastKeyGeneratedAtTimestamp) / 1000;
				if (Math.floor(storedTimestamp) === Math.floor(providedTimestamp)) {
					c.set("user", user);
					c.set("session", null);
					await next();
					return;
				} else {
					logger.error(`API Key validation failed: ${userId}, storedTimestamp: ${storedTimestamp}, providedTimestamp: ${providedTimestamp}`)
				}
			}
		} catch (e) {
			console.error("API Key validation failed:", e);
			return c.json({ error: "Invalid API key" }, 401);
		}

		return c.json({ error: "Invalid API key" }, 401);
	}

	const session = await auth(c.env).api.getSession({
		headers: c.req.raw.headers,
	});

	if (session?.user) {
		const user = await db(c.env)
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, session.user.id))
			.get();

		if (user && !user.lastKeyGeneratedAt) {
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
		const body = await c.req.json();
		console.log(body)
		const { username, email, password } = body;
		console.log({ username, email, password })
		if (!email || !password || !username) {
			return c.json({
				code: 1,
				data: null,
				msg: 'email, password or username cannot be empty'
			}, 400);
		}
		try {
			const signUpRes = await auth(c.env).api.signUpEmail({
				body: {
					email: email as string,
					password: password as string,
					name: username as string,
					image: "https://pic.ikechan8370.com/images/2022/06/19/1_W35QUSvGpcLuxPo3SRTH4w.png"
				}
			})
			const lastKeyGeneratedAt = new Date();
			const token = await generateKey(signUpRes.user.id, String(lastKeyGeneratedAt.getTime()), c.env.SECRET);
			await db(c.env)
				.update(schema.user)
				.set({ lastKeyGeneratedAt })
				.where(eq(schema.user.id, signUpRes.user.id))
				.run();
			return c.json({
				code: 0,
				data: { token },
				msg: 'success'
			});
		} catch (err) {
			if (err instanceof Error) {
				return c.json({
					code: 1,
					data: null,
					// @ts-ignore
					msg: err.body?.message || err.message
				}, 400);
			} else {
				return c.json({
					code: 1,
					data: null,
					msg: 'failed'
				}, 400);
			}
		}



	})
	.post('/signin', async (c) => {
		const { email, password } = await c.req.json();
		if (!email || !password) {
			return c.json({
				code: 1,
				data: null,
				msg: 'email or password is empty'
			}, 400);
		}
		try {
			const signInRes = await auth(c.env).api.signInEmail({
				body: {
					email: email as string,
					password: password as string
				}
			})
			if (signInRes.user) {
				const lastKeyGeneratedAt = new Date();
				const token = await generateKey(signInRes.user.id, String(lastKeyGeneratedAt.getTime()), c.env.SECRET);
				await db(c.env)
					.update(schema.user)
					.set({ lastKeyGeneratedAt })
					.where(eq(schema.user.id, signInRes.user.id))
					.run();

				return c.json({
					code: 0,
					data: { token },
					msg: 'success'
				});
			} else {
				return c.json({
					code: 1,
					data: null,
					msg: 'failed'
				}, 401);
			}
		} catch (err) {
			if (err instanceof Error) {
				return c.json({
					code: 1,
					data: null,
					// @ts-ignore
					msg: err.body?.message || err.message
				}, 401);
			} else {
				return c.json({
					code: 1,
					data: null,
					msg: 'failed'
				}, 401);
			}
		}



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