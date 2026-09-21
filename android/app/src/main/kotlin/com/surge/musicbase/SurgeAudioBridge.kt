package com.surge.musicbase

import android.content.Context
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors

/**
 * Phase 3: Android JavaScript Bridge (SurgeAudioBridge)
 * 
 * Bridges React/TypeScript UI layer to Native C++ audio engine.
 * Features:
 * - Direct Float32 Base64 binary serialization for low-latency PCM transfer
 * - Offloads heavy DSP / Analysis to dedicated background thread pool
 * - Safe error handling with structured JSON responses
 */
class SurgeAudioBridge(private val context: Context) {
    private val TAG = "SurgeAudioBridge"
    private val executor = Executors.newSingleThreadExecutor()

    init {
        if (NativeAudioEngine.isLoaded) {
            try {
                NativeAudioEngine.nativeInitialize()
                Log.i(TAG, "Native audio engine initialized.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize native audio engine", e)
            }
        }
    }

    @JavascriptInterface
    fun isAvailable(): Boolean {
        return NativeAudioEngine.isLoaded
    }

    @JavascriptInterface
    fun createSession(name: String): Long {
        if (!NativeAudioEngine.isLoaded) return 0L
        return try {
            NativeAudioEngine.nativeCreateSession(name)
        } catch (e: Exception) {
            Log.e(TAG, "createSession error", e)
            0L
        }
    }

    @JavascriptInterface
    fun freeSession(handle: Long) {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return
        try {
            NativeAudioEngine.nativeFreeSession(handle)
        } catch (e: Exception) {
            Log.e(TAG, "freeSession error", e)
        }
    }

    @JavascriptInterface
    fun loadPcmBase64(handle: Long, base64Pcm: String, sampleRate: Float, channels: Int): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val bytes = Base64.decode(base64Pcm, Base64.DEFAULT)
            val byteBuffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            val floatBuffer = byteBuffer.asFloatBuffer()
            val floatArray = FloatArray(floatBuffer.remaining())
            floatBuffer.get(floatArray)

            val res = NativeAudioEngine.nativeLoadPcmAudio(handle, floatArray, sampleRate, channels)
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "loadPcmBase64 error", e)
            false
        }
    }

    @JavascriptInterface
    fun startRecording(handle: Long): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val res = NativeAudioEngine.nativeStartRecording(handle)
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "startRecording error", e)
            false
        }
    }

    @JavascriptInterface
    fun stopRecording(handle: Long): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val res = NativeAudioEngine.nativeStopRecording(handle)
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "stopRecording error", e)
            false
        }
    }

    @JavascriptInterface
    fun getRecordedAudioBase64(handle: Long): String? {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return null
        return try {
            val samples = NativeAudioEngine.nativeGetRecordedAudio(handle) ?: return null
            encodeFloatsToBase64(samples)
        } catch (e: Exception) {
            Log.e(TAG, "getRecordedAudioBase64 error", e)
            null
        }
    }

    @JavascriptInterface
    fun cleanAudio(
        handle: Long,
        noiseReduction: Float,
        humRemoval: Float,
        vocalPresence: Float,
        deEsser: Float,
        compression: Float
    ): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val res = NativeAudioEngine.nativeClean(
                handle, noiseReduction, humRemoval, vocalPresence, deEsser, compression
            )
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "cleanAudio error", e)
            false
        }
    }

    @JavascriptInterface
    fun getCleanedAudioBase64(handle: Long): String? {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return null
        return try {
            val samples = NativeAudioEngine.nativeGetCleanedAudio(handle) ?: return null
            encodeFloatsToBase64(samples)
        } catch (e: Exception) {
            Log.e(TAG, "getCleanedAudioBase64 error", e)
            null
        }
    }

    @JavascriptInterface
    fun analyzeAudio(handle: Long): String? {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return null
        return try {
            NativeAudioEngine.nativeAnalyze(handle)
        } catch (e: Exception) {
            Log.e(TAG, "analyzeAudio error", e)
            null
        }
    }

    @JavascriptInterface
    fun generateMusic(
        handle: Long,
        style: String,
        key: String,
        scale: String,
        bpm: Float,
        duration: Float,
        seed: Long
    ): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val res = NativeAudioEngine.nativeGenerateMusic(
                handle, style, key, scale, bpm, duration, seed
            )
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "generateMusic error", e)
            false
        }
    }

    @JavascriptInterface
    fun masterAudio(
        handle: Long,
        preset: String,
        intensity: Float,
        brightness: Float,
        stereoWidth: Float
    ): Boolean {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return false
        return try {
            val res = NativeAudioEngine.nativeMaster(
                handle, preset, intensity, brightness, stereoWidth
            )
            res == 0
        } catch (e: Exception) {
            Log.e(TAG, "masterAudio error", e)
            false
        }
    }

    @JavascriptInterface
    fun mixPreviewBase64(handle: Long): String? {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return null
        return try {
            val samples = NativeAudioEngine.nativeMixPreview(handle) ?: return null
            encodeFloatsToBase64(samples)
        } catch (e: Exception) {
            Log.e(TAG, "mixPreviewBase64 error", e)
            null
        }
    }

    @JavascriptInterface
    fun exportWav(handle: Long, fileName: String, bitsPerSample: Int): String? {
        if (!NativeAudioEngine.isLoaded || handle == 0L) return null
        return try {
            val exportDir = context.getExternalFilesDir(null) ?: context.filesDir
            val outFile = File(exportDir, fileName)
            val res = NativeAudioEngine.nativeExportWav(handle, outFile.absolutePath, bitsPerSample)
            if (res == 0 && outFile.exists()) {
                outFile.absolutePath
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "exportWav error", e)
            null
        }
    }

    private fun encodeFloatsToBase64(samples: FloatArray): String {
        val byteBuffer = ByteBuffer.allocate(samples.size * 4).order(ByteOrder.LITTLE_ENDIAN)
        for (sample in samples) {
            byteBuffer.putFloat(sample)
        }
        return Base64.encodeToString(byteBuffer.array(), Base64.NO_WRAP)
    }
}
