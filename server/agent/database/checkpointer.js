import { BaseCheckpointSaver } from "@langchain/langgraph";
import supabase from './supabase.js';

export class PostgreSQLCheckpointSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    generateCheckpointId() {
        // Generate a simple checkpoint ID - you might want to use uuid here
        return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async getTuple(config) {
        const { thread_id, checkpoint_id } = config.configurable || {};
        
        if (!thread_id) {
            return undefined;
        }

        try {
            let query = supabase
                .from('checkpoints')
                .select('*')
                .eq('thread_id', thread_id)
                .order('created_at', { ascending: false });

            if (checkpoint_id) {
                query = query.eq('checkpoint_id', checkpoint_id);
            } else {
                query = query.limit(1);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (!data || data.length === 0) return undefined;

            const checkpoint = data[0];
            
            // Get pending writes for this checkpoint
            const { data: writes, error: writesError } = await supabase
                .from('checkpoint_writes')
                .select('*')
                .eq('thread_id', thread_id)
                .eq('checkpoint_id', checkpoint.checkpoint_id);

            if (writesError) throw writesError;

            const pendingWrites = writes.map(write => ({
                channel: write.channel,
                value: write.value
            }));

            return {
                config: { configurable: { thread_id, checkpoint_id: checkpoint.checkpoint_id } },
                checkpoint: checkpoint.checkpoint_data,
                metadata: checkpoint.metadata || {},
                parentConfig: checkpoint.parent_checkpoint_id 
                    ? { configurable: { thread_id, checkpoint_id: checkpoint.parent_checkpoint_id } }
                    : undefined,
                pendingWrites
            };
        } catch (error) {
            console.error('Error getting checkpoint:', error);
            return undefined;
        }
    }

    async *list(config, options = {}) {
        const { thread_id } = config.configurable || {};
        const { limit = 10, before } = options;

        if (!thread_id) {
            return;
        }

        try {
            let query = supabase
                .from('checkpoints')
                .select('*')
                .eq('thread_id', thread_id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (before) {
                query = query.lt('created_at', before);
            }

            const { data, error } = await query;

            if (error) throw error;

            for (const checkpoint of data || []) {
                // Get pending writes for each checkpoint
                const { data: writes } = await supabase
                    .from('checkpoint_writes')
                    .select('*')
                    .eq('thread_id', thread_id)
                    .eq('checkpoint_id', checkpoint.checkpoint_id);

                const pendingWrites = (writes || []).map(write => ({
                    channel: write.channel,
                    value: write.value
                }));

                yield {
                    config: { configurable: { thread_id, checkpoint_id: checkpoint.checkpoint_id } },
                    checkpoint: checkpoint.checkpoint_data,
                    metadata: checkpoint.metadata || {},
                    parentConfig: checkpoint.parent_checkpoint_id 
                        ? { configurable: { thread_id, checkpoint_id: checkpoint.parent_checkpoint_id } }
                        : undefined,
                    pendingWrites
                };
            }
        } catch (error) {
            console.error('Error listing checkpoints:', error);
        }
    }

    async put(config, checkpoint, metadata, newVersions) {
        const { thread_id, checkpoint_id } = config.configurable || {};
        
        if (!thread_id) {
            throw new Error('thread_id is required');
        }
        
        // checkpoint_id가 없으면 checkpoint.id를 사용하거나 새로 생성
        const actualCheckpointId = checkpoint_id || checkpoint.id || this.generateCheckpointId();

        try {
            // Start a transaction-like operation
            // First, insert the main checkpoint
            const { error: checkpointError } = await supabase
                .from('checkpoints')
                .upsert({
                    thread_id,
                    checkpoint_id: actualCheckpointId,
                    parent_checkpoint_id: config.parentConfig?.configurable?.checkpoint_id,
                    checkpoint_data: checkpoint,
                    metadata: metadata || {}
                });

            if (checkpointError) throw checkpointError;

            // Then, handle pending writes if any
            if (newVersions && Object.keys(newVersions).length > 0) {
                const writes = [];
                for (const [channel, value] of Object.entries(newVersions)) {
                    writes.push({
                        thread_id,
                        checkpoint_id: actualCheckpointId,
                        task_id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                        channel,
                        value: value || {}  // null 방지
                    });
                }

                if (writes.length > 0) {
                    const { error: writesError } = await supabase
                        .from('checkpoint_writes')
                        .upsert(writes);

                    if (writesError) throw writesError;
                }
            }

            return {
                configurable: { thread_id, checkpoint_id: actualCheckpointId }
            };
        } catch (error) {
            console.error('Error saving checkpoint:', error);
            throw error;
        }
    }

    async putWrites(config, writes, taskId) {
        const { thread_id, checkpoint_id } = config.configurable || {};
        
        if (!thread_id || !checkpoint_id) {
            throw new Error('thread_id and checkpoint_id are required');
        }

        try {
            const writeRecords = writes.map(([channel, value]) => ({
                thread_id,
                checkpoint_id,
                task_id: taskId,
                channel,
                value: value || {}  // null 방지
            }));

            const { error } = await supabase
                .from('checkpoint_writes')
                .upsert(writeRecords);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving writes:', error);
            throw error;
        }
    }
}