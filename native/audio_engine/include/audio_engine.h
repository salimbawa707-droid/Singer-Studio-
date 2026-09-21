#pragma once
#include <cstdint>
#include <cstddef>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct SurgeProject* SurgeProjectHandle;

int surge_engine_initialize();
void surge_engine_dispose();
SurgeProjectHandle surge_engine_create_project(const char* name);
int surge_engine_is_valid_project(SurgeProjectHandle project);
int surge_engine_load_file(SurgeProjectHandle project, const char* path);
int surge_engine_load_pcm(SurgeProjectHandle project, const float* samples, size_t length, float sampleRate, int channels);
int surge_engine_save_project(SurgeProjectHandle project, const char* path);
int surge_engine_delete_project(const char* path);
void surge_engine_free_project(SurgeProjectHandle project);

int surge_engine_start_recording(SurgeProjectHandle project);
int surge_engine_stop_recording(SurgeProjectHandle project);
int surge_engine_get_recorded_audio(SurgeProjectHandle project, float** buffer, size_t* length);
int surge_engine_get_source_audio(SurgeProjectHandle project, float** buffer, size_t* length);
int surge_engine_get_cleaned_audio(SurgeProjectHandle project, float** buffer, size_t* length);

int surge_engine_clean(SurgeProjectHandle project,
    float noiseReduction, float humRemoval, float vocalPresence,
    float deEsser, float compression);
int surge_engine_analyze(SurgeProjectHandle project);
float surge_engine_get_bpm(SurgeProjectHandle project);
float surge_engine_get_bpm_confidence(SurgeProjectHandle project);
const char* surge_engine_get_key(SurgeProjectHandle project);
const char* surge_engine_get_scale(SurgeProjectHandle project);
float surge_engine_get_key_confidence(SurgeProjectHandle project);
const char* surge_engine_get_mood(SurgeProjectHandle project);
float surge_engine_get_mood_confidence(SurgeProjectHandle project);
const char* surge_engine_get_vocal_range(SurgeProjectHandle project);
float surge_engine_get_pitch_stability(SurgeProjectHandle project);

int surge_engine_generate_music(SurgeProjectHandle project,
    const char* style, const char* key, const char* scale,
    float bpm, float duration, unsigned int seed);

int surge_engine_master(SurgeProjectHandle project, const char* preset,
    float intensity, float brightness, float stereoWidth);

int surge_engine_set_track_volume(SurgeProjectHandle project, int trackIndex, float volume);
int surge_engine_set_track_mute(SurgeProjectHandle project, int trackIndex, int mute);
int surge_engine_set_track_solo(SurgeProjectHandle project, int trackIndex, int solo);
int surge_engine_remove_instrument(SurgeProjectHandle project, int trackIndex);
int surge_engine_add_instrument(SurgeProjectHandle project, const char* name);
int surge_engine_replace_instrument(SurgeProjectHandle project, int trackIndex, const char* name);
int surge_engine_mix_preview(SurgeProjectHandle project, float** buffer, size_t* length);
int surge_engine_export_wav(SurgeProjectHandle project, const char* path, int bitsPerSample);
const char* surge_engine_get_project_name(SurgeProjectHandle project);
const char* surge_engine_get_project_path(SurgeProjectHandle project);

#ifdef __cplusplus
}
#endif
