/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * AI PROVIDER CONTRACT & CAPABILITY REGISTRY
 */

import { AICapability, AIProviderId, AIRequest, AIResponse } from '../types';

export interface AIProvider {
  id: AIProviderId;
  name: string;
  capabilities: AICapability[];
  availability: 'online' | 'offline' | 'unavailable';
  healthCheck(): Promise<boolean>;
  generate<T>(request: AIRequest<T>): Promise<AIResponse<T>>;
}

export class ProviderCapabilityRegistry {
  private static providerCapabilities: Record<AIProviderId, AICapability[]> = {
    gemini: [
      'structured_output',
      'text_generation',
      'composition',
      'arrangement',
      'mixing_recommendations',
      'mastering_recommendations'
    ],
    groq: [
      'structured_output',
      'text_generation'
    ],
    openai: [
      'structured_output',
      'text_generation'
    ],
    local_deterministic: [
      'structured_output',
      'text_generation',
      'audio_analysis',
      'composition',
      'arrangement',
      'mixing_recommendations',
      'mastering_recommendations'
    ],
    local_model: [] // Currently reported as NOT IMPLEMENTED unless ONNX model is loaded
  };

  public static getCapabilities(providerId: AIProviderId): AICapability[] {
    return this.providerCapabilities[providerId] || [];
  }

  public static supportsCapability(providerId: AIProviderId, capability: AICapability): boolean {
    const caps = this.getCapabilities(providerId);
    return caps.includes(capability);
  }
}
