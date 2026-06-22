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
    res.status(500).json({ message: "Failed to get classes", error });
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

    const [createdClass] = await db
      .insert(classes)
      .values({
        name,
        description,
        subjectId: Number(subjectId),
        teacherId: String(teacherId),
        capacity: Number(capacity),
        status,
        bannerUrl,
        bannerCldPubId,
        inviteCode: inviteCode ?? null,
        schedules: schedules ?? null,
      })
      .returning();

    res.status(201).json(createdClass);
  } catch (error) {
    res.status(500).json({ message: "Failed to create class", error });
  }
});

export default router;
