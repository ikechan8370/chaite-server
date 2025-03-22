import { Hono } from "hono";
import { cors } from 'hono/cors'
import { authMiddleware, authRouter } from "./auth";
import type { User, Session } from "./db/schema";
import { paymentRouter } from "./payment/lemonsqueezy";
import { apiRouter } from "./api";
import { generateKey } from "./utils/key";
import { Landing } from "./ui/landing";
import {toolRoute, toolsRouter} from "./controllers/tool";
import {
	permissionRouter,
	rolePermissionRouter,
	roleRouter,
	userRoleRouter,
	userRoute,
	usersRouter
} from "./controllers/user";
import {menuPermissionRouter, menuRouter} from "./controllers/menu";
import {processorRoute, processorsRouter} from "./controllers/processers";
import {presetRoute, presetsRouter} from "./controllers/preset";
import {channelRoute, channelsRouter} from "./controllers/channel";

const app = new Hono<{
	Bindings: Env;
	Variables: {
		user: User;
		session: Session;
	};
}>()
	.use('*', cors({
		origin: 'http://localhost:5173',
		allowHeaders: ['Content-Type', 'Authorization'],
		allowMethods: ['POST', 'GET', 'OPTIONS'],
		exposeHeaders: ['Content-Length'],
		maxAge: 600,
		credentials: true,
	}))
	.use(authMiddleware)
	// main (signup) route
	.route("/", authRouter)
	// webhook handler
	.route("/", paymentRouter)
	// api routes
	.route("/api", apiRouter)
	.route("/api/v1/tools", toolsRouter)
	.route("/api/v1/tool", toolRoute)
	.route("/api/v1/processors", processorsRouter)
	.route("/api/v1/processor", processorRoute)
	.route("/api/v1/presets", presetsRouter)
	.route("/api/v1/preset", presetRoute)
	.route("/api/v1/channels", channelsRouter)
	.route("/api/v1/channel", channelRoute)

	.route("/api/v1/users", usersRouter)
	.route("/api/v1/user", userRoute)
	.route("/api/v1/role", roleRouter)
	.route("/api/v1/permission", permissionRouter)
	.route("/api/v1/user-role", userRoleRouter)
	.route("/api/v1/role-permission", rolePermissionRouter)
	.route("/api/v1/menu", menuRouter)
	.route("/api/v1/menu-permission", menuPermissionRouter)
	.get("/", async (c) => {
		const user = c.get("user");

		const apiKey = await generateKey(
			user?.id,
			String(user?.lastKeyGeneratedAt?.getTime()),
			c.env.SECRET
		);

		const subscriptionLink = `${c.env.LEMONSQUEEZY_CHECKOUT_LINK}?checkout[email]=${user?.email}`;
		const subscriptionStatus = user?.subscriptionId 
			? "Premium"
			: `Free • <a href="${subscriptionLink}">Upgrade</a>`;

		return c.html(<Landing user={user} apiKey={apiKey} subscriptionLink={subscriptionLink} />);
	});

export default app;
