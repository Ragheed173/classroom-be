import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    const conditions: SQL[] = [];
    if (typeof search === "string" && search) {
      const pat = `%${search.replace(/[%_]/g, "\\$&")}%`;
      conditions.push(or(ilike(user.name, pat), ilike(user.email, pat))!);
    }
    if (typeof role === "string" && role) {
      conditions.push(eq(user.role, role as typeof user.$inferSelect.role));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRes = await db.select({ total: sql<number>`count(*)` }).from(user).where(whereClause);
    const total = totalRes[0]?.total ?? 0;

    const list = await db
      .select({ ...getTableColumns(user) })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: list,
      pagination: { page: currentPage, limit: limitPerPage, total: Number(total), totalPages: Math.ceil(Number(total) / limitPerPage) },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get users", error });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [userData] = await db.select({ ...getTableColumns(user) }).from(user).where(eq(user.id, id));
    if (!userData) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ data: userData });
  } catch (error) {
    res.status(500).json({ message: "Failed to get user", error });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    const [updated] = await db
      .update(user)
      .set({ ...(name && { name }), ...(role && { role }) })
      .where(eq(user.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ data: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(user).where(eq(user.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error });
  }
});

export default router;
