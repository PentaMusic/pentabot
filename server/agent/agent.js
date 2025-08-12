import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { checkpointSaver } from './memory.js';

const weatherTool = tool(
    async (city) => {
        console.log("I should get the weather for", city);
        console.log(city);
        const WEATHER_KEY = 'adca3d2cfec04ad191155040250608';
        const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${city}&aqi=yes&lang=ko`
        );
        const data = await response.json();
        // console.log("Weather data:", data);
        return data;
    },
    {
        name: 'weather',
        description: 'Get the weather in a given city location',
        parameters: z.object({
            city: z.string().describe('The query to use in your search.'),
        }),
    }
);

const jsExecutor = tool(
    async ({ code }) => {
        // console.log("I should run the following code");
        // console.log('--------------');
        const response = await fetch(process.env.EXECUTOR_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        // console.log('---------------');
        return response.json();
    },
    {
        name: 'run_javascript_code_tool',
        description: `
      Run general purpose javascript code. 
      This can be used to access Internet or do any computation that you need. 
      The output will be composed of the stdout and stderr. 
      The code should be written in a way that it can be executed with javascript eval in node environment.
    `,
        schema: z.object({
            code: z.string().describe('code to be executed'),
        }),
    }
);
const llm = new ChatAnthropic({
    model: 'claude-3-5-sonnet-latest',
});

export const agent = createReactAgent({
    llm,
    tools: [weatherTool, jsExecutor],
    checkpointSaver,
    verbose: true,
});
