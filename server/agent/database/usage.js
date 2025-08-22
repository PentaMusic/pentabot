import supabase from './supabase.js';

// 사용량 기록 저장
export const recordUsage = async ({
    userId,
    threadId = null,
    messageId = null,
    toolType = 'claude_chat',
    toolName = null,
    inputTokens = 0,
    outputTokens = 0,
    costUsd = 0,
    requestData = {},
    responseData = {},
    executionTimeMs = null,
    status = 'success',
    errorMessage = null
}) => {
    try {
        const { data, error } = await supabase
            .from('usage_history')
            .insert({
                user_id: userId,
                thread_id: threadId,
                message_id: messageId,
                tool_type: toolType,
                tool_name: toolName,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                cost_usd: costUsd,
                request_data: requestData,
                response_data: responseData,
                execution_time_ms: executionTimeMs,
                status: status,
                error_message: errorMessage
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, usage: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 사용자의 사용량 통계 조회
export const getUserUsageStats = async (userId, startDate = null, endDate = null) => {
    try {
        let query = supabase
            .from('usage_history')
            .select('*')
            .eq('user_id', userId);

        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // 통계 계산
        const stats = {
            totalRequests: data.length,
            totalTokens: data.reduce((sum, item) => sum + item.total_tokens, 0),
            totalInputTokens: data.reduce((sum, item) => sum + item.input_tokens, 0),
            totalOutputTokens: data.reduce((sum, item) => sum + item.output_tokens, 0),
            totalCost: data.reduce((sum, item) => sum + parseFloat(item.cost_usd || 0), 0),
            averageExecutionTime: data.filter(item => item.execution_time_ms).length > 0
                ? data.filter(item => item.execution_time_ms)
                    .reduce((sum, item) => sum + item.execution_time_ms, 0) 
                  / data.filter(item => item.execution_time_ms).length
                : 0,
            toolBreakdown: {},
            statusBreakdown: {
                success: 0,
                error: 0,
                timeout: 0
            }
        };

        // Tool별 통계
        data.forEach(item => {
            const toolKey = item.tool_type;
            if (!stats.toolBreakdown[toolKey]) {
                stats.toolBreakdown[toolKey] = {
                    count: 0,
                    tokens: 0,
                    cost: 0,
                    averageExecutionTime: 0,
                    executionTimes: []
                };
            }
            stats.toolBreakdown[toolKey].count += 1;
            stats.toolBreakdown[toolKey].tokens += item.total_tokens;
            stats.toolBreakdown[toolKey].cost += parseFloat(item.cost_usd || 0);
            if (item.execution_time_ms) {
                stats.toolBreakdown[toolKey].executionTimes.push(item.execution_time_ms);
            }

            // Status 통계
            stats.statusBreakdown[item.status] += 1;
        });

        // 평균 실행시간 계산
        Object.keys(stats.toolBreakdown).forEach(tool => {
            const times = stats.toolBreakdown[tool].executionTimes;
            if (times.length > 0) {
                stats.toolBreakdown[tool].averageExecutionTime = 
                    times.reduce((sum, time) => sum + time, 0) / times.length;
            }
            delete stats.toolBreakdown[tool].executionTimes;
        });

        return { success: true, stats, rawData: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Tool별 사용량 조회 (뷰 사용)
export const getUsageStatsByTool = async (userId, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('usage_stats_by_tool')
            .select('*')
            .eq('user_id', userId)
            .gte('usage_date', startDate.toISOString().split('T')[0]);

        if (error) throw error;

        return { success: true, stats: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 일별 사용량 요약 조회
export const getDailyUsageSummary = async (userId, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('daily_usage_summary')
            .select('*')
            .eq('user_id', userId)
            .gte('usage_date', startDate.toISOString().split('T')[0])
            .order('usage_date', { ascending: false });

        if (error) throw error;

        return { success: true, summary: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 특정 Thread의 사용량 조회
export const getThreadUsage = async (threadId, userId) => {
    try {
        const { data, error } = await supabase
            .from('usage_history')
            .select('*')
            .eq('thread_id', threadId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const totalTokens = data.reduce((sum, item) => sum + item.total_tokens, 0);
        const totalCost = data.reduce((sum, item) => sum + parseFloat(item.cost_usd || 0), 0);

        return { 
            success: true, 
            usage: data, 
            summary: {
                totalRequests: data.length,
                totalTokens,
                totalCost
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 토큰 비용 계산 유틸리티
export const calculateCost = (inputTokens, outputTokens, toolType = 'claude_chat') => {
    // Claude 3.5 Sonnet 가격 (2024년 기준, 실제 가격은 변경될 수 있음)
    const pricing = {
        'claude_chat': {
            input: 0.003 / 1000,  // $0.003 per 1K input tokens
            output: 0.015 / 1000  // $0.015 per 1K output tokens
        },
        'javascript_executor': {
            input: 0.0,  // 내부 도구이므로 무료
            output: 0.0
        },
        'weather_tool': {
            input: 0.001 / 1000,  // 가정된 가격
            output: 0.001 / 1000
        }
    };

    const rates = pricing[toolType] || pricing['claude_chat'];
    return (inputTokens * rates.input) + (outputTokens * rates.output);
};

// 사용량 기록 + 비용 자동 계산
export const recordUsageWithCostCalculation = async (params) => {
    const cost = calculateCost(
        params.inputTokens || 0,
        params.outputTokens || 0,
        params.toolType
    );

    return await recordUsage({
        ...params,
        costUsd: cost
    });
};