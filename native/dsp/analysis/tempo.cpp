#include "tempo.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

TempoResult TempoDetector::detect(const std::vector<float>& samples, float sampleRate) {
  size_t hop = static_cast<size_t>(sampleRate * 0.01f);
  size_t frames = samples.size() / hop;
  if (frames < 10) return {120.0f, 0.0f};

  std::vector<float> energy(frames);
  for (size_t i = 0; i < frames; i++) {
    float sum = 0;
    size_t start = i * hop;
    size_t end = std::min(start + hop, samples.size());
    for (size_t j = start; j < end; j++) sum += std::abs(samples[j]);
    energy[i] = sum / (end - start);
  }

  size_t maxLag = static_cast<size_t>(sampleRate * 2.0f / hop);
  size_t minLag = static_cast<size_t>(sampleRate * 0.25f / hop);
  float bestVal = 0;
  size_t bestLag = minLag;

  for (size_t lag = minLag; lag < maxLag && lag < energy.size(); lag++) {
    float corr = 0;
    for (size_t i = 0; i + lag < energy.size(); i++) {
      corr += energy[i] * energy[i + lag];
    }
    if (corr > bestVal) {
      bestVal = corr;
      bestLag = lag;
    }
  }

  float bpm = 60.0f / (bestLag * hop / sampleRate);
  if (bpm < 60) bpm *= 2;
  if (bpm > 200) bpm /= 2;
  return {bpm, 0.7f};
}

} }
