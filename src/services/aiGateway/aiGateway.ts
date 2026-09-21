/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * UNIFIED AI GATEWAY (SINGLE CANONICAL ENTRY POINT)
 * 
 * Flow:
 * User Intent / UI → AIGateway → AIRouter → ProviderAdapter → Provider
 *                           ↓
 *                   Structured AI Result
 *                           ↓
 *                    Schema Validation
 *                           ↓
 *                  Music Domain Validation
 *                           ↓
 *              Explicit Application to Canonical State
 */

import { AIRouter } from './aiRouter';
import { AIValidationEngine, ValidationResult } from './aiValidationEngine';
import {
  AIObservabilityLog,
  AIProposalEnvelope,
  AIProviderId,
  AIRequest,
  AIResponse,
  StructuredAiMasterProposal,
  StructuredAiMixProposal,
  StructuredAiMusicProposal
} from './types';

export class AIGateway {
  private static instance: AIGateway;

  private router: AIRouter;
  private observabilityLogs: AIObservabilityLog[] = [];
  private proposalCache: Map<string, { proposal: any; timestamp: number }> = new Map();

  private constructor() {
    this.router = AIRouter.getInstance();
  }

  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * Proposes composition architecture via AI Gateway
   */
  public async proposeComposition(
    intent: any,
    lyrics?: string,
    userConstraints?: { bpm?: number; key?: string; scale?: string }
  ): Promise<AIResponse<StructuredAiMusicProposal>> {
    const requestId = `req_comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const sanitizedLyrics = AIValidationEngine.sanitizeInput(lyrics || '');
    const prompt = `Compose a song structure for genre "${intent?.genre || 'Bollywood Romantic'}" with lyrics: "${sanitizedLyrics.slice(0, 500)}"`;

    const request: AIRequest<StructuredAiMusicProposal> = {
      id: requestId,
      feature: 'music_director_composition',
      requiredCapability: 'composition',
      prompt,
      inputData: { ...intent, lyrics: sanitizedLyrics },
      userConstraints
    };

    return this.executeRequest<StructuredAiMusicProposal>(request, (data) =>
      AIValidationEngine.validateMusicProposal(data, userConstraints)
    );
  }

  /**
   * Proposes mixing parameters via AI Gateway
   */
  public async proposeMix(
    trackAnalyses: any,
    userConstraints?: { limiterCeilingDbTP?: number }
  ): Promise<AIResponse<StructuredAiMixProposal>> {
    const requestId = `req_mix_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const prompt = `Analyze stem tracks and recommend mix levels, frequency pockets, and dynamic ducking.`;

    const request: AIRequest<StructuredAiMixProposal> = {
      id: requestId,
      feature: 'mix_recommendations',
      requiredCapability: 'mixing_recommendations',
      prompt,
      inputData: trackAnalyses,
      userConstraints
    };

    return this.executeRequest<StructuredAiMixProposal>(request, (data) =>
      AIValidationEngine.validateMixProposal(data, userConstraints)
    );
  }

