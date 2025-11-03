// Usage statistics types

export interface ToolStats {
  count: number;
  tokens: number;
  cost: number;
  averageExecutionTime: number;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageExecutionTime: number;
  toolBreakdown: Record<string, ToolStats>;
  statusBreakdown: {
    success: number;
    error: number;
    timeout: number;
  };
}

export interface DailyUsageSummary {
  usage_date: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  unique_tools: number;
}

export interface UsageHistory {
  id: string;
  user_id: string;
  thread_id: string | null;
  message_id: string | null;
  tool_type: string;
  tool_name: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  execution_time_ms: number | null;
  status: 'success' | 'error' | 'timeout';
  error_message: string | null;
  created_at: string;
}

export type PeriodFilter = 'today' | '7days' | '30days' | 'all';
