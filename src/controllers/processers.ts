import { Hono } from "hono";
import { ratelimiter } from "../middleware/rateLimit";
import { User, Session } from "../db/schema";
import { db } from "../auth";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { formatBeijingDate } from "../utils/date";
import { ProcessorDTO } from "../types/processors";

export const processorsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const processors = await database.select()
      .from(schema.processor)
      .all();

    const user = c.get("user");
    return c.json({
      data: processors.map(p => fromProcessorTable(p, user)),
      code: 0,
      msg: 'success'
    });
  });

export const processorRoute = new Hono<{
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
    const processor = await database.select()
      .from(schema.processor)
      .where(eq(schema.processor.id, parseInt(id)))
      .get();

    if (!processor) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Processor not found'
      }, 404);
    }

    const user = c.get("user");
    return c.json({
      data: fromProcessorTable(processor, user),
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const body = await c.req.json() as ProcessorDTO;
    const user = c.get("user");
    const processor = intoProcessorTable(body, user);
    const result = await database.insert(schema.processor).values(processor).returning().all();

    return c.json({
      data: fromProcessorTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .patch("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");
    const body = await c.req.json() as Partial<ProcessorDTO>;
    const user = c.get("user");

    const existingProcessor = await database.select()
      .from(schema.processor)
      .where(eq(schema.processor.id, parseInt(id)))
      .get();

    if (!existingProcessor) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Processor not found'
      }, 404);
    }

    // Only allow updating specific fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.type !== undefined) updateData.type = body.type;

    const result = await database.update(schema.processor)
      .set(updateData)
      .where(eq(schema.processor.id, parseInt(id)))
      .returning()
      .all();

    return c.json({
      data: fromProcessorTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .delete("/:id", async (c) => {
    const database = db(c.env);
    const id = c.req.param("id");

    await database.delete(schema.processor)
      .where(eq(schema.processor.id, parseInt(id)))
      .run();

    return c.json({
      data: null,
      code: 0,
      msg: 'Processor deleted successfully'
    });
  });

function intoProcessorTable(processor: ProcessorDTO, uploader: User): any {
  return {
    name: processor.name,
    description: processor.description,
    code: processor.code as string,
    modelType: processor.modelType,
    type: processor.type,
    uploaderId: uploader.id,
    embedded: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fromProcessorTable(processor: any, user: User): ProcessorDTO {
  return new ProcessorDTO({
    id: processor.id + '',
    name: processor.name,
    description: processor.description,
    code: processor.code as string,
    modelType: processor.modelType as ProcessorDTO['modelType'],
    type: processor.type as 'pre' | 'post',
    uploader: {
      user_id: user.id + '',
      username: user.name as string,
    },
    createdAt: formatBeijingDate(processor.createdAt),
    updatedAt: formatBeijingDate(processor.updatedAt),
  });
}