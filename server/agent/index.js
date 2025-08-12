import "dotenv/config";
import express from "express";
import cors from "cors";
import { agent } from "./agent-anthropic.js";
const app = express();
const port = 3001;

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/generate", async (req, res) => {
  const { prompt, thread_id } = req.body;
  const result = await agent.invoke(
    { messages: [{ role: "user", content: prompt }] },
    { configurable: { thread_id } }
  );
  res.json(result.messages.at(-1)?.content);
});

app.post("/generate-stream", async (req, res) => {
  const { prompt, thread_id } = req.body;
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get the full response first
    const result = await agent.invoke(
      { messages: [{ role: "user", content: prompt }] },
      { configurable: { thread_id } }
    );
    
    const fullContent = result.messages.at(-1)?.content || '';
    
    // Stream the content character by character
    const words = fullContent.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const partialContent = words.slice(0, i + 1).join(' ');
      res.write(`data: ${JSON.stringify({ content: partialContent })}\n\n`);
      
      // Add a small delay between words for streaming effect
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).write('Error occurred during streaming');
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
