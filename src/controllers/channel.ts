import { Hono } from "hono";
import { ratelimiter } from "../middleware/rateLimit";
import { User, Session, ChannelTable } from "../db/schema";
import { db } from "../auth";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { formatBeijingDate } from "../utils/date";

export const channelsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const channels = await database.select()
      .from(schema.channel)
      .all();

    const user = c.get("user");
    return c.json({
      data: channels.map(ch => fromChannelTable(ch, user)),
      code: 0,
      msg: 'success'
    });
  });

export const channelRoute = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");
    const channel = await database.select()
      .from(schema.channel)
      .where(eq(schema.channel.id, parseInt(id)))
      .get();

    if (!channel) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Channel not found'
      }, 404);
    }

    const user = c.get("user");
    return c.json({
      data: fromChannelTable(channel, user),
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const body = await c.req.json();
    const user = c.get("user");
    const channel = intoChannelTable(body, user);
    const result = await database.insert(schema.channel).values(channel).returning().all();

    return c.json({
      data: fromChannelTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .patch("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");
    const body = await c.req.json();
    const user = c.get("user");

    const existingChannel = await database.select()
      .from(schema.channel)
      .where(eq(schema.channel.id, parseInt(id)))
      .get();

    if (!existingChannel) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Channel not found'
      }, 404);
    }

    // Only allow updating specific fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.modelType !== undefined) updateData.modelType = body.modelType;
    if (body.embedded !== undefined) updateData.embedded = body.embedded ? 1 : 0;
    if (body.adapterType !== undefined) updateData.adapterType = body.adapterType;
    if (body.models !== undefined) updateData.models = body.models;
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl;
    if (body.apiKey !== undefined) updateData.apiKey = body.apiKey;

    const result = await database.update(schema.channel)
      .set(updateData)
      .where(eq(schema.channel.id, parseInt(id)))
      .returning()
      .all();

    return c.json({
      data: fromChannelTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .delete("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");

    await database.delete(schema.channel)
      .where(eq(schema.channel.id, parseInt(id)))
      .run();

    return c.json({
      data: null,
      code: 0,
      msg: 'Channel deleted successfully'
    });
  });

function intoChannelTable(channel: any, uploader: User): any {
  return {
    name: channel.name,
    description: channel.description,
    code: channel.code,
    modelType: channel.modelType,
    embedded: channel.embedded ? 1 : 0,
    uploaderId: uploader.id,
    adapterType: channel.adapterType,
    models: channel.models,
    baseUrl: channel.baseUrl,
    apiKey: channel.apiKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fromChannelTable(channel: ChannelTable, user: User): any {
  return {
    id: channel.id + '',
    name: channel.name,
    description: channel.description,
    code: channel.code,
    modelType: channel.modelType,
    embedded: channel.embedded === 1,
    adapterType: channel.adapterType,
    models: channel.models,
    baseUrl: channel.baseUrl,
    apiKey: channel.apiKey,
    uploader: {
      user_id: user.id + '',
      username: user.name as string,
    },
    createdAt: formatBeijingDate(channel.createdAt),
    updatedAt: formatBeijingDate(channel.updatedAt),
  };
}