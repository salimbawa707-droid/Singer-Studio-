export type OmniProviderType = 
  | 'gemini' 
  | 'groq'
  | 'deepseek'
  | 'openai_compatible' 
  | 'mistral'
  | 'custom';

export interface CustomApiKeyProfile {
  id: string;
  name: string;
  provider: OmniProviderType;
  apiKey: string;
  endpointUrl?: string;
  modelName?: string;
  enabled: boolean;
  priorityOrder: number;
  // Diagnostics
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed' | 'untested';
  lastTestMessage?: string;
  lastLatencyMs?: number;
}

export interface ProviderStatus {
  configured: boolean;
  priority: number;
  maskedKey?: string;
  source?: string;
  status?: string;
}

export interface TraceStep {
  priority: number;
  keyId?: string;
  provider: string;
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'missing_key' | 'simulated_failure' | 'quota_exhausted' | 'standby';
  latencyMs?: number;
  modelUsed?: string;
  endpointUsed?: string;
  message?: string;
  error?: string;
}

export interface RouteTestResult {
  testId: string;
  timestamp: string;
  winner: string;
  winnerName: string;
  winnerModel: string;
  totalLatencyMs: number;
  trace: TraceStep[];
  resultPreview?: {
    songTitle: string;
    genreStyle: string;
    recommendedBpm: number;
    recommendedKey: string;
    summary: string;
    sections?: any[];
  };
}
