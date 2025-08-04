import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

const llm = new ChatAnthropic({
  model: "claude-3-5-sonnet-latest",
  temperature: 0.6
});
const weatherTool = tool(
  async (city) => {
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}`);
    // const data = await response.json();
    // return data;
    return "It's 25 degrees and sunny.";
  },
  {
    name: "weather",
    description: "Get the weather in a given location",
    parameters: z.object({
      city: z.string().describe("The query to use in your search."),
    }),
  }
);
const checkpointSaver = new MemorySaver();

export const agent = createReactAgent({
  llm,
  tools: [weatherTool],
  checkpointSaver,
  verbose: true,
});


