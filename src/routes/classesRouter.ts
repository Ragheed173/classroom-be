import express from "express";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";

import { db } from "../db";
import { classes, subjects } from "../db/schema";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 100);
    const offset = (currentPage - 1) * limitPerPage;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .orderBy(desc(classes.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("Failed to get classes", error);
    return res.status(500).json({ message: "Failed to get classes" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      subjectId,
      teacherId,
      capacity,
      status,
      bannerUrl,
      bannerCldPubId,
      inviteCode,
      schedules,
    } = req.body;

    if (
      !name ||
      !description ||
      !subjectId ||
      !teacherId ||
      !capacity ||
      !status ||
      !bannerUrl ||
      !bannerCldPubId
    ) {
      return res.status(400).json({ message: "Missing required class fields" });
    }

    const parsedSubjectId = Number(subjectId);
    const parsedCapacity = Number(capacity);
    const parsedTeacherId = String(teacherId).trim();

    if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
      return res.status(400).json({ message: "subjectId must be a positive integer" });
    }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({ message: "capacity must be a positive integer" });
    }
    if (!parsedTeacherId) {
      return res.status(400).json({ message: "teacherId is required" });
    }
    if (schedules != null && !Array.isArray(schedules)) {      return res.status(400).json({ message: "schedules must be an array when provided" });
   }

    const [createdClass] = await db
      .insert(classes)
      .values({
        name,
        description,
        subjectId: parsedSubjectId,
        teacherId: parsedTeacherId,
        capacity: parsedCapacity,
        status,
        bannerUrl,
        bannerCldPubId,
        inviteCode: inviteCode ?? null,
        schedules: schedules ?? null,
      })
      .returning();

    res.status(201).json(createdClass);
  } catch (error) {
    console.error("Failed to create class", error);
    return res.status(500).json({ message: "Failed to create class" });
  }
});

export default router;
