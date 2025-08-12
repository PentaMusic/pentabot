import { MemorySaver } from "@langchain/langgraph";
// NOTE: 프로덕션에서는 Redis/Postgres 등 영속 체크포인터로 교체 가능
export const checkpointSaver = new MemorySaver();