import express from "express";
import cors from "cors";
import subjectsRouter from "./routes/subjectsRouter";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/", (_req, res) => {
  res.send("Classroom API is running.");
});

app.use("/api/subjects", subjectsRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
