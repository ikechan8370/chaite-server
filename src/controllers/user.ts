import { Hono } from "hono";
import { ratelimiter } from "../middleware/rateLimit";
import {User, Session, role, permission, rolePermission, userRole, UserRole} from "../db/schema";
import { db } from "../auth";
import * as schema from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { formatBeijingDate } from "../utils/date";

// Helper function to check if user has permission
export async function hasPermission(database: any, userId: string, resource: string, action: string) {
  const userRoles: UserRole[] = await database.select({
    roleId: schema.userRole.roleId,
  }).from(schema.userRole).where(eq(schema.userRole.userId, userId)).all();

  if (userRoles.length === 0) {
    return false;
  }

  const roleIds = userRoles.map(ur => ur.roleId);

  const permissionResult = await database.select({
    permission: schema.permission.id,
  }).from(schema.permission)
    .innerJoin(schema.rolePermission, eq(schema.permission.id, schema.rolePermission.permissionId))
    .where(
      and(
        inArray(schema.rolePermission.roleId, roleIds),
        eq(schema.permission.resource, resource),
        eq(schema.permission.action, action)
      )
    ).all();

  return permissionResult.length > 0;
}

export const usersRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const user = c.get("user");

    const hasAccess = await hasPermission(database, user.id, 'user', 'read');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const users = await database.select()
      .from(schema.user)
      .all();

    return c.json({
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: formatBeijingDate(u.createdAt),
        updatedAt: formatBeijingDate(u.updatedAt),
      })),
      code: 0,
      msg: 'success'
    });
  })
  .get("/current", async (c) => {
    const database = db(c.env);
    const user = c.get("user");

    // Get user roles
    const userRoles = await database.select({
      role: schema.role.name,
    }).from(schema.userRole)
      .innerJoin(schema.role, eq(schema.userRole.roleId, schema.role.id))
      .where(eq(schema.userRole.userId, user.id))
      .all();

    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        roles: userRoles.map(r => r.role),
        createdAt: formatBeijingDate(user.createdAt),
        updatedAt: formatBeijingDate(user.updatedAt),
      },
      code: 0,
      msg: 'success'
    });
  });

export const userRoute = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/:id", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");
    const userId = c.req.param("id");

    // Self or admin with permission
    const isSelf = currentUser.id === userId;
    if (!isSelf) {
      const hasAccess = await hasPermission(database, currentUser.id, 'user', 'read');
      if (!hasAccess) {
        return c.json({
          code: 403,
          msg: 'Forbidden',
          data: null
        }, 403);
      }
    }

    const user = await database.select()
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .get();

    if (!user) {
      return c.json({
        code: 404,
        msg: 'User not found',
        data: null
      }, 404);
    }

    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: formatBeijingDate(user.createdAt),
        updatedAt: formatBeijingDate(user.updatedAt),
      },
      code: 0,
      msg: 'success'
    });
  })
  .patch("/:id", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");
    const userId = c.req.param("id");

    // Self update or admin with permission
    const isSelf = currentUser.id === userId;
    if (!isSelf) {
      const hasAccess = await hasPermission(database, currentUser.id, 'user', 'update');
      if (!hasAccess) {
        return c.json({
          code: 403,
          msg: 'Forbidden',
          data: null
        }, 403);
      }
    }

    const { name, email, image } = await c.req.json();
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (image !== undefined) updateData.image = image;

    updateData.updatedAt = new Date();

    try {
      const result = await database.update(schema.user)
        .set(updateData)
        .where(eq(schema.user.id, userId))
        .returning()
        .all();

      if (result.length === 0) {
        return c.json({
          code: 404,
          msg: 'User not found',
          data: null
        }, 404);
      }

      return c.json({
        data: {
          id: result[0].id,
          name: result[0].name,
          email: result[0].email,
          image: result[0].image,
          createdAt: formatBeijingDate(result[0].createdAt),
          updatedAt: formatBeijingDate(result[0].updatedAt),
        },
        code: 0,
        msg: 'success'
      });
    } catch (error) {
      return c.json({
        code: 500,
        msg: 'Failed to update user',
        data: null
      }, 500);
    }
  });

export const roleRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'role', 'read');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const roles = await database.select()
      .from(schema.role)
      .all();

    return c.json({
      data: roles,
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'role', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { name, description } = await c.req.json();
    if (!name) {
      return c.json({
        code: 400,
        msg: 'Role name is required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.role).values({
        name,
        description,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      return c.json({
        data: result[0],
        code: 0,
        msg: 'success'
      });
    } catch (error) {
      return c.json({
        code: 500,
        msg: 'Failed to create role',
        data: null
      }, 500);
    }
  });

export const permissionRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .get("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'permission', 'read');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const permissions = await database.select()
      .from(schema.permission)
      .all();

    return c.json({
      data: permissions,
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'permission', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { name, description, resource, action } = await c.req.json();
    if (!name || !resource || !action) {
      return c.json({
        code: 400,
        msg: 'Name, resource and action are required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.permission).values({
        name,
        description,
        resource,
        action,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      return c.json({
        data: result[0],
        code: 0,
        msg: 'success'
      });
    } catch (error) {
      return c.json({
        code: 500,
        msg: 'Failed to create permission',
        data: null
      }, 500);
    }
  });

export const userRoleRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .post("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'userRole', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { userId, roleId } = await c.req.json();
    if (!userId || !roleId) {
      return c.json({
        code: 400,
        msg: 'User ID and Role ID are required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.userRole).values({
        userId,
        roleId,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      return c.json({
        data: result[0],
        code: 0,
        msg: 'success'
      });
    } catch (error) {
      return c.json({
        code: 500,
        msg: 'Failed to assign role to user',
        data: null
      }, 500);
    }
  });

export const rolePermissionRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: User;
    session: Session;
  };
}>()
  .use(ratelimiter)
  .post("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'rolePermission', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { roleId, permissionId } = await c.req.json();
    if (!roleId || !permissionId) {
      return c.json({
        code: 400,
        msg: 'Role ID and Permission ID are required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.rolePermission).values({
        roleId,
        permissionId,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      return c.json({
        data: result[0],
        code: 0,
        msg: 'success'
      });
    } catch (error) {
      return c.json({
        code: 500,
        msg: 'Failed to assign permission to role',
        data: null
      }, 500);
    }
  });