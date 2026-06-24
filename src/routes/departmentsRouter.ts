import express from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { departments, subjects } from "../db/schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    const conditions = [];
    if (typeof search === "string" && search) {
      const pat = `%${search.replace(/[%_]/g, "\\$&")}%`;
      conditions.push(ilike(departments.name, pat));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(departments)
      .where(whereClause);
    const total = totalResult[0]?.total ?? 0;

    const list = await db
      .select()
      .from(departments)
      .where(whereClause)
      .orderBy(desc(departments.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: list,
      pagination: { page: currentPage, limit: limitPerPage, total: Number(total), totalPages: Math.ceil(Number(total) / limitPerPage) },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get departments", error });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const [created] = await db.insert(departments).values({ name, code, description }).returning();
    res.status(201).json({ data: created });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("unique")) return res.status(409).json({ message: "Department code already exists" });
    res.status(500).json({ message: "Failed to create department", error });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    if (!dept) return res.status(404).json({ error: "Department not found" });

    const subjectsResult = await db
      .select({ subjectsCount: sql<number>`count(*)` })
      .from(subjects)
      .where(eq(subjects.departmentId, id));
    const subjectsCount = subjectsResult[0]?.subjectsCount ?? 0;

    res.status(200).json({ data: { ...dept, subjectsCount: Number(subjectsCount) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to get department", error });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, code, description } = req.body;
    const [updated] = await db
      .update(departments)
      .set({ name, code, description })
      .where(eq(departments.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Department not found" });
    res.status(200).json({ data: updated });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("unique")) return res.status(409).json({ message: "Department code already exists" });
    res.status(500).json({ message: "Failed to update department", error });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(eq(subjects.departmentId, id));
    const count = countResult[0]?.count ?? 0;

    if (Number(count) > 0) {
      return res.status(409).json({ message: `Cannot delete department with ${count} existing subject(s). Remove subjects first.` });
    }

    const [deleted] = await db.delete(departments).where(eq(departments.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Department not found" });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete department", error });
  }
});

export default router;
