import "dotenv/config";
import express from "express";
import cors from "cors";

// 라우터 imports
import authRoutes from "./routes/auth.js";
import threadRoutes from "./routes/threads.js";
import messageRoutes from "./routes/messages.js";
import usageRoutes from "./routes/usage.js";
import generateRoutes from "./routes/generate.js";

const app = express();
const port = 3001;

// 미들웨어 설정
app.use(express.json());
app.use(cors({ origin: "*" }));

// 기본 엔드포인트
app.get("/", (req, res) => {
  res.json({ 
    message: "Pentabot API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/auth/*",
      threads: "/threads/*", 
      messages: "/messages/*",
      usage: "/usage/*",
      generate: "/generate/*"
    }
  });
});

// 라우터 등록
app.use("/auth", authRoutes);
app.use("/threads", threadRoutes);
app.use("/messages", messageRoutes);
app.use("/usage", usageRoutes);
app.use("/generate", generateRoutes);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Export the app for Genezio
export default app;

// Only start server if not in Genezio environment
if (!process.env.GENEZIO_TOKEN) {
  app.listen(port, () => {
    console.log(`🚀 Pentabot API Server running on port ${port}`);
    console.log(`📖 API Documentation available at http://localhost:${port}`);
  });
}