import express from 'express';
import { createThread, getUserThreads, getThread, updateThreadTitle, deleteThread } from "../database/threads.js";
import { getThreadMessages } from "../database/messages.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// 새 Thread 생성
router.post("/", requireAuth, async (req, res) => {
  console.log('POST /threads request:', {
    body: req.body,
    user: req.user?.id,
    headers: req.headers.authorization ? 'Bearer present' : 'No auth header'
  });
  
  const { title } = req.body;
  const result = await createThread(req.user.id, title);
  
  if (result.success) {
    res.status(201).json({ message: "Thread created successfully", thread: result.thread });
  } else {
    console.error('Thread creation failed:', result.error);
    res.status(400).json({ error: result.error });
  }
});

// Thread 목록 조회
router.get("/", requireAuth, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const result = await getUserThreads(req.user.id, parseInt(limit), parseInt(offset));
  
  if (result.success) {
    res.json({ threads: result.threads });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Thread의 메시지 목록 조회
router.get("/:threadId/messages", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const result = await getThreadMessages(threadId, req.user.id, parseInt(limit), parseInt(offset));
  
  if (result.success) {
    res.json({ messages: result.messages });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 특정 Thread 조회
router.get("/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const result = await getThread(threadId, req.user.id);
  
  if (result.success) {
    res.json({ thread: result.thread });
  } else {
    res.status(404).json({ error: result.error });
  }
});


// Thread 제목 업데이트 (PATCH - 부분 업데이트)
router.patch("/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const { title } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  console.log('PATCH /threads/:threadId request:', {
    threadId,
    title,
    userId: req.user.id
  });

  const result = await updateThreadTitle(threadId, req.user.id, title);
  
  if (result.success) {
    console.log('Thread title updated successfully:', result.thread);
    res.json({ message: "Thread updated successfully", thread: result.thread });
  } else {
    console.error('Failed to update thread title:', result.error);
    res.status(400).json({ error: result.error });
  }
});

// Thread 삭제
router.delete("/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const result = await deleteThread(threadId, req.user.id);
  
  if (result.success) {
    res.json({ message: "Thread deleted successfully" });
  } else {
    res.status(400).json({ error: result.error });
  }
});

export default router;