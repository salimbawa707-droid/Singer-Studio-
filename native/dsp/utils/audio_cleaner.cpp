#include "audio_cleaner.h"
#include "noise_reducer.h"
#include "../filters/filter.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

std::vector<float> AudioCleaner::clean(const std::vector<float>& input, float sampleRate, const CleaningSettings& settings) {
  std::vector<float> out = input;
  if (settings.humRemoval > 0.01f) {
    Filter hpf(FilterType::HighPass, sampleRate, 80.0f);
    hpf.processBlock(out);
  }
  if (settings.deEsser > 0.01f) {
    Filter deess(FilterType::LowPass, sampleRate, 8000.0f);
    for (size_t i = 0; i < out.size(); i++) {
      float orig = out[i];
      out[i] = deess.process(out[i]);
      out[i] = orig * (1.0f - settings.deEsser) + out[i] * settings.deEsser;
    }
  }
  if (settings.noiseReduction > 0.01f) {
    out = NoiseReducer::reduce(out, settings.noiseReduction);
  }
  if (settings.compression > 0.01f) {
    float threshold = 1.0f - settings.compression * 0.5f;
    for (auto& s : out) {
      if (s > threshold) s = threshold + (s - threshold) * 0.3f;
      if (s < -threshold) s = -threshold + (s + threshold) * 0.3f;
    }
  }
  float peak = 0.0001f;
  for (float s : out) peak = std::max(peak, std::abs(s));
  float target = 0.9f;
  for (auto& s : out) s *= target / peak;
  return out;
}

} }
