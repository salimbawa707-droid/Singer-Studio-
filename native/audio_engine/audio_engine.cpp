#include "include/audio_engine.h"
#include "../dsp/fft.h"
#include "../dsp/analysis/yin.h"
#include "../dsp/analysis/tempo.h"
#include "../dsp/analysis/key.h"
#include "../dsp/analysis/mood.h"
#include "../dsp/utils/audio_cleaner.h"
#include "../dsp/utils/mastering.h"
#include "../dsp/utils/wav_codec.h"
#include "../dsp/utils/noise_reducer.h"
#include "../dsp/generation/chord_engine.h"
#include "../dsp/generation/drum_engine.h"
#include "../dsp/generation/arrangement_engine.h"
#include "../dsp/instruments/synthesizer.h"
#include "audio_input.h"

#include <vector>
#include <string>
#include <map>
#include <cmath>
#include <algorithm>
#include <random>
#include <mutex>

using namespace musicbase::dsp;

struct Track {
  std::string name;
  std::vector<float> samples;
  float volume = 1.0f;
  bool mute = false;
  bool solo = false;
  float pan = 0.0f;
};

struct SurgeProject {
  std::string name;
  std::string path;
  std::vector<float> sourceAudio;
  std::vector<float> cleanedAudio;
  std::vector<float> masteredAudio;
  std::vector<Track> tracks;
  float sampleRate = 44100.0f;
  float bpm = 120.0f;
  float bpmConfidence = 0.0f;
  std::string key = "C";
  std::string scale = "major";
  float keyConfidence = 0.0f;
  std::string mood = "Neutral";
  float moodConfidence = 0.0f;
  std::string vocalRange = "";
  float pitchStability = 0.0f;
  bool hasAnalysis = false;
  bool hasMastering = false;
  MasteringSettings masteringSettings;
};

static std::map<std::string, SurgeProject*> g_projects;
static std::mutex g_engineMutex;
static int g_initialized = 0;

