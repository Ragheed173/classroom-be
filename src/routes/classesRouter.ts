import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, subject, teacher, status, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const conditions = [];
    if (search) conditions.push(or(ilike(classes.name, `%${search}%`), ilike(classes.inviteCode, `%${search}%`)));
    if (subject) conditions.push(ilike(subjects.name, `%${subject}%`));
    if (teacher) conditions.push(ilike(user.name, `%${teacher}%`));
    if (typeof status === "string" && status) conditions.push(eq(classes.status, status as "active" | "inactive" | "archived"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRes = await db
      .select({ total: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause);
    const total = totalRes[0]?.total ?? 0;

    const list = await db
      .select({ ...getTableColumns(classes), subject: { ...getTableColumns(subjects) }, teacher: { ...getTableColumns(user) } })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(classes.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: list,
      pagination: { page: currentPage, limit: limitPerPage, total: Number(total), totalPages: Math.ceil(Number(total) / limitPerPage) },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId } = req.body;
    const [created] = await db
      .insert(classes)
      .values({
        subjectId: Number(subjectId),
        inviteCode: Math.random().toString(36).substring(2, 9).toUpperCase(),
        name, teacherId, bannerCldPubId, bannerUrl, capacity: Number(capacity), description, schedules: [], status,
      })
      .returning({ id: classes.id });

    if (!created) throw new Error("Insert failed");
    res.status(201).json({ data: created });
  } catch (error) {
    res.status(500).json({ error: "Failed to create class" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });

    const [details] = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        department: { ...getTableColumns(departments) },
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(classes.id, classId));

    if (!details) return res.status(404).json({ error: "Class not found" });

    const enrollRes = await db
      .select({ enrollmentCount: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.classId, classId));
    const enrollmentCount = enrollRes[0]?.enrollmentCount ?? 0;

    res.status(200).json({ data: { ...details, enrollmentCount: Number(enrollmentCount) } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch class details" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });

    const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId, schedules } = req.body;
    const [updated] = await db
      .update(classes)
      .set({
        name, teacherId,
        ...(subjectId !== undefined && { subjectId: Number(subjectId) }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        description, status, bannerUrl, bannerCldPubId,
        ...(schedules !== undefined && { schedules }),
      })
      .where(eq(classes.id, classId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Class not found" });
    res.status(200).json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update class" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });

    const [deleted] = await db.delete(classes).where(eq(classes.id, classId)).returning();
    if (!deleted) return res.status(404).json({ error: "Class not found" });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete class" });
  }
});

router.get("/:id/users", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });
    if (role !== "teacher" && role !== "student") return res.status(400).json({ error: "Invalid role" });

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified,
      image: user.image, role: user.role, imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    };
    const groupByFields = [
      user.id, user.name, user.email, user.emailVerified, user.image,
      user.role, user.imageCldPubId, user.createdAt, user.updatedAt,
    ];

    const totalRes = role === "teacher"
      ? await db.select({ total: sql<number>`count(distinct ${user.id})` }).from(user).leftJoin(classes, eq(user.id, classes.teacherId)).where(and(eq(user.role, role), eq(classes.id, classId)))
      : await db.select({ total: sql<number>`count(distinct ${user.id})` }).from(user).leftJoin(enrollments, eq(user.id, enrollments.studentId)).where(and(eq(user.role, role), eq(enrollments.classId, classId)));
    const total = totalRes[0]?.total ?? 0;

    const list = role === "teacher"
      ? await db.select(baseSelect).from(user).leftJoin(classes, eq(user.id, classes.teacherId)).where(and(eq(user.role, role), eq(classes.id, classId))).groupBy(...groupByFields).orderBy(desc(user.createdAt)).limit(limitPerPage).offset(offset)
      : await db.select(baseSelect).from(user).leftJoin(enrollments, eq(user.id, enrollments.studentId)).where(and(eq(user.role, role), eq(enrollments.classId, classId))).groupBy(...groupByFields).orderBy(desc(user.createdAt)).limit(limitPerPage).offset(offset);

    res.status(200).json({
      data: list,
      pagination: { page: currentPage, limit: limitPerPage, total: Number(total), totalPages: Math.ceil(Number(total) / limitPerPage) },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch class users" });
  }
});

router.post("/:id/enrollments", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });

    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "Student ID is required" });

    const [classInfo] = await db.select({ capacity: classes.capacity }).from(classes).where(eq(classes.id, classId));
    if (!classInfo) return res.status(404).json({ error: "Class not found" });

    const countRes = await db.select({ count: sql<number>`count(*)` }).from(enrollments).where(eq(enrollments.classId, classId));
    const count = countRes[0]?.count ?? 0;
    if (Number(count) >= classInfo.capacity) {
      return res.status(409).json({ message: "Class is at full capacity" });
    }

    const [created] = await db.insert(enrollments).values({ classId, studentId }).returning();
    res.status(201).json({ data: created });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return res.status(409).json({ message: "Student is already enrolled in this class" });
    }
    res.status(500).json({ message: "Failed to enroll student", error });
  }
});

router.delete("/:id/enrollments/:studentId", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { studentId } = req.params;
    if (!Number.isFinite(classId)) return res.status(400).json({ error: "Invalid class id" });

    const [deleted] = await db
      .delete(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Enrollment not found" });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Failed to unenroll student", error });
  }
});

export default router;
