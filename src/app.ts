import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import authRouter from "./routers/authRouter.js";
import postRouter from "./routers/postRouter.js";
import profileRouter from "./routers/profileRouter.js";
import userRouter from "./routers/userRouter.js";
import notificationRouter from "./routers/notificationRouter.js";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("API is running...");
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/profile", profileRouter);
app.use("/api/user", userRouter);
app.use("/api/notifications", notificationRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Endpoint not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