extern "C" {

int surge_engine_initialize() {
  std::lock_guard<std::mutex> lock(g_engineMutex);
  g_initialized = 1;
  return 0;
}

void surge_engine_dispose() {
  std::lock_guard<std::mutex> lock(g_engineMutex);
  for (auto& p : g_projects) {
    delete p.second;
  }
  g_projects.clear();
  g_initialized = 0;
}

int surge_engine_is_valid_project(SurgeProjectHandle project) {
  if (!project) return 0;
  std::lock_guard<std::mutex> lock(g_engineMutex);
  for (const auto& pair : g_projects) {
    if (pair.second == project) return 1;
  }
  return 0;
}

SurgeProjectHandle surge_engine_create_project(const char* name) {
  std::lock_guard<std::mutex> lock(g_engineMutex);
  auto* project = new SurgeProject();
  project->name = name ? name : "Untitled";
  std::string base = project->name;
  int suffix = 2;
  while (g_projects.find(project->name) != g_projects.end()) {
    project->name = base + " (" + std::to_string(suffix++) + ")";
  }
  g_projects.emplace(project->name, project);
  return project;
}

void surge_engine_free_project(SurgeProjectHandle project) {
  if (!project) return;
  std::lock_guard<std::mutex> lock(g_engineMutex);
  auto it = g_projects.find(project->name);
  if (it != g_projects.end() && it->second == project) {
    g_projects.erase(it);
  }
  delete project;
}

int surge_engine_load_file(SurgeProjectHandle project, const char* path) {
  if (!surge_engine_is_valid_project(project) || !path) return -1;
  WavInfo info;
  std::vector<float> samples;
  if (!WavCodec::load(path, samples, info)) return -1;
  project->sourceAudio = WavCodec::convertToMono(samples, info.numChannels);
  project->sampleRate = info.sampleRate;
  project->cleanedAudio = project->sourceAudio;
  project->hasAnalysis = false;
  return 0;
}

int surge_engine_load_pcm(SurgeProjectHandle project, const float* samples, size_t length, float sampleRate, int channels) {
  if (!surge_engine_is_valid_project(project) || !samples || length == 0) return -1;
  project->sampleRate = (sampleRate > 0.0f) ? sampleRate : 44100.0f;
  
  if (channels <= 1) {
    project->sourceAudio.assign(samples, samples + length);
  } else {
    // Interleaved stereo to mono conversion
    size_t monoLen = length / channels;
    project->sourceAudio.resize(monoLen);
    for (size_t i = 0; i < monoLen; ++i) {
      float sum = 0.0f;
      for (int c = 0; c < channels; ++c) {
        sum += samples[i * channels + c];
      }
      project->sourceAudio[i] = sum / channels;
    }
  }

  project->cleanedAudio = project->sourceAudio;
  project->hasAnalysis = false;
  return 0;
}

int surge_engine_save_project(SurgeProjectHandle project, const char* path) {
  if (!surge_engine_is_valid_project(project) || !path) return -1;
  project->path = path;
  std::string wavPath = std::string(path) + "_audio.wav";
  return WavCodec::save(wavPath, project->sourceAudio,
                        static_cast<uint32_t>(project->sampleRate), 16) ? 0 : -1;
}

int surge_engine_delete_project(const char* path) {
  (void)path;
  return 0;
}

// ==================== RECORDING ====================

int surge_engine_start_recording(SurgeProjectHandle project) {
  if (!surge_engine_is_valid_project(project)) return -1;
  if (!g_initialized) {
    if (surge_engine_initialize() != 0) return -1;
  }
  if (musicbase::audio::isRecording()) return -1;
  project->sourceAudio.clear();
  project->cleanedAudio.clear();
  project->hasAnalysis = false;
  if (!musicbase::audio::initAudioInput()) return -1;
  const bool ok = musicbase::audio::startRecording(
      project->sourceAudio,
      static_cast<uint32_t>(project->sampleRate),
      1);
  if (!ok) {
    musicbase::audio::shutdownAudioInput();
    return -1;
  }
  return 0;
}

int surge_engine_stop_recording(SurgeProjectHandle project) {
  if (!surge_engine_is_valid_project(project)) return -1;
  if (!musicbase::audio::isRecording()) return -1;
  const bool ok = musicbase::audio::stopRecording();
  musicbase::audio::shutdownAudioInput();
  if (ok) {
    project->cleanedAudio = project->sourceAudio;
    project->hasAnalysis = false;
    return 0;
  }
  return -1;
}

int surge_engine_get_recorded_audio(
    SurgeProjectHandle project, float** buffer, size_t* length) {
  if (!surge_engine_is_valid_project(project) || !buffer || !length) return -1;
  if (project->sourceAudio.empty()) {
    *buffer = nullptr;
    *length = 0;
    return 0;
  }
  *buffer = project->sourceAudio.data();
  *length = project->sourceAudio.size();
  return 0;
}

int surge_engine_get_source_audio(
    SurgeProjectHandle project, float** buffer, size_t* length) {
  return surge_engine_get_recorded_audio(project, buffer, length);
}

int surge_engine_get_cleaned_audio(
    SurgeProjectHandle project, float** buffer, size_t* length) {
  if (!surge_engine_is_valid_project(project) || !buffer || !length) return -1;
  if (project->cleanedAudio.empty()) {
    *buffer = nullptr;
    *length = 0;
    return 0;
  }
  *buffer = project->cleanedAudio.data();
  *length = project->cleanedAudio.size();
  return 0;
}

// ==================== DSP & ANALYSIS ====================

int surge_engine_clean(SurgeProjectHandle project,
                       float noiseReduction, float humRemoval, float vocalPresence,
                       float deEsser, float compression) {
  if (!surge_engine_is_valid_project(project) || project->sourceAudio.empty()) return -1;
  CleaningSettings settings;
  settings.noiseReduction = noiseReduction;
  settings.humRemoval = humRemoval;
  settings.vocalPresence = vocalPresence;
  settings.deEsser = deEsser;
  settings.compression = compression;
  project->cleanedAudio = AudioCleaner::clean(
      project->sourceAudio, project->sampleRate, settings);
  return 0;
}

int surge_engine_analyze(SurgeProjectHandle project) {
  if (!surge_engine_is_valid_project(project) || project->cleanedAudio.empty()) return -1;
  auto tempo = TempoDetector::detect(project->cleanedAudio, project->sampleRate);
  project->bpm = tempo.bpm;
  project->bpmConfidence = tempo.confidence;
  auto key = KeyDetector::detect(project->cleanedAudio, project->sampleRate);
  project->key = key.key;
  project->scale = key.scale;
  project->keyConfidence = key.confidence;
  auto mood = MoodEngine::analyze(project->cleanedAudio, project->sampleRate);
  project->mood = mood.mood;
  project->moodConfidence = mood.confidence;

  std::vector<PitchResult> pitches;
  size_t windowSize = static_cast<size_t>(project->sampleRate * 0.05);
  size_t hopSize = std::max<size_t>(1, windowSize / 2);
  for (size_t i = 0; i + windowSize < project->cleanedAudio.size(); i += hopSize) {
    std::vector<float> window(project->cleanedAudio.begin() + i,
                              project->cleanedAudio.begin() + i + windowSize);
    auto p = YIN::detectPitch(window, project->sampleRate);
    if (p.voiced) pitches.push_back(p);
  }
  if (!pitches.empty()) {
    float minFreq = pitches[0].frequency;
    float maxFreq = pitches[0].frequency;
    float sumConf = 0.0f;
    for (const auto& p : pitches) {
      minFreq = std::min(minFreq, p.frequency);
      maxFreq = std::max(maxFreq, p.frequency);
      sumConf += p.confidence;
    }
    project->pitchStability = sumConf / pitches.size();
    auto freqToNote = [](float f) -> std::string {
      if (!(f > 0.0f) || !std::isfinite(f)) return "?";
      int midi = static_cast<int>(
          std::round(69.0 + 12.0 * std::log2(f / 440.0)));
      const char* names[] = {
        "C","C#","D","D#","E","F","F#","G","G#","A","A#","B"
      };
      int noteIndex = ((midi % 12) + 12) % 12;
      int octave = midi / 12 - 1;
      return std::string(names[noteIndex]) + std::to_string(octave);
    };
    project->vocalRange = freqToNote(minFreq) + "-" + freqToNote(maxFreq);
  }
  project->hasAnalysis = true;
  return 0;
}

float surge_engine_get_bpm(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->bpm : 0.0f;
}

float surge_engine_get_bpm_confidence(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->bpmConfidence : 0.0f;
}

const char* surge_engine_get_key(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->key.c_str() : "";
}

const char* surge_engine_get_scale(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->scale.c_str() : "";
}

float surge_engine_get_key_confidence(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->keyConfidence : 0.0f;
}

const char* surge_engine_get_mood(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->mood.c_str() : "";
}

float surge_engine_get_mood_confidence(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->moodConfidence : 0.0f;
}

const char* surge_engine_get_vocal_range(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->vocalRange.c_str() : "";
}

float surge_engine_get_pitch_stability(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->pitchStability : 0.0f;
}

int surge_engine_generate_music(SurgeProjectHandle project,
                                const char* style, const char* key, const char* scale,
                                float bpm, float duration, unsigned int seed) {
  if (!surge_engine_is_valid_project(project) || bpm <= 0.0f || duration <= 0.0f) return -1;
  project->tracks.clear();
  (void)ArrangementEngine::generateArrangement(
      duration, style ? style : "Pop", seed);
  const float beatDur = 60.0f / bpm;

  Track drums;
  drums.name = "Drums";
  auto drumPattern = DrumEngine::generatePattern(
      style ? style : "Pop", seed);
  drums.samples = DrumEngine::renderPattern(
      drumPattern, project->sampleRate, bpm, duration);
  project->tracks.push_back(drums);

  auto chords = ChordEngine::generateProgression(
      key ? key : "C", scale ? scale : "major", 8, seed);

  Track bass;
  std::vector<Synthesizer::Note> bassNotes;
  for (size_t i = 0; i < chords.size(); ++i) {
    auto freqs = ChordEngine::chordToFrequencies(chords[i], 48);
    if (!freqs.empty()) {
      bassNotes.push_back({
        freqs[0] * 0.5f, 0.8f,
        i * beatDur * 2.0f, beatDur * 2.0f
      });
    }
  }
  bass.name = "Bass";
  bass.samples = Synthesizer::render(
      bassNotes, project->sampleRate, Waveform::Saw, duration);
  project->tracks.push_back(bass);

  Track pad;
  std::vector<Synthesizer::Note> padNotes;
  for (size_t i = 0; i < chords.size(); ++i) {
    auto freqs = ChordEngine::chordToFrequencies(chords[i], 60);
    for (float f : freqs) {
      padNotes.push_back({
        f, 0.4f, i * beatDur * 2.0f, beatDur * 2.0f
      });
    }
  }
  pad.name = "Pad";
  pad.samples = Synthesizer::render(
      padNotes, project->sampleRate, Waveform::Triangle, duration);
  project->tracks.push_back(pad);

  Track lead;
  std::vector<Synthesizer::Note> leadNotes;
  for (size_t i = 0; i < chords.size(); ++i) {
    auto freqs = ChordEngine::chordToFrequencies(chords[i], 72);
    if (!freqs.empty()) {
      leadNotes.push_back({
        freqs[0], 0.5f,
        i * beatDur * 2.0f + beatDur * 0.5f,
        beatDur
      });
    }
  }
  lead.name = "Lead";
  lead.samples = Synthesizer::render(
      leadNotes, project->sampleRate, Waveform::Sine, duration);
  project->tracks.push_back(lead);

  if (style && std::string(style).find("Indian") != std::string::npos) {
    Track tabla;
    tabla.name = "Tabla (Synthesized)";
    tabla.samples = drums.samples;
    for (auto& s : tabla.samples) s *= 0.8f;
    project->tracks.push_back(tabla);

    Track sitar;
    sitar.name = "Sitar (Synthesized)";
    std::vector<Synthesizer::Note> sitarNotes;
    for (size_t i = 0; i < chords.size(); ++i) {
      auto freqs = ChordEngine::chordToFrequencies(chords[i], 64);
      for (float f : freqs) {
        sitarNotes.push_back({
          f, 0.35f, i * beatDur * 2.0f, beatDur * 1.5f
        });
      }
    }
    sitar.samples = Synthesizer::render(
        sitarNotes, project->sampleRate, Waveform::Saw, duration);
    project->tracks.push_back(sitar);
  }

  return 0;
}

int surge_engine_master(SurgeProjectHandle project, const char* preset,
                        float intensity, float brightness, float stereoWidth) {
  if (!surge_engine_is_valid_project(project)) return -1;
  MasteringSettings settings;
  settings.intensity = intensity;
  settings.brightness = brightness;
  settings.stereoWidth = stereoWidth;
  if (preset) {
    std::string p = preset;
    if (p == "Natural") settings.preset = MasteringPreset::Natural;
    else if (p == "Streaming") settings.preset = MasteringPreset::Streaming;
    else if (p == "Loud") settings.preset = MasteringPreset::Loud;
    else if (p == "Warm") settings.preset = MasteringPreset::Warm;
    else if (p == "Bright") settings.preset = MasteringPreset::Bright;
    else if (p == "Cinematic") settings.preset = MasteringPreset::Cinematic;
  }
  project->masteringSettings = settings;
  project->hasMastering = true;
  return 0;
}

int surge_engine_set_track_volume(SurgeProjectHandle project, int trackIndex, float volume) {
  if (!surge_engine_is_valid_project(project) || trackIndex < 0 ||
      trackIndex >= static_cast<int>(project->tracks.size())) return -1;
  project->tracks[trackIndex].volume = std::clamp(volume, 0.0f, 2.0f);
  return 0;
}

int surge_engine_set_track_mute(SurgeProjectHandle project, int trackIndex, int mute) {
  if (!surge_engine_is_valid_project(project) || trackIndex < 0 ||
      trackIndex >= static_cast<int>(project->tracks.size())) return -1;
  project->tracks[trackIndex].mute = (mute != 0);
  return 0;
}

int surge_engine_set_track_solo(SurgeProjectHandle project, int trackIndex, int solo) {
  if (!surge_engine_is_valid_project(project) || trackIndex < 0 ||
      trackIndex >= static_cast<int>(project->tracks.size())) return -1;
  project->tracks[trackIndex].solo = (solo != 0);
  return 0;
}

int surge_engine_remove_instrument(SurgeProjectHandle project, int trackIndex) {
  if (!surge_engine_is_valid_project(project) || trackIndex < 0 ||
      trackIndex >= static_cast<int>(project->tracks.size())) return -1;
  project->tracks.erase(project->tracks.begin() + trackIndex);
  return 0;
}

int surge_engine_add_instrument(SurgeProjectHandle project, const char* name) {
  if (!surge_engine_is_valid_project(project) || !name) return -1;
  Track t;
  t.name = name;
  project->tracks.push_back(t);
  return 0;
}

int surge_engine_replace_instrument(SurgeProjectHandle project,
                                    int trackIndex, const char* name) {
  if (!surge_engine_is_valid_project(project) || trackIndex < 0 ||
      trackIndex >= static_cast<int>(project->tracks.size()) || !name) return -1;
  project->tracks[trackIndex].name = name;
  return 0;
}

int surge_engine_mix_preview(SurgeProjectHandle project,
                             float** buffer, size_t* length) {
  if (!surge_engine_is_valid_project(project) || !buffer || !length) return -1;
  bool anySolo = false;
  for (const auto& t : project->tracks) if (t.solo) anySolo = true;
  size_t maxLen = project->cleanedAudio.size();
  for (const auto& t : project->tracks)
    maxLen = std::max(maxLen, t.samples.size());
  static std::vector<float> mixBuffer;
  mixBuffer.assign(maxLen, 0.0f);
  if (!project->cleanedAudio.empty()) {
    for (size_t i = 0; i < project->cleanedAudio.size() && i < maxLen; ++i)
      mixBuffer[i] += project->cleanedAudio[i] * 0.8f;
  }
  for (const auto& t : project->tracks) {
    if (t.mute) continue;
    if (anySolo && !t.solo) continue;
    for (size_t i = 0; i < t.samples.size() && i < maxLen; ++i)
      mixBuffer[i] += t.samples[i] * t.volume;
  }
  if (project->hasMastering)
    mixBuffer = MasteringProcessor::process(
        mixBuffer, project->sampleRate, project->masteringSettings);
  float maxVal = 0.0f;
  for (float s : mixBuffer) maxVal = std::max(maxVal, std::abs(s));
  if (maxVal > 1.0f)
    for (auto& s : mixBuffer) s /= maxVal;
  *buffer = mixBuffer.data();
  *length = mixBuffer.size();
  return 0;
}

int surge_engine_export_wav(SurgeProjectHandle project,
                            const char* path, int bitsPerSample) {
  if (!surge_engine_is_valid_project(project) || !path) return -1;
  float* buffer = nullptr;
  size_t length = 0;
  if (surge_engine_mix_preview(project, &buffer, &length) != 0) return -1;
  if (!buffer || length == 0) return -1;
  std::vector<float> samples(buffer, buffer + length);
  return WavCodec::save(
      path, samples,
      static_cast<uint32_t>(project->sampleRate),
      static_cast<uint16_t>(bitsPerSample)) ? 0 : -1;
}

const char* surge_engine_get_project_name(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->name.c_str() : "";
}

const char* surge_engine_get_project_path(SurgeProjectHandle project) {
  return surge_engine_is_valid_project(project) ? project->path.c_str() : "";
}

} // extern "C"
