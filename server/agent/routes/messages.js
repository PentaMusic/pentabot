import express from 'express';
import { saveMessage, getThreadMessages, getMessage, updateMessage, deleteMessage, searchMessages } from "../database/messages.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// 메시지 검색 (특정 경로가 먼저 와야 함)
router.get("/search", requireAuth, async (req, res) => {
  const { q: query, limit = 20 } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const result = await searchMessages(req.user.id, query, parseInt(limit));
  
  if (result.success) {
    res.json({ messages: result.messages });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Thread의 메시지 목록 조회
router.get("/threads/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const result = await getThreadMessages(threadId, req.user.id, parseInt(limit), parseInt(offset));
  
  if (result.success) {
    res.json({ messages: result.messages });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Thread에 새 메시지 저장
router.post("/threads/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const { role, content, metadata = {} } = req.body;
  
  if (!role || !content) {
    return res.status(400).json({ error: "Role and content are required" });
  }

  if (!['user', 'assistant', 'system'].includes(role)) {
    return res.status(400).json({ error: "Role must be user, assistant, or system" });
  }

  const result = await saveMessage(threadId, req.user.id, role, content, metadata);
  
  if (result.success) {
    res.status(201).json({ message: "Message saved successfully", data: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// 특정 메시지 조회
router.get("/:messageId", requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const result = await getMessage(messageId, req.user.id);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(404).json({ error: result.error });
  }
});

// 메시지 업데이트
router.put("/:messageId", requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const { content, metadata } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const result = await updateMessage(messageId, req.user.id, content, metadata);
  
  if (result.success) {
    res.json({ message: "Message updated successfully", data: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// 메시지 삭제
router.delete("/:messageId", requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const result = await deleteMessage(messageId, req.user.id);
  
  if (result.success) {
    res.json({ message: "Message deleted successfully" });
  } else {
    res.status(400).json({ error: result.error });
  }
});

export default router;