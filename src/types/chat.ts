export interface ChatRequest {
  chatInput: string;
  topK?: number;
  temperature?: number;
}

export interface ChatResponse {
  output: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface N8nWebhookResponse {
  output: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}