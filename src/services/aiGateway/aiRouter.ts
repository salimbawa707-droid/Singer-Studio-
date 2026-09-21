/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * AI CAPABILITY-AWARE ROUTER & RETRY ENGINE
 * 
 * Conceptual Path:
 * AIGateway -> AIRouter -> ProviderAdapter -> Provider
 * 
 * Priority:
 * 1. User's explicit choice
 * 2. Required capability
 * 3. Local/offline availability
 * 4. Provider health & latency
 * 5. Reliability & cost/quota
 */

import { AIProvider, ProviderCapabilityRegistry } from './providers/aiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { LocalDeterministicEngineAdapter } from './providers/localDeterministicEngine';
import { LocalModelAdapter } from './providers/localModelAdapter';
import { AICapability, AIProviderId, AIRequest, AIResponse } from './types';

export class AIRouter {
  private static instance: AIRouter;

  private providers: Map<AIProviderId, AIProvider> = new Map();
  private localFallbackAdapter: LocalDeterministicEngineAdapter;

  private constructor() {
    this.localFallbackAdapter = new LocalDeterministicEngineAdapter();

    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('local_deterministic', this.localFallbackAdapter);
    this.providers.set('local_model', new LocalModelAdapter());
  }

  public static getInstance(): AIRouter {
    if (!AIRouter.instance) {
      AIRouter.instance = new AIRouter();
    }
    return AIRouter.instance;
  }

  /**
   * Routes an AI request to the best available provider with automatic fallback
   */
  public async routeAndExecute<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const selectedProviderId = this.selectBestProvider(request);
    const primaryProvider = this.providers.get(selectedProviderId) || this.localFallbackAdapter;

    let response = await this.executeWithRetry(primaryProvider, request);

    // If primary online provider failed, automatically fall back to Local Deterministic Engine
    if (response.status === 'failed' && response.fallbackAvailable && primaryProvider.id !== 'local_deterministic') {
      console.warn(`[AIRouter] Primary provider "${primaryProvider.name}" failed (${response.error}). Falling back to Local Deterministic Engine.`);
      
      const fallbackResponse = await this.localFallbackAdapter.generate(request);
      fallbackResponse.error = `Fallback triggered due to primary error: ${response.error}`;
      return fallbackResponse;
    }

    return response;
  }

  /**
   * Selects the optimal provider ID based on capability, user preference, and network status
   */
  public selectBestProvider(request: AIRequest): AIProviderId {
    // 1. If user explicitly requested a provider and it supports the capability, respect user choice
    if (request.preferredProvider && this.providers.has(request.preferredProvider)) {
      const preferred = this.providers.get(request.preferredProvider)!;
      if (ProviderCapabilityRegistry.supportsCapability(request.preferredProvider, request.requiredCapability)) {
        // If offline and preferred is online provider, fallback immediately
        if (typeof navigator !== 'undefined' && !navigator.onLine && preferred.availability === 'online') {
          return 'local_deterministic';
        }
        return request.preferredProvider;
      }
    }

    // 2. If client is offline, force local deterministic engine
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'local_deterministic';
    }

    // 3. Check online Gemini provider
    const gemini = this.providers.get('gemini');
    if (gemini && ProviderCapabilityRegistry.supportsCapability('gemini', request.requiredCapability)) {
      return 'gemini';
    }

    // 4. Fallback to Local Deterministic Engine
    return 'local_deterministic';
  }

  /**
   * Executes request on provider with exponential backoff retries (max 3 attempts) for retryable errors
   */
  private async executeWithRetry<T>(provider: AIProvider, request: AIRequest<T>): Promise<AIResponse<T>> {
    const maxRetries = 3;
    let attempt = 0;
    let lastResponse: AIResponse<T> | null = null;

    while (attempt < maxRetries) {
      attempt++;
      lastResponse = await provider.generate(request);

      if (lastResponse.status === 'success' || !lastResponse.retryable) {
        return lastResponse;
      }

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 200; // 400ms, 800ms...
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    return lastResponse!;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: AIProviderId): AIProvider | undefined {
    return this.providers.get(id);
  }
}
