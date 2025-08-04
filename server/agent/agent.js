import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

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

async function evalAndCaptureOutput(code) {
  const oldLog = console.log;
  const oldError = console.error;

  const output = [];
  let errorOutput = [];

  console.log = (...args) => output.push(args.join(' '));
  console.error = (...args) => errorOutput.push(args.join(' '));

  try {
    await eval(code);
  } catch (error) {
    errorOutput.push(error.message);
  }

  console.log = oldLog;
  console.error = oldError;

  return { stdout: output.join('\n'), stderr: errorOutput.join('\n') };
}

const jsExecutor = tool(
  async ({ code }) => {
    // console.log("I should run the following code");
    // console.log('--------------');
    const result = await evalAndCaptureOutput(code);
    // console.log('---------------');
    return result;
  },
  {
    name: "run_javascript_code_tool",
    description: `
      Run general purpose javascript code. 
      This can be used to access Internet or do any computation that you need. 
      The output will be composed of the stdout and stderr. 
      The code should be written in a way that it can be executed with javascript eval in node environment.
    `,
    schema: z.object({
      code: z.string().describe("code to be executed"),
    }),
  }
);
const llm = new ChatAnthropic({
  model: "claude-3-5-sonnet-latest",
  // temperature: 0.6,
});

const checkpointSaver = new MemorySaver();

export const agent = createReactAgent({
  llm,
  tools: [weatherTool, jsExecutor],
  checkpointSaver,
  verbose: true,
});
