import { supabaseService } from './supabase.js';
import { touchThread } from './threads.js';

// 새 메시지 저장
export const saveMessage = async (threadId, userId, role, content, metadata = {}) => {
    try {
        const { data, error } = await supabaseService
            .from('messages')
            .insert({
                thread_id: threadId,
                user_id: userId,
                role: role,
                content: content,
                metadata: metadata
            })
            .select()
            .single();

        if (error) throw error;

        // Thread의 updated_at 업데이트
        await touchThread(threadId);

        return { success: true, message: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread의 메시지 목록 조회
export const getThreadMessages = async (threadId, userId, limit = 50, offset = 0) => {
    try {
        const { data, error } = await supabaseService
            .from('messages')
            .select('*')
            .eq('thread_id', threadId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return { success: true, messages: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 특정 메시지 조회
export const getMessage = async (messageId, userId) => {
    try {
        const { data, error } = await supabaseService
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        return { success: true, message: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 메시지 업데이트 (내용 수정)
export const updateMessage = async (messageId, userId, content, metadata = null) => {
    try {
        const updateData = { content };
        if (metadata !== null) {
            updateData.metadata = metadata;
        }

        const { data, error } = await supabaseService
            .from('messages')
            .update(updateData)
            .eq('id', messageId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, message: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 메시지 삭제
export const deleteMessage = async (messageId, userId) => {
    try {
        const { error } = await supabaseService
            .from('messages')
            .delete()
            .eq('id', messageId)
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 사용자의 메시지 검색
export const searchMessages = async (userId, query, limit = 20) => {
    try {
        const { data, error } = await supabaseService
            .from('messages')
            .select(`
                *,
                threads!inner(
                    id,
                    title,
                    is_deleted
                )
            `)
            .eq('user_id', userId)
            .eq('threads.is_deleted', false)
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { success: true, messages: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread의 메시지 개수 조회
export const getMessageCount = async (threadId, userId) => {
    try {
        const { count, error } = await supabaseService
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId)
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true, count };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 대화 쌍 저장 (사용자 메시지 + AI 응답을 함께 저장)
export const saveConversationPair = async (threadId, userId, userMessage, assistantMessage, userMetadata = {}, assistantMetadata = {}) => {
    try {
        // 사용자 메시지 저장
        const userResult = await saveMessage(threadId, userId, 'user', userMessage, userMetadata);
        if (!userResult.success) {
            throw new Error(`Failed to save user message: ${userResult.error}`);
        }

        // AI 응답 저장
        const assistantResult = await saveMessage(threadId, userId, 'assistant', assistantMessage, assistantMetadata);
        if (!assistantResult.success) {
            throw new Error(`Failed to save assistant message: ${assistantResult.error}`);
        }

        return {
            success: true,
            messages: {
                user: userResult.message,
                assistant: assistantResult.message
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};