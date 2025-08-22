import { BaseCheckpointSaver } from "@langchain/langgraph";
import { supabaseService } from './supabase.js';

export class PostgreSQLCheckpointSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    generateCheckpointId() {
        return `checkpoint_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    async getTuple(config) {
        const { thread_id, checkpoint_id } = config.configurable || {};
        
        if (!thread_id) {
            return undefined;
        }

        try {
            let query = supabaseService
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
            
            // Simplified: no pending writes to avoid iteration issues
            const pendingWrites = [];

            return {
                config: { configurable: { thread_id, checkpoint_id: checkpoint.checkpoint_id } },
                checkpoint: typeof checkpoint.checkpoint_data === 'string' 
                    ? JSON.parse(checkpoint.checkpoint_data) 
                    : checkpoint.checkpoint_data,
                metadata: typeof checkpoint.metadata === 'string'
                    ? JSON.parse(checkpoint.metadata)
                    : checkpoint.metadata || {},
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
            let query = supabaseService
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
                // Simplified: no pending writes to avoid iteration issues
                const pendingWrites = [];

                yield {
                    config: { configurable: { thread_id, checkpoint_id: checkpoint.checkpoint_id } },
                    checkpoint: typeof checkpoint.checkpoint_data === 'string' 
                        ? JSON.parse(checkpoint.checkpoint_data) 
                        : checkpoint.checkpoint_data,
                    metadata: typeof checkpoint.metadata === 'string'
                        ? JSON.parse(checkpoint.metadata)
                        : checkpoint.metadata || {},
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
        const actualCheckpointId = checkpoint_id || (checkpoint && checkpoint.id) || this.generateCheckpointId();

        try {
            // Start a transaction-like operation
            // First, insert the main checkpoint
            const { error: checkpointError } = await supabaseService
                .from('checkpoints')
                .upsert({
                    thread_id,
                    checkpoint_id: actualCheckpointId,
                    parent_checkpoint_id: config.parentConfig?.configurable?.checkpoint_id,
                    checkpoint_data: JSON.stringify(checkpoint),
                    metadata: JSON.stringify(metadata || {})
                });

            if (checkpointError) throw checkpointError;

            // Simplified: skip writes to avoid iteration issues
            // if (newVersions && Object.keys(newVersions).length > 0) {
            //     // Skip writes for now
            // }

            return {
                configurable: { thread_id, checkpoint_id: actualCheckpointId }
            };
        } catch (error) {
            console.error('Error saving checkpoint:', error);
            throw error;
        }
    }

    async putWrites(config, writes, taskId) {
        // For now, we'll keep this simple to avoid iteration issues
        // In a production environment, you might want to implement proper write handling
        console.log('putWrites called with config:', config, 'writes:', writes.length, 'taskId:', taskId);
        return;
    }
}