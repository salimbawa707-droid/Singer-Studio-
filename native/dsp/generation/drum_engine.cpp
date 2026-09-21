#include "drum_engine.h"
#include <random>
#include <cmath>

namespace musicbase { namespace dsp {

std::vector<DrumHit> DrumEngine::generatePattern(const std::string& style, unsigned int seed) {
  std::mt19937 rng(seed);
  std::vector<DrumHit> hits;
  float beatDur = 0.5f;
  for (int i = 0; i < 16; i++) {
    float t = i * beatDur;
    if (i % 4 == 0) hits.push_back({t, 0, 0.9f});
    if (i % 8 == 4) hits.push_back({t, 1, 0.8f});
    hits.push_back({t, 2, 0.5f + (rng() % 100) / 200.0f});
  }
  return hits;
}

std::vector<float> DrumEngine::renderPattern(const std::vector<DrumHit>& pattern, float sampleRate, float bpm, float duration) {
  size_t samples = static_cast<size_t>(duration * sampleRate);
  std::vector<float> out(samples, 0.0f);
  float beatDur = 60.0f / bpm;

  for (const auto& hit : pattern) {
    float t = hit.time * (120.0f / bpm) / 2.0f;
    size_t start = static_cast<size_t>(t * sampleRate);
    if (start >= samples) continue;
    if (hit.drum == 0) {
      for (size_t j = 0; j < 1000 && start + j < samples; j++) {
        float env = std::exp(-j / 200.0f);
        float freq = 150.0f * std::exp(-j / 400.0f);
        out[start + j] += std::sin(2.0f * 3.14159f * freq * j / sampleRate) * env * hit.velocity;
      }
    } else if (hit.drum == 1) {
      for (size_t j = 0; j < 800 && start + j < samples; j++) {
        float env = std::exp(-j / 150.0f);
        out[start + j] += ((rand() / float(RAND_MAX)) * 2.0f - 1.0f) * env * hit.velocity * 0.5f;
      }
    } else {
      for (size_t j = 0; j < 400 && start + j < samples; j++) {
        float env = std::exp(-j / 80.0f);
        out[start + j] += ((rand() / float(RAND_MAX)) * 2.0f - 1.0f) * env * hit.velocity * 0.3f;
      }
    }
  }
  return out;
}

} }
