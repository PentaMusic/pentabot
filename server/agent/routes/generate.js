import express from 'express';
import { agent } from "../agent-anthropic.js";
import { saveMessage } from "../database/messages.js";
import { recordUsageWithCostCalculation } from "../database/usage.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// AI 응답 생성 (일반)
router.post("/", requireAuth, async (req, res) => {
  const { prompt, thread_id } = req.body;
  
  if (!prompt || !thread_id) {
    return res.status(400).json({ error: "Prompt and thread_id are required" });
  }

  const startTime = Date.now();
  let userMessage = null;
  let assistantMessage = null;

  try {
    // 1. 사용자 메시지 저장
    const userMessageResult = await saveMessage(
      thread_id, 
      req.user.id, 
      'user', 
      prompt
    );
    
    if (!userMessageResult.success) {
      throw new Error(`Failed to save user message: ${userMessageResult.error}`);
    }
    userMessage = userMessageResult.message;

    // 2. AI 응답 생성
    const result = await agent.invoke(
      { messages: [{ role: "user", content: prompt }] },
      { configurable: { thread_id } }
    );
    
    const assistantContent = result.messages.at(-1)?.content || '';
    const executionTime = Date.now() - startTime;

    // 3. AI 응답 저장
    const assistantMessageResult = await saveMessage(
      thread_id,
      req.user.id,
      'assistant',
      assistantContent
    );

    if (!assistantMessageResult.success) {
      throw new Error(`Failed to save assistant message: ${assistantMessageResult.error}`);
    }
    assistantMessage = assistantMessageResult.message;

    // 4. 사용량 기록 (대략적인 토큰 수 계산)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(assistantContent.length / 4);

    await recordUsageWithCostCalculation({
      userId: req.user.id,
      threadId: thread_id,
      messageId: assistantMessage.id,
      toolType: 'claude_chat',
      toolName: 'claude-3.5-sonnet',
      inputTokens,
      outputTokens,
      executionTimeMs: executionTime,
      requestData: { prompt, thread_id },
      responseData: { content: assistantContent },
      status: 'success'
    });

    res.json({
      content: assistantContent,
      userMessage,
      assistantMessage,
      metadata: {
        executionTime,
        estimatedTokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        }
      }
    });

  } catch (error) {
    console.error('Generate error:', error);
    
    // 오류 사용량 기록
    if (req.user.id && thread_id) {
      await recordUsageWithCostCalculation({
        userId: req.user.id,
        threadId: thread_id,
        messageId: userMessage?.id || null,
        toolType: 'claude_chat',
        toolName: 'claude-3.5-sonnet',
        inputTokens: Math.ceil((prompt || '').length / 4),
        outputTokens: 0,
        executionTimeMs: Date.now() - startTime,
        requestData: { prompt, thread_id },
        responseData: { error: error.message },
        status: 'error',
        errorMessage: error.message
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// AI 응답 생성 (스트리밍)
router.post("/stream", requireAuth, async (req, res) => {
  console.log('POST /generate/stream request:', {
    body: req.body,
    user: req.user?.id,
    headers: req.headers.authorization ? 'Bearer present' : 'No auth header'
  });
  
  const { prompt, thread_id } = req.body;
  
  if (!prompt || !thread_id) {
    return res.status(400).json({ error: "Prompt and thread_id are required" });
  }
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const startTime = Date.now();
  let userMessage = null;
  let assistantMessage = null;

  try {
    // 1. 사용자 메시지 저장
    const userMessageResult = await saveMessage(
      thread_id, 
      req.user.id, 
      'user', 
      prompt
    );
    
    if (!userMessageResult.success) {
      throw new Error(`Failed to save user message: ${userMessageResult.error}`);
    }
    userMessage = userMessageResult.message;

    // 2. AI 응답 생성
    const result = await agent.invoke(
      { messages: [{ role: "user", content: prompt }] },
      { configurable: { thread_id } }
    );
    
    const fullContent = result.messages.at(-1)?.content || '';
    const executionTime = Date.now() - startTime;

    // 3. AI 응답 저장
    const assistantMessageResult = await saveMessage(
      thread_id,
      req.user.id,
      'assistant',
      fullContent
    );

    if (!assistantMessageResult.success) {
      throw new Error(`Failed to save assistant message: ${assistantMessageResult.error}`);
    }
    assistantMessage = assistantMessageResult.message;
    
    // 4. Stream the content
    const words = fullContent.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const partialContent = words.slice(0, i + 1).join(' ');
      res.write(`data: ${JSON.stringify({ content: partialContent })}\n\n`);
      
      // Add a small delay between words for streaming effect
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 5. 사용량 기록
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(fullContent.length / 4);

    await recordUsageWithCostCalculation({
      userId: req.user.id,
      threadId: thread_id,
      messageId: assistantMessage.id,
      toolType: 'claude_chat',
      toolName: 'claude-3.5-sonnet',
      inputTokens,
      outputTokens,
      executionTimeMs: executionTime,
      requestData: { prompt, thread_id },
      responseData: { content: fullContent },
      status: 'success'
    });
    
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    
    // 오류 사용량 기록
    if (req.user.id && thread_id) {
      await recordUsageWithCostCalculation({
        userId: req.user.id,
        threadId: thread_id,
        messageId: userMessage?.id || null,
        toolType: 'claude_chat',
        toolName: 'claude-3.5-sonnet',
        inputTokens: Math.ceil((prompt || '').length / 4),
        outputTokens: 0,
        executionTimeMs: Date.now() - startTime,
        requestData: { prompt, thread_id },
        responseData: { error: error.message },
        status: 'error',
        errorMessage: error.message
      });
    }

    res.status(500).write('Error occurred during streaming');
    res.end();
  }
});

export default router;