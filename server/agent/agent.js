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

export const agent = createReactAgent({
    llm,
    tools: tools,
    checkpointSaver,
    verbose: true,
});


