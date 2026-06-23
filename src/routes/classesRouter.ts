import express from "express";
import { db } from "../db/index.js";
import { classes } from "../db/schema/index.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const [createdClass] = await db.insert(classes).values({ ...req.body, inviteCode: Math.random().toString(36).substring(2, 8) }).returning({ id: classes.id });

    if (!createdClass) throw new Error("Failed to create class");

    res.status(201).json({ data: createdClass });

  } catch (e) {
    console.error(`Failed to create class: ${e}`);
    res.status(500).json({ error: e });
  }

});

export default router;