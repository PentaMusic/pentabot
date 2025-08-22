import express from 'express';
import { getUserUsageStats, getUsageStatsByTool, getDailyUsageSummary, getThreadUsage, recordUsageWithCostCalculation } from "../database/usage.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// 사용자 전체 사용량 통계
router.get("/stats", requireAuth, async (req, res) => {
  const { start_date, end_date } = req.query;
  const result = await getUserUsageStats(req.user.id, start_date, end_date);
  
  if (result.success) {
    res.json({ stats: result.stats });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Tool별 사용량 통계
router.get("/tools", requireAuth, async (req, res) => {
  const { days = 30 } = req.query;
  const result = await getUsageStatsByTool(req.user.id, parseInt(days));
  
  if (result.success) {
    res.json({ stats: result.stats });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 일별 사용량 요약
router.get("/daily", requireAuth, async (req, res) => {
  const { days = 30 } = req.query;
  const result = await getDailyUsageSummary(req.user.id, parseInt(days));
  
  if (result.success) {
    res.json({ summary: result.summary });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 특정 Thread의 사용량
router.get("/threads/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const result = await getThreadUsage(threadId, req.user.id);
  
  if (result.success) {
    res.json({ usage: result.usage, summary: result.summary });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 사용량 기록
router.post("/record", requireAuth, async (req, res) => {
  const usageData = {
    userId: req.user.id,
    ...req.body
  };

  const result = await recordUsageWithCostCalculation(usageData);
  
  if (result.success) {
    res.status(201).json({ message: "Usage recorded successfully", usage: result.usage });
  } else {
    res.status(400).json({ error: result.error });
  }
});

export default router;