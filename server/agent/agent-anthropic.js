import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tools } from "./tools.js";
import { checkpointSaver } from "./memory.js";

const llm = new ChatAnthropic({
  model: "claude-3-5-sonnet-latest",
  temperature: 0,
});

export const agent = createReactAgent({
  llm,
  tools: tools,
  checkpointer: checkpointSaver,
});
