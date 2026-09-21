/**
 * Phase 3: Canonical Audio Engine Provider
 * 
 * Dynamically resolves the active audio engine based on platform runtime:
 * - Native C++ Audio Adapter (when running inside Android application with libmusicbase.so)
 * - WebAudio Platform Adapter (when running in web browsers or standard dev preview)
 */

import { IAudioEngine, AudioEngineCapabilities } from './contracts/audioEngineContract';
import { NativeCppAudioAdapter } from './adapters/nativeAudioAdapter';
import { WebAudioAdapter } from './adapters/webAudioAdapter';

export class AudioEngineProvider {
  private static instance: AudioEngineProvider;

  private constructor() {}

  public static getInstance(): AudioEngineProvider {
    if (!AudioEngineProvider.instance) {
      AudioEngineProvider.instance = new AudioEngineProvider();
    }
    return AudioEngineProvider.instance;
  }

  public getAudioEngine(): IAudioEngine {
    const nativeAdapter = NativeCppAudioAdapter.getInstance();
    if (nativeAdapter.isAvailable()) {
      return nativeAdapter;
    }
    return WebAudioAdapter.getInstance();
  }

  public isNativeEngineActive(): boolean {
    return NativeCppAudioAdapter.getInstance().isAvailable();
  }

  public getEngineType(): 'native_cpp' | 'webaudio' {
    return this.isNativeEngineActive() ? 'native_cpp' : 'webaudio';
  }

  public getEngineCapabilities(): AudioEngineCapabilities {
    return this.getAudioEngine().capabilities;
  }
}

export const audioEngineProvider = AudioEngineProvider.getInstance();
