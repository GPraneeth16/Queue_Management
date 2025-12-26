import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import { startQueueMonitor } from "./services/queueMonitor.js";

// App config
const app = express();
const port = process.env.PORT || 4000;

// Connect services
connectDB();
connectCloudinary();

// Start queue monitoring safely
try {
  startQueueMonitor();
  console.log("✅ Queue monitor started");
} catch (err) {
  console.error("❌ Queue monitor failed:", err.message);
}

// CORS configuration (FINAL & SAFE)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",

  // Vercel Frontends
  "https://queue-management-git-main-praneeths-projects-6377d51e.vercel.app",
  "https://queue-management-seven.vercel.app",
  "https://queue-management-a8lv4m9bv-praneeths-projects-6377d51e.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// Routes
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);

// Health check
app.get("/", (req, res) => {
  res.send("✅ MediQueue Backend Running");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server started on PORT: ${port}`);
});
