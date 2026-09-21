/**
 * Phase 3: JNI Bridge for Surge Studio Native Audio Engine
 * 
 * Provides robust JNI interface between Kotlin/Android and C++ Audio Engine.
 * Features:
 * - Handle validation & lifecycle protection
 * - Thread-safe operations & error propagation
 * - Direct FloatArray & JSON serialization for analysis metadata
 * - Non-blocking audio memory copying
 */

#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include <sstream>
#include "include/audio_engine.h"

#define LOG_TAG "SurgeNativeAudio"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static inline SurgeProjectHandle getValidHandle(jlong handle) {
  if (handle == 0) return nullptr;
  auto* proj = reinterpret_cast<SurgeProjectHandle>(handle);
  if (!surge_engine_is_valid_project(proj)) {
    LOGE("Invalid native session handle: %lld", (long long)handle);
    return nullptr;
  }
  return proj;
}

extern "C" {

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeInitialize(JNIEnv* env, jclass clazz) {
  LOGI("surge_engine_initialize invoked from JNI");
  return surge_engine_initialize();
}

JNIEXPORT void JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeDispose(JNIEnv* env, jclass clazz) {
  LOGI("surge_engine_dispose invoked from JNI");
  surge_engine_dispose();
}

JNIEXPORT jlong JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeCreateSession(JNIEnv* env, jclass clazz, jstring jName) {
  const char* nameStr = jName ? env->GetStringUTFChars(jName, nullptr) : "Session";
  SurgeProjectHandle handle = surge_engine_create_project(nameStr);
  if (jName) env->ReleaseStringUTFChars(jName, nameStr);

  LOGI("Created native audio session %p", handle);
  return reinterpret_cast<jlong>(handle);
}

JNIEXPORT void JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeFreeSession(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (handle) {
    LOGI("Freeing native audio session %p", handle);
    surge_engine_free_project(handle);
  }
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeLoadPcmAudio(
    JNIEnv* env, jclass clazz, jlong jHandle, jfloatArray jPcmData, jfloat sampleRate, jint channels) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle || !jPcmData) return -1;

  jsize length = env->GetArrayLength(jPcmData);
  if (length <= 0) return -1;

  jfloat* pcm = env->GetFloatArrayElements(jPcmData, nullptr);
  if (!pcm) return -1;

  int res = surge_engine_load_pcm(handle, pcm, static_cast<size_t>(length), sampleRate, channels);
  env->ReleaseFloatArrayElements(jPcmData, pcm, JNI_ABORT);
  return res;
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeStartRecording(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return -1;
  LOGI("Starting native audio recording on session %p", handle);
  return surge_engine_start_recording(handle);
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeStopRecording(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return -1;
  LOGI("Stopping native audio recording on session %p", handle);
  return surge_engine_stop_recording(handle);
}

JNIEXPORT jfloatArray JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeGetRecordedAudio(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return nullptr;

  float* buffer = nullptr;
  size_t length = 0;
  if (surge_engine_get_recorded_audio(handle, &buffer, &length) != 0 || !buffer || length == 0) {
    return nullptr;
  }

  jfloatArray result = env->NewFloatArray(static_cast<jsize>(length));
  if (!result) return nullptr;

  env->SetFloatArrayRegion(result, 0, static_cast<jsize>(length), buffer);
  return result;
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeClean(
    JNIEnv* env, jclass clazz, jlong jHandle,
    jfloat noiseReduction, jfloat humRemoval, jfloat vocalPresence,
    jfloat deEsser, jfloat compression) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return -1;

  return surge_engine_clean(handle, noiseReduction, humRemoval, vocalPresence, deEsser, compression);
}

JNIEXPORT jfloatArray JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeGetCleanedAudio(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return nullptr;

  float* buffer = nullptr;
  size_t length = 0;
  if (surge_engine_get_cleaned_audio(handle, &buffer, &length) != 0 || !buffer || length == 0) {
    return nullptr;
  }

  jfloatArray result = env->NewFloatArray(static_cast<jsize>(length));
  if (!result) return nullptr;

  env->SetFloatArrayRegion(result, 0, static_cast<jsize>(length), buffer);
  return result;
}

JNIEXPORT jstring JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeAnalyze(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return nullptr;

  if (surge_engine_analyze(handle) != 0) {
    return nullptr;
  }

  float bpm = surge_engine_get_bpm(handle);
  float bpmConf = surge_engine_get_bpm_confidence(handle);
  const char* key = surge_engine_get_key(handle);
  const char* scale = surge_engine_get_scale(handle);
  float keyConf = surge_engine_get_key_confidence(handle);
  const char* mood = surge_engine_get_mood(handle);
  float moodConf = surge_engine_get_mood_confidence(handle);
  const char* vocalRange = surge_engine_get_vocal_range(handle);
  float pitchStability = surge_engine_get_pitch_stability(handle);

  std::ostringstream json;
  json << "{"
       << "\"bpm\":" << bpm << ","
       << "\"bpmConfidence\":" << bpmConf << ","
       << "\"key\":\"" << (key ? key : "C") << "\","
       << "\"scale\":\"" << (scale ? scale : "major") << "\","
       << "\"keyConfidence\":" << keyConf << ","
       << "\"mood\":\"" << (mood ? mood : "Neutral") << "\","
       << "\"moodConfidence\":" << moodConf << ","
       << "\"vocalRange\":\"" << (vocalRange ? vocalRange : "") << "\","
       << "\"pitchStability\":" << pitchStability
       << "}";

  std::string jsonStr = json.str();
  return env->NewStringUTF(jsonStr.c_str());
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeGenerateMusic(
    JNIEnv* env, jclass clazz, jlong jHandle,
    jstring jStyle, jstring jKey, jstring jScale,
    jfloat bpm, jfloat duration, jlong seed) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return -1;

  const char* style = jStyle ? env->GetStringUTFChars(jStyle, nullptr) : "Pop";
  const char* key = jKey ? env->GetStringUTFChars(jKey, nullptr) : "C";
  const char* scale = jScale ? env->GetStringUTFChars(jScale, nullptr) : "major";

  int res = surge_engine_generate_music(handle, style, key, scale, bpm, duration, static_cast<unsigned int>(seed));

  if (jStyle) env->ReleaseStringUTFChars(jStyle, style);
  if (jKey) env->ReleaseStringUTFChars(jKey, key);
  if (jScale) env->ReleaseStringUTFChars(jScale, scale);
  return res;
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeMaster(
    JNIEnv* env, jclass clazz, jlong jHandle,
    jstring jPreset, jfloat intensity, jfloat brightness, jfloat stereoWidth) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return -1;

  const char* preset = jPreset ? env->GetStringUTFChars(jPreset, nullptr) : "Natural";
  int res = surge_engine_master(handle, preset, intensity, brightness, stereoWidth);
  if (jPreset) env->ReleaseStringUTFChars(jPreset, preset);
  return res;
}

JNIEXPORT jfloatArray JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeMixPreview(JNIEnv* env, jclass clazz, jlong jHandle) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle) return nullptr;

  float* buffer = nullptr;
  size_t length = 0;
  if (surge_engine_mix_preview(handle, &buffer, &length) != 0 || !buffer || length == 0) {
    return nullptr;
  }

  jfloatArray result = env->NewFloatArray(static_cast<jsize>(length));
  if (!result) return nullptr;

  env->SetFloatArrayRegion(result, 0, static_cast<jsize>(length), buffer);
  return result;
}

JNIEXPORT jint JNICALL
Java_com_surge_musicbase_NativeAudioEngine_nativeExportWav(
    JNIEnv* env, jclass clazz, jlong jHandle, jstring jPath, jint bitsPerSample) {
  SurgeProjectHandle handle = getValidHandle(jHandle);
  if (!handle || !jPath) return -1;

  const char* path = env->GetStringUTFChars(jPath, nullptr);
  int res = surge_engine_export_wav(handle, path, bitsPerSample);
  env->ReleaseStringUTFChars(jPath, path);
  return res;
}

} // extern "C"
