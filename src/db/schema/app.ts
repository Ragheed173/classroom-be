import { relations, sql } from "drizzle-orm";
import {
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "archived"]);

const timestamps = {
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}

export const departments = pgTable("departments", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar("name",{ length: 255 }).notNull(),
    description: varchar("description", { length: 255 }),
    ...timestamps,
});

export const subjects = pgTable("subjects", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    departmentId: integer('departmentId').notNull().references(() => departments.id, { onDelete: 'restrict' }),
    name: varchar("name",{ length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    description: varchar("description", { length: 255 }),
    ...timestamps,
});

export const classes = pgTable("classes", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: text("teacherId").notNull().references(() => user.id, { onDelete: "restrict" }),
    inviteCode: varchar("inviteCode", { length: 50 }).unique(),
    name: varchar("name", { length: 255 }).notNull(),
    bannerCldPubId: text("bannerCldPubId"),
    bannerUrl: text("bannerUrl"),
    description: text("description"),
    capacity: integer("capacity").default(50).notNull(),
    status: classStatusEnum("status").default("active").notNull(),
    schedules: jsonb("schedules").$type<
        { day: string; startTime: string; endTime: string }[]
    >(),
    ...timestamps,
}, (table) => [
    index("classes_subjectId_idx").on(table.subjectId),
    index("classes_teacherId_idx").on(table.teacherId),
]);

export const enrollments = pgTable("enrollments", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: text("studentId").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: integer("classId").notNull().references(() => classes.id, { onDelete: "cascade" }),
    ...timestamps,
}, (table) => [
    uniqueIndex("enrollments_studentId_classId_idx").on(table.studentId, table.classId),
    index("enrollments_studentId_idx").on(table.studentId),
    index("enrollments_classId_idx").on(table.classId),
]);

const departmentsRelations = relations(departments, ({ many }) => ({
    subjects: many(subjects),
}));

const subjectsRelations = relations(subjects, ({ one, many }) => ({
    department: one(departments, {
        fields: [subjects.departmentId],
        references: [departments.id],
    }),
    classes: many(classes),
}));

const classesRelations = relations(classes, ({ one, many }) => ({
    subject: one(subjects, {
        fields: [classes.subjectId],
        references: [subjects.id],
    }),
    teacher: one(user, {
        fields: [classes.teacherId],
        references: [user.id],
    }),
    enrollments: many(enrollments),
}));

const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    student: one(user, {
        fields: [enrollments.studentId],
        references: [user.id],
    }),
    class: one(classes, {
        fields: [enrollments.classId],
        references: [classes.id],
    }),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export { departmentsRelations, subjectsRelations, classesRelations, enrollmentsRelations };
