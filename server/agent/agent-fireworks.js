import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { tools } from "./tools.js";
import { checkpointSaver } from "./memory.js";

const llm = new ChatFireworks({
  model: "accounts/fireworks/models/gpt-oss-20b",
  temperature: 0,
  maxTokens: 1000,
});

export const agent = createReactAgent({
  llm,
  tools: tools,
  checkpointer: checkpointSaver,
});
