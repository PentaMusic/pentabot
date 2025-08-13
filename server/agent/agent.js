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
        // Get executor URL with dynamic Genezio port detection
        let executorUrl = process.env.EXECUTOR_URL || process.env.GENEZIO_EXECUTOR_URL;
        
        // For Genezio local development, try multiple methods to find executor
        if (!executorUrl || executorUrl === 'http://localhost:3000') {
            // Method 1: Check if we have the Genezio executor port
            if (process.env.GENEZIO_EXECUTOR_PORT) {
                executorUrl = `http://localhost:${process.env.GENEZIO_EXECUTOR_PORT}`;
            }
            // Method 2: Try the current known Genezio port (from latest logs)
            else {
                executorUrl = 'http://localhost:57831'; // Current Genezio executor port
            }
        }
        
        console.log("Executing JavaScript code with executor URL:", executorUrl);
        console.log("Code to execute:", code);
        
        try {
            const response = await fetch(executorUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            
            if (!response.ok) {
                throw new Error(`Executor service responded with status: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log("Execution result:", result);
            return result;
        } catch (error) {
            console.error("JavaScript executor error:", error);
            return {
                error: `Failed to execute JavaScript code: ${error.message}`,
                stdout: "",
                stderr: error.message
            };
        }
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
