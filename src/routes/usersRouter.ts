import express from "express";
import { user } from "../db/schema/index.js";
import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";

const router = express.Router();

router.get('/', async (req, res) => {
   try {
    const {search, role, page = 1, limit = 10} = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPAge = Math.max(1, parseInt(String(limit), 10) || 100);

    const offset = (currentPage - 1) * limitPerPAge;

    const filterConditions: SQL[] = [];

    if (typeof search === "string" && search) {
            const searchPattern = `%${String(search).replace(/[%,]/g, '\\$&')}%`;
        filterConditions.push(
            or(
                ilike(user.name, searchPattern),
                ilike(user.email, searchPattern),
            )!
        );
    }

    if (typeof role === "string" && role) {
        filterConditions.push(eq(user.role, role as typeof user.$inferSelect.role));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(user)
    .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const usersList = await db.select({ ...getTableColumns(user) })
        .from(user)
        .where(whereClause)
        .orderBy(desc(user.createdAt))
        .limit(limitPerPAge)
        .offset(offset);

    res.status(200).json({
        data: usersList,
        pagination: {
            page: currentPage,
            limit: limitPerPAge,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitPerPAge),
        }
    });
   } catch (error) {
    res.status(500).json({ message: 'Failed to get users', error: error });
   }
});

export default router;
