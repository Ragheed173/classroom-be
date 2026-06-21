import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { departments } from "./db/schema";

async function main() {
  try {
    console.log("Performing CRUD operations...");

    const [newDepartment] = await db
      .insert(departments)
      .values({ name: "Computer Science", code: "CS" })
      .returning();

    if (!newDepartment) {
        throw new Error("Failed to create department");
    }

    console.log("✅ CREATE: New department created:", newDepartment);

    const [updatedDepartment] = await db
      .update(departments)
      .set({ name: "Computer Science" })
      .where(eq(departments.id, newDepartment.id))
      .returning();

    if (!updatedDepartment) {
      throw new Error("Failed to update department");
    }

    console.log("✅ UPDATE: Department updated:", updatedDepartment);

    await db.delete(departments).where(eq(departments.id, newDepartment.id));
    console.log("✅ DELETE: Department deleted.");

    console.log("\nCRUD operations completed successfully.");
  } catch (error) {
    console.error("❌ Error performing CRUD operations:", error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log("Database pool closed.");
  }
}

main();
