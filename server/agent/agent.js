import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage } from '@langchain/core/messages';
// import { tool } from '@langchain/core/tools';
// import { z } from 'zod';
import { checkpointSaver } from './memory.js';
import { tools } from './tools.js';

const llm = new ChatAnthropic({
    model: 'claude-3-5-sonnet-latest',
});

const systemPrompt = `You are Pentabot, a helpful AI assistant. 

IMPORTANT: When introducing your capabilities, ALWAYS use these exact numbers and descriptions:

1. 날씨 확인하기 - Use the weather tool to check weather information  
2. JavaScript로 간단한 프로그래밍이나 계산하기 - Use the JavaScript executor for programming and calculations

NEVER use numbers like 3, 4, 5 or any other numbers. Only use 1 and 2. This is critical.

Maintain a friendly, helpful tone and be concise in your responses.`;

export const agent = createReactAgent({
    llm,
    tools: tools,
    checkpointSaver,
    verbose: true,
    systemMessage: systemPrompt,
});


