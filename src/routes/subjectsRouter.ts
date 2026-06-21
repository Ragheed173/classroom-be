import express from "express";
import { departments, subjects } from "../db/schema";
import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db";

const router = express.Router();

router.get('/', async (req, res) => {
   try {
    const {search, department, page = 1, limit = 10} = req.query;
    const currentPage = Math.max(1, Number(page));
    const limitPerPAge = Math.max(1, Number(limit));
    const offset = (currentPage - 1) * limitPerPAge;

    const filterConditions: SQL[] = [];

    if (typeof search === "string" && search) {
        filterConditions.push(
            or(
                ilike(subjects.name, `%${search}%`),
                ilike(subjects.code, `%${search}%`),
            )!
        );
    }

    if (typeof department === "string" && department) {
        filterConditions.push(ilike(departments.name, `%${department}%`));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const subjectsList = await db.select({ ...getTableColumns(subjects),
        department: { ...getTableColumns(departments)} })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause)
        .orderBy(desc(subjects.created_at))
        .limit(limitPerPAge)
        .offset(offset);

    res.status(200).json({
        data: subjectsList,
        pagination: {
            page: currentPage,
            limit: limitPerPAge,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitPerPAge),
        }
    });
   } catch (error) {
    res.status(500).json({ message: 'Failed to get subjects', error: error });
   }
});

export default router;