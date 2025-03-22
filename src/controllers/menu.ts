import { Hono } from "hono";
import { ratelimiter } from "../middleware/rateLimit";
import { User, Session } from "../db/schema";
import { db } from "../auth";
import * as schema from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { hasPermission } from "./user";

export const menuRouter = new Hono<{
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

    // Get all permissions this user has through their roles
    const userRoles = await database.select({
      roleId: schema.userRole.roleId,
    }).from(schema.userRole).where(eq(schema.userRole.userId, currentUser.id)).all();

    const roleIds = userRoles.map(ur => ur.roleId);

    // Get permissions associated with these roles
    const permissions = await database.select({
      permissionId: schema.rolePermission.permissionId,
    })
      .from(schema.rolePermission)
      .where(inArray(schema.rolePermission.roleId, roleIds))
      .all();

    const permissionIds = permissions.map(p => p.permissionId);

    // Get menu items associated with these permissions
    const menuItems = await database.select()
      .from(schema.menuItem)
      .leftJoin(schema.menuPermission, eq(schema.menuItem.id, schema.menuPermission.menuItemId))
      .where(inArray(schema.menuPermission.permissionId, permissionIds))
      .all();

    // Arrange menu items as a tree structure
    const menuTree = buildMenuTree(menuItems);

    return c.json({
      data: menuTree,
      code: 0,
      msg: 'success'
    });
  })
  .post("/", async (c) => {
    const database = db(c.env);
    const currentUser = c.get("user");

    const hasAccess = await hasPermission(database, currentUser.id, 'menu', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { name, path, icon, parentId, order } = await c.req.json();
    if (!name || !path) {
      return c.json({
        code: 400,
        msg: 'Menu name and path are required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.menuItem).values({
        name,
        path,
        icon,
        parentId,
        order: order || 0,
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
        msg: 'Failed to create menu item',
        data: null
      }, 500);
    }
  });

// Helper function to build menu tree
function buildMenuTree(menuItems: any[]): any[] {
  const itemMap: Record<number, any> = {};
  const rootItems: any[] = [];

  // First pass: map all items by ID
  menuItems.forEach(item => {
    if (!itemMap[item.menuItem.id]) {
      itemMap[item.menuItem.id] = {
        ...item.menuItem,
        children: []
      };
    }
  });

  // Second pass: build tree structure
  Object.values(itemMap).forEach(item => {
    if (item.parentId && itemMap[item.parentId]) {
      itemMap[item.parentId].children.push(item);
    } else {
      rootItems.push(item);
    }
  });

  // Sort by order
  rootItems.sort((a, b) => a.order - b.order);
  Object.values(itemMap).forEach(item => {
    item.children.sort((a: { order: number; }, b: { order: number; }) => a.order - b.order);
  });

  return rootItems;
}

export const menuPermissionRouter = new Hono<{
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

    const hasAccess = await hasPermission(database, currentUser.id, 'menuPermission', 'create');
    if (!hasAccess) {
      return c.json({
        code: 403,
        msg: 'Forbidden',
        data: null
      }, 403);
    }

    const { menuItemId, permissionId } = await c.req.json();
    if (!menuItemId || !permissionId) {
      return c.json({
        code: 400,
        msg: 'Menu Item ID and Permission ID are required',
        data: null
      }, 400);
    }

    const now = new Date();

    try {
      const result = await database.insert(schema.menuPermission).values({
        menuItemId,
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
        msg: 'Failed to assign permission to menu item',
        data: null
      }, 500);
    }
  });