import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";


async function main() {
  try {
    const llm = new ChatAnthropic({
      model: "claude-3-5-sonnet-latest",
      // temperature: 0
    });

    const agent = createReactAgent({
      llm,
      tools: [],
      prompt:
        "You are a helpful assistant that can answer questions and help with tasks.",
      verbose: true,
    });

    const result = await agent.invoke({
      messages: [{ 
        role: "user", 
        content: "Hello, how can I help you?" }],
    });

    console.log(result);
    console.log(result.messages.at(-1)?.content);
  } catch (error) {
    console.error("Error running agent:", error);
  }
}

main();
