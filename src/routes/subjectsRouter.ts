import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { classes, departments, subjects } from "../db/schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    const conditions: SQL[] = [];
    if (typeof search === "string" && search) {
      const pat = `%${search.replace(/[%_]/g, "\\$&")}%`;
      conditions.push(or(ilike(subjects.name, pat), ilike(subjects.code, pat))!);
    }
    if (typeof department === "string" && department) {
      const pat = `%${department.replace(/[%_]/g, "\\$&")}%`;
      conditions.push(ilike(departments.name, pat));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRes = await db
      .select({ total: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);
    const total = totalRes[0]?.total ?? 0;

    const list = await db
      .select({ ...getTableColumns(subjects), department: { ...getTableColumns(departments) } })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: list,
      pagination: { page: currentPage, limit: limitPerPage, total: Number(total), totalPages: Math.ceil(Number(total) / limitPerPage) },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get subjects", error });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, code, description, departmentId } = req.body;
    const [created] = await db.insert(subjects).values({ name, code, description, departmentId: Number(departmentId) }).returning();
    res.status(201).json({ data: created });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("unique")) return res.status(409).json({ message: "Subject code already exists" });
    if (msg.includes("foreign")) return res.status(400).json({ message: "Department not found" });
    res.status(500).json({ message: "Failed to create subject", error });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [subject] = await db
      .select({ ...getTableColumns(subjects), department: { ...getTableColumns(departments) } })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.id, id));

    if (!subject) return res.status(404).json({ error: "Subject not found" });

    const classesRes = await db
      .select({ classesCount: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.subjectId, id));
    const classesCount = classesRes[0]?.classesCount ?? 0;

    res.status(200).json({ data: { ...subject, classesCount: Number(classesCount) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to get subject", error });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, code, description, departmentId } = req.body;
    const [updated] = await db
      .update(subjects)
      .set({ name, code, description, departmentId: Number(departmentId) })
      .where(eq(subjects.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json({ data: updated });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("unique")) return res.status(409).json({ message: "Subject code already exists" });
    res.status(500).json({ message: "Failed to update subject", error });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.subjectId, id));
    const count = countRes[0]?.count ?? 0;

    if (Number(count) > 0) {
      return res.status(409).json({ message: `Cannot delete subject with ${count} existing class(es). Remove classes first.` });
    }

    const [deleted] = await db.delete(subjects).where(eq(subjects.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete subject", error });
  }
});

export default router;
