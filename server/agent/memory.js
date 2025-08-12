import { PostgreSQLCheckpointSaver } from "./database/checkpointer.js";
// PostgreSQL 기반 고정방식 checkpoint saver 사용
export const checkpointSaver = new PostgreSQLCheckpointSaver();