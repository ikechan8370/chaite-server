import { Hono } from "hono";
import { ratelimiter } from "../middleware/rateLimit";
import { User, Session } from "../db/schema";
import { db } from "../auth";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { formatBeijingDate } from "../utils/date";
import { ChatPreset } from "../types/preset";

export const presetsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const presets = await database.select()
      .from(schema.preset)
      .all();

    const user = c.get("user");
    return c.json({
      data: presets.map(p => fromPresetTable(p, user)),
      code: 0,
      msg: 'success'
    });
  });

export const presetRoute = new Hono<{
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
    const preset = await database.select()
      .from(schema.preset)
      .where(eq(schema.preset.id, parseInt(id)))
      .get();

    if (!preset) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Preset not found'
      }, 404);
    }

    const user = c.get("user");
    return c.json({
      data: fromPresetTable(preset, user),
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const body = await c.req.json() as ChatPreset;
    const user = c.get("user");
    const preset = intoPresetTable(body, user);
    const result = await database.insert(schema.preset).values(preset).returning().all();

    return c.json({
      data: fromPresetTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .patch("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");
    const body = await c.req.json() as Partial<ChatPreset>;
    const user = c.get("user");

    const existingPreset = await database.select()
      .from(schema.preset)
      .where(eq(schema.preset.id, parseInt(id)))
      .get();

    if (!existingPreset) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Preset not found'
      }, 404);
    }

    // Only allow updating specific fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.prefix !== undefined) updateData.prefix = body.prefix;
    if (body.namespace !== undefined) updateData.namespace = body.namespace;
    if (body.modelType !== undefined) updateData.modelType = body.modelType;
    if (body.sendMessageOption !== undefined) {
      updateData.sendMessageOption = JSON.stringify(body.sendMessageOption);
    }

    const result = await database.update(schema.preset)
      .set(updateData)
      .where(eq(schema.preset.id, parseInt(id)))
      .returning()
      .all();

    return c.json({
      data: fromPresetTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .delete("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");

    await database.delete(schema.preset)
      .where(eq(schema.preset.id, parseInt(id)))
      .run();

    return c.json({
      data: null,
      code: 0,
      msg: 'Preset deleted successfully'
    });
  });

function intoPresetTable(preset: ChatPreset, uploader: User): any {
  return {
    name: preset.name,
    description: preset.description,
    prefix: preset.prefix,
    namespace: preset.namespace,
    modelType: preset.modelType,
    sendMessageOption: JSON.stringify(preset.sendMessageOption),
    embedded: preset.embedded ? 1 : 0,
    uploaderId: uploader.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fromPresetTable(preset: any, user: User): ChatPreset {
  const chatPreset = new ChatPreset({
    id: preset.id + '',
    name: preset.name,
    description: preset.description,
    prefix: preset.prefix,
    namespace: preset.namespace,
    modelType: preset.modelType,
    embedded: preset.embedded === 1,
    uploader: {
      user_id: user.id + '',
      username: user.name as string,
    },
    createdAt: formatBeijingDate(preset.createdAt),
    updatedAt: formatBeijingDate(preset.updatedAt),
  });

  if (preset.sendMessageOption) {
    chatPreset.sendMessageOption = JSON.parse(preset.sendMessageOption);
  }

  return chatPreset;
}