import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tools } from "./tools.js";
import { checkpointSaver } from "./memory.js";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 1.0,
  // Workaround for LangChain bug with Claude 4.5 models - explicitly set top_p to undefined
  invocationKwargs: {
    top_p: undefined,
  },
});

export const agent = createReactAgent({
  llm,
  tools: tools,
  checkpointer: checkpointSaver,
});
