import {Hono} from "hono";
import {ratelimiter} from "../middleware/rateLimit";
import {User, Session, account, ToolTable} from "../db/schema";
import {db} from "../auth";
import * as schema from "../db/schema";
import {eq} from "drizzle-orm";
import {formatBeijingDate} from "../utils/date";
import {ToolDTO} from "../types/tools";

export const toolsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env)
    const tools = await database.select()
      .from(schema.tool)
      .all()

    const user = c.get("user");
    return c.json({
      data: tools.map(t => fromToolTable(t, user)),
      code: 0,
      msg: 'success'
    })
  })

export const toolRoute = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/:id", async (c) => {
    const database = db(c.env)
    const id = c.req.param("id")
    const tool = await database.select()
      .from(schema.tool)
      .where(eq(schema.tool.id, parseInt(id)))
      .get()

    if (!tool) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Tool not found'
      }, 404);
    }

    const user = c.get("user");
    return c.json({
      data: fromToolTable(tool, user),
      code: 0,
      msg: 'success'
    })
  })
  .post("/", async (c) => {
    const database = db(c.env)
    const body = (await c.req.json()) as ToolDTO
    const user = c.get("user")
    const tool = intoToolTable(body, user)
    const result: ToolTable[] = await database.insert(schema.tool).values(tool).returning();
    return c.json({
      data: fromToolTable(result[0], user),
      code: 0,
      msg: 'success'
    })
  })
  .patch("/:id", async (c) => {
    const database = db(c.env)
    const id = c.req.param("id")
    const body = (await c.req.json()) as Partial<ToolDTO>
    const user = c.get("user")

    const existingTool = await database.select()
      .from(schema.tool)
      .where(eq(schema.tool.id, parseInt(id)))
      .get()

    if (!existingTool) {
      return c.json({
        data: null,
        code: 404,
        msg: 'Tool not found'
      }, 404);
    }

    // Only allow updating specific fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.permission !== undefined) updateData.permission = body.permission;
    if (body.embedded !== undefined) updateData.embedded = body.embedded ? 1 : 0;

    const result = await database.update(schema.tool)
      .set(updateData)
      .where(eq(schema.tool.id, parseInt(id)))
      .returning()
      .all();

    return c.json({
      data: fromToolTable(result[0], user),
      code: 0,
      msg: 'success'
    });
  })
  .delete("/:id", async (c) => {
    const database = db(c.env)
    const id = c.req.param("id")

    await database.delete(schema.tool)
      .where(eq(schema.tool.id, parseInt(id)))
      .run();

    return c.json({
      data: null,
      code: 0,
      msg: 'Tool deleted successfully'
    });
  });


function intoToolTable(tool: ToolDTO, uploader: User): ToolTable {
  // @ts-ignore
  return {
    // id: 0,
    name: tool.name,
    description: tool.description,
    code: tool.code as string,
    modelType: tool.modelType,
    embedded: tool.embedded ? 1 : 0,
    status: tool.status,
    permission: tool.permission,
    uploaderId: uploader.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function fromToolTable(tool: ToolTable, user: User): ToolDTO {
  return new ToolDTO({
    id: tool.id + '',
    name: tool.name,
    description: tool.description,
    code: tool.code as string,
    modelType: tool.modelType as ToolDTO['modelType'],
    embedded: tool.embedded === 1,
    status: tool.status as ToolDTO['status'],
    permission: tool.permission as ToolDTO['permission'],
    uploader: {
      user_id: user.id + '',
      username: user.name as string,
    },
    createdAt: formatBeijingDate(tool.createdAt),
    updatedAt: formatBeijingDate(tool.updatedAt),
  })
}