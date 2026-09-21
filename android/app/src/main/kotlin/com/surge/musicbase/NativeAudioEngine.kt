package com.surge.musicbase

import android.util.Log

/**
 * Phase 3: Native Audio Engine JNI Bridge
 * 
 * Direct binding to the compiled C++ audio engine (libmusicbase.so).
 */
object NativeAudioEngine {
    private const val TAG = "SurgeNativeAudio"
    var isLoaded = false
        private set

    init {
        try {
            System.loadLibrary("musicbase")
            isLoaded = true
            Log.i(TAG, "Successfully loaded libmusicbase.so native library.")
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to load libmusicbase.so native library: ${t.message}", t)
            isLoaded = false
        }
    }

    // Engine Lifecycle
    @JvmStatic external fun nativeInitialize(): Int
    @JvmStatic external fun nativeDispose()

    // Session Management
    @JvmStatic external fun nativeCreateSession(name: String): Long
    @JvmStatic external fun nativeFreeSession(handle: Long)

    // Audio Loading & Ingestion
    @JvmStatic external fun nativeLoadPcmAudio(handle: Long, pcmData: FloatArray, sampleRate: Float, channels: Int): Int

    // Recording Primitives
    @JvmStatic external fun nativeStartRecording(handle: Long): Int
    @JvmStatic external fun nativeStopRecording(handle: Long): Int
    @JvmStatic external fun nativeGetRecordedAudio(handle: Long): FloatArray?

    // DSP & Restoration Primitives
    @JvmStatic external fun nativeClean(
        handle: Long,
        noiseReduction: Float,
        humRemoval: Float,
        vocalPresence: Float,
        deEsser: Float,
        compression: Float
    ): Int
    @JvmStatic external fun nativeGetCleanedAudio(handle: Long): FloatArray?

    // Analysis Primitives
    @JvmStatic external fun nativeAnalyze(handle: Long): String?

    // Music Primitives
    @JvmStatic external fun nativeGenerateMusic(
        handle: Long,
        style: String,
        key: String,
        scale: String,
        bpm: Float,
        duration: Float,
        seed: Long
    ): Int

    // Mastering & Mixing Primitives
    @JvmStatic external fun nativeMaster(
        handle: Long,
        preset: String,
        intensity: Float,
        brightness: Float,
        stereoWidth: Float
    ): Int
    @JvmStatic external fun nativeMixPreview(handle: Long): FloatArray?
    @JvmStatic external fun nativeExportWav(handle: Long, path: String, bitsPerSample: Int): Int
}
