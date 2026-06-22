import express from "express";
import cors from "cors";
import subjectsRouter from "./routes/subjectsRouter";
import classesRouter from "./routes/classesRouter";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined");
}

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/", (req, res) => {
  res.send("Classroom API is running.");
});

app.use("/api/subjects", subjectsRouter);
app.use("/api/classes", classesRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