  /**
   * Proposes mastering parameters via AI Gateway
   */
  public async proposeMastering(
    audioAnalysis: any,
    userConstraints?: { limiterCeilingDbTP?: number }
  ): Promise<AIResponse<StructuredAiMasterProposal>> {
    const requestId = `req_mast_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const prompt = `Analyze master audio spectrum and recommend mastering EQ, glue compression, and limiter ceiling.`;

    const request: AIRequest<StructuredAiMasterProposal> = {
      id: requestId,
      feature: 'mastering_recommendations',
      requiredCapability: 'mastering_recommendations',
      prompt,
      inputData: audioAnalysis,
      userConstraints
    };

    return this.executeRequest<StructuredAiMasterProposal>(request, (data) =>
      AIValidationEngine.validateMasterProposal(data, userConstraints)
    );
  }

  /**
   * Generic structured request execution with schema + domain validation
   */
  public async executeRequest<T>(
    request: AIRequest<T>,
    validator?: (data: any) => ValidationResult<T>
  ): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache
    if (this.proposalCache.has(cacheKey)) {
      const cached = this.proposalCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 300000) { // 5-min cache
        return {
          requestId: request.id,
          status: 'success',
          lifecycleState: 'READY_TO_APPLY',
          provider: 'local_deterministic',
          label: 'Deterministic',
          proposal: cached.proposal,
          latencyMs: 1
        };
      }
    }

    // Lifecycle: ROUTING -> RUNNING
    const rawResponse = await this.router.routeAndExecute<T>(request);

    if (rawResponse.status === 'failed' || !rawResponse.proposal) {
      this.logObservability({
        requestId: request.id,
        timestamp: Date.now(),
        feature: request.feature,
        provider: rawResponse.provider,
        model: rawResponse.modelUsed,
        latencyMs: rawResponse.latencyMs,
        status: 'FAILED',
        retryCount: 1,
        failureCategory: rawResponse.failureCategory || 'SERVER_ERROR',
        schemaValid: false,
        domainValid: false
      });

      return rawResponse;
    }

    // Lifecycle: VALIDATING_RESULT
    let schemaValid = true;
    let domainValid = true;
    let validatedPayload: T = rawResponse.proposal;

    if (validator) {
      const valRes = validator(rawResponse.proposal);
      schemaValid = valRes.schemaErrors.length === 0;
      domainValid = valRes.isValid;

      if (!valRes.isValid) {
        // If online AI returned invalid domain proposal, fall back to local deterministic engine proposal
        console.warn(`[AIGateway] Domain validation failed for provider ${rawResponse.provider}:`, valRes.domainErrors);
        
        const fallbackRequest: AIRequest<T> = { ...request, preferredProvider: 'local_deterministic' };
        const fallbackResp = await this.router.routeAndExecute<T>(fallbackRequest);
        
        if (fallbackResp.status === 'success' && fallbackResp.proposal) {
          const fallbackVal = validator(fallbackResp.proposal);
          validatedPayload = fallbackVal.sanitizedProposal || fallbackResp.proposal;
          rawResponse.provider = 'local_deterministic';
          rawResponse.label = 'Deterministic';
          domainValid = true;
        } else {
          return {
            requestId: request.id,
            status: 'failed',
            lifecycleState: 'FAILED',
            provider: rawResponse.provider,
            label: rawResponse.label,
            error: `Domain validation failed: ${valRes.domainErrors.join(', ')}`,
            failureCategory: 'DOMAIN_VALIDATION_FAILED',
            retryable: false,
            fallbackAvailable: false,
            latencyMs: Date.now() - startTime
          };
        }
      } else if (valRes.sanitizedProposal) {
        validatedPayload = valRes.sanitizedProposal;
      }
    }

    // Build Proposal Envelope
    const envelope: AIProposalEnvelope<T> = {
      proposalId: `prop_${request.id}`,
      feature: request.feature,
      schemaVersion: '4.0.0',
      payload: validatedPayload,
      provider: rawResponse.provider,
      label: rawResponse.label,
      isApplied: false,
      timestamp: Date.now()
    };

    // Store in cache
    this.proposalCache.set(cacheKey, { proposal: validatedPayload, timestamp: Date.now() });

    // Log Observability
    this.logObservability({
      requestId: request.id,
      timestamp: Date.now(),
      feature: request.feature,
      provider: rawResponse.provider,
      model: rawResponse.modelUsed,
      latencyMs: Date.now() - startTime,
      status: 'READY_TO_APPLY',
      retryCount: 0,
      schemaValid,
      domainValid
    });

    return {
      requestId: request.id,
      status: 'success',
      lifecycleState: 'READY_TO_APPLY',
      provider: rawResponse.provider,
      modelUsed: rawResponse.modelUsed,
      label: rawResponse.label,
      proposal: validatedPayload,
      proposalEnvelope: envelope,
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Explicitly applies a validated proposal envelope to canonical project state (Absolute Rule #1)
   */
  public applyProposal<T>(
    envelope: AIProposalEnvelope<T>,
    applyFn: (payload: T) => void
  ): { success: boolean; message: string } {
    if (!envelope || !envelope.payload) {
      return { success: false, message: 'Invalid or empty proposal envelope' };
    }

    try {
      applyFn(envelope.payload);
      envelope.isApplied = true;

      this.logObservability({
        requestId: envelope.proposalId,
        timestamp: Date.now(),
        feature: envelope.feature,
        provider: envelope.provider,
        latencyMs: 0,
        status: 'APPLIED',
        retryCount: 0,
        schemaValid: true,
        domainValid: true
      });

      return { success: true, message: `Proposal ${envelope.proposalId} successfully applied by domain engine.` };
    } catch (err: any) {
      return { success: false, message: `Failed to apply proposal: ${err.message}` };
    }
  }

  public getObservabilityLogs(): AIObservabilityLog[] {
    return [...this.observabilityLogs];
  }

  public clearCache(): void {
    this.proposalCache.clear();
  }

  private generateCacheKey(req: AIRequest): string {
    return `${req.feature}_${req.requiredCapability}_${JSON.stringify(req.userConstraints || {})}_${req.prompt.slice(0, 100)}`;
  }

  private logObservability(log: AIObservabilityLog): void {
    this.observabilityLogs.push(log);
    if (this.observabilityLogs.length > 500) {
      this.observabilityLogs.shift();
    }
  }
}
