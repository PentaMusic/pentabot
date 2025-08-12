import supabase, { supabaseService } from './supabase.js';
import { createClient } from '@supabase/supabase-js';

// 새 Thread 생성
export const createThread = async (userId, title = 'New Chat') => {
    try {
        console.log('Creating thread for user:', userId, 'with title:', title);
        
        console.log('Creating thread with supabaseService...');
        const { data, error } = await supabaseService
            .from('threads')
            .insert({
                user_id: userId,
                title: title
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Thread created successfully:', data);
        return { success: true, thread: data };
    } catch (error) {
        console.error('createThread error:', error);
        return { success: false, error: error.message };
    }
};

// 사용자의 Thread 목록 조회 (페이지네이션)
export const getUserThreads = async (userId, limit = 20, offset = 0) => {
    try {
        const { data, error } = await supabaseService
            .from('threads')
            .select(`
                id,
                title,
                created_at,
                updated_at,
                messages (
                    id,
                    content,
                    role,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 각 thread의 첫 번째 메시지와 마지막 활동 시간 추가
        const threadsWithSummary = data.map(thread => ({
            ...thread,
            messageCount: thread.messages.length,
            lastMessage: thread.messages[thread.messages.length - 1] || null,
            firstMessage: thread.messages[0] || null,
            messages: undefined // 클라이언트에는 메시지 전체 목록은 보내지 않음
        }));

        return { success: true, threads: threadsWithSummary };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 특정 Thread 조회 (메시지 포함)
export const getThread = async (threadId, userId) => {
    try {
        const { data, error } = await supabaseService
            .from('threads')
            .select(`
                *,
                messages (
                    id,
                    role,
                    content,
                    metadata,
                    created_at
                )
            `)
            .eq('id', threadId)
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .single();

        if (error) throw error;

        // 메시지를 시간순으로 정렬
        if (data.messages) {
            data.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        return { success: true, thread: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread 제목 업데이트
export const updateThreadTitle = async (threadId, userId, newTitle) => {
    try {
        const { data, error } = await supabaseService
            .from('threads')
            .update({ 
                title: newTitle,
                updated_at: new Date().toISOString()
            })
            .eq('id', threadId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, thread: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread 삭제 (소프트 삭제)
export const deleteThread = async (threadId, userId) => {
    try {
        const { data, error } = await supabaseService
            .from('threads')
            .update({ 
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', threadId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, thread: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread 영구 삭제 (관리자용)
export const permanentDeleteThread = async (threadId, userId) => {
    try {
        const { error } = await supabaseService
            .from('threads')
            .delete()
            .eq('id', threadId)
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Thread의 updated_at 필드 업데이트 (새 메시지 추가시 호출)
export const touchThread = async (threadId) => {
    try {
        const { error } = await supabaseService
            .from('threads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};