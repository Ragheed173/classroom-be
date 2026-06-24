import express from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [usersRes, deptsRes, subjsRes, classesRes, enrlRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(user),
      db.select({ count: sql<number>`count(*)` }).from(departments),
      db.select({ count: sql<number>`count(*)` }).from(subjects),
      db.select({ count: sql<number>`count(*)` }).from(classes),
      db.select({ count: sql<number>`count(*)` }).from(enrollments),
    ]);
    const totalUsers = usersRes[0]?.count ?? 0;
    const totalDepartments = deptsRes[0]?.count ?? 0;
    const totalSubjects = subjsRes[0]?.count ?? 0;
    const totalClasses = classesRes[0]?.count ?? 0;
    const totalEnrollments = enrlRes[0]?.count ?? 0;

    const userDistribution = await db
      .select({ role: user.role, count: sql<number>`count(*)` })
      .from(user)
      .groupBy(user.role);

    const enrollmentTrends = await db
      .select({
        month: sql<string>`to_char(${enrollments.created_at}, 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .groupBy(sql`to_char(${enrollments.created_at}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${enrollments.created_at}, 'YYYY-MM')`)
      .limit(12);

    const classesByDepartment = await db
      .select({
        department: departments.name,
        count: sql<number>`count(${classes.id})`,
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .groupBy(departments.name)
      .orderBy(desc(sql`count(${classes.id})`))
      .limit(8);

    const classesWithEnrollments = await db
      .select({
        capacity: classes.capacity,
        enrollmentCount: sql<number>`count(${enrollments.id})`,
      })
      .from(classes)
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .groupBy(classes.id, classes.capacity);

    let full = 0, almostFull = 0, available = 0;
    for (const { capacity, enrollmentCount } of classesWithEnrollments) {
      const ratio = Number(enrollmentCount) / capacity;
      if (ratio >= 1) full++;
      else if (ratio >= 0.8) almostFull++;
      else available++;
    }

    const recentEnrollments = await db
      .select({
        studentName: user.name,
        studentEmail: user.email,
        className: classes.name,
        enrolledAt: enrollments.created_at,
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .orderBy(desc(enrollments.created_at))
      .limit(10);

    res.status(200).json({
      data: {
        overview: {
          totalUsers: Number(totalUsers),
          totalDepartments: Number(totalDepartments),
          totalSubjects: Number(totalSubjects),
          totalClasses: Number(totalClasses),
          totalEnrollments: Number(totalEnrollments),
        },
        userDistribution: userDistribution.map((r) => ({ role: r.role, count: Number(r.count) })),
        enrollmentTrends: enrollmentTrends.map((r) => ({ month: r.month, count: Number(r.count) })),
        classesByDepartment: classesByDepartment.map((r) => ({ department: r.department, count: Number(r.count) })),
        capacityStatus: [
          { status: "Full", count: full },
          { status: "Almost Full", count: almostFull },
          { status: "Available", count: available },
        ],
        recentActivity: recentEnrollments,
      },
    });
  } catch (error) {
    console.error("GET /dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data", error });
  }
});

export default router;
