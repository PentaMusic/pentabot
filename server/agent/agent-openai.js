import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools.js";
import { checkpointSaver } from "./memory.js";

const llm = new ChatOpenAI({
    model: 'gpt-4o',
    // temperature: 0,
    // maxTokens: 1000,
});

export const agent = createReactAgent({
    llm,
    tools: tools,
    checkpointer: checkpointSaver
});