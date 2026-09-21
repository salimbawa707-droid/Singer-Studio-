/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * GEMINI AI PROVIDER ADAPTER
 * 
 * Online Gemini API integration via Server-Side proxy.
 * Key Security: Never exposes API keys in client logs, telemetry, or exported metadata.
 * Honest Label: "AI-generated" or "AI-assisted".
 */

import { AIProvider } from './aiProvider';
import { AICapability, AIFailureCategory, AIProviderId, AIRequest, AIResponse } from '../types';

export class GeminiProvider implements AIProvider {
  public id: AIProviderId = 'gemini';
  public name = 'Google Gemini 3.8 / Flash Pro Engine';
  public capabilities: AICapability[] = [
    'structured_output',
    'text_generation',
    'composition',
    'arrangement',
    'mixing_recommendations',
    'mastering_recommendations'
  ];
  public availability: 'online' | 'offline' | 'unavailable' = 'online';

  public async healthCheck(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const res = await fetch('/api/health', { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || 10000;

    // Check client network status first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        requestId: request.id,
        status: 'failed',
        lifecycleState: 'FAILED',
        provider: 'gemini',
        label: 'AI-generated',
        error: 'Network unavailable (Offline mode active)',
        failureCategory: 'NETWORK_ERROR',
        retryable: true,
        fallbackAvailable: true,
        latencyMs: Date.now() - startTime
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aistudio-build'
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: request.prompt,
          feature: request.feature,
          userConstraints: request.userConstraints,
          seed: request.seed
        })
      });

      clearTimeout(timer);

      if (!response.ok) {
        let failureCat: AIFailureCategory = 'SERVER_ERROR';
        let isRetryable = true;
        if (response.status === 401 || response.status === 403) {
          failureCat = 'AUTH_ERROR';
          isRetryable = false;
        } else if (response.status === 429) {
          failureCat = 'RATE_LIMIT';
          isRetryable = true;
        } else if (response.status === 402) {
          failureCat = 'QUOTA_EXCEEDED';
          isRetryable = false;
        }

        const errText = await response.text().catch(() => 'Unknown server error');
        const sanitizedErr = this.redactSecrets(errText);

        return {
          requestId: request.id,
          status: 'failed',
          lifecycleState: 'FAILED',
          provider: 'gemini',
          label: 'AI-generated',
          error: `HTTP ${response.status}: ${sanitizedErr}`,
          failureCategory: failureCat,
          retryable: isRetryable,
          fallbackAvailable: true,
          latencyMs: Date.now() - startTime
        };
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        return {
          requestId: request.id,
          status: 'failed',
          lifecycleState: 'FAILED',
          provider: 'gemini',
          label: 'AI-generated',
          error: json.error || 'Empty response from Gemini server',
          failureCategory: 'INVALID_RESPONSE',
          retryable: true,
          fallbackAvailable: true,
          latencyMs: Date.now() - startTime
        };
      }

      return {
        requestId: request.id,
        status: 'success',
        lifecycleState: 'READY_TO_APPLY',
        provider: 'gemini',
        modelUsed: json.modelUsed || 'gemini-3.8-flash',
        label: 'AI-generated',
        proposal: json.data as T,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err.name === 'AbortError';
      const sanitizedMsg = this.redactSecrets(err.message || String(err));

      return {
        requestId: request.id,
        status: 'failed',
        lifecycleState: 'FAILED',
        provider: 'gemini',
        label: 'AI-generated',
        error: isAbort ? `Request timed out after ${timeoutMs}ms` : sanitizedMsg,
        failureCategory: isAbort ? 'NETWORK_ERROR' : 'SERVER_ERROR',
        retryable: true,
        fallbackAvailable: true,
        latencyMs: Date.now() - startTime
      };
    }
  }

  private redactSecrets(text: string): string {
    if (!text) return '';
    return text
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
      .replace(/key=[A-Za-z0-9_%-]+/g, 'key=[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]');
  }
}
