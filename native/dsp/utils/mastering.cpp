#include "mastering.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

std::vector<float> MasteringProcessor::process(const std::vector<float>& input, float sampleRate, const MasteringSettings& settings) {
  std::vector<float> out = input;
  float threshold = 1.0f - settings.intensity * 0.3f;
  for (auto& s : out) {
    if (s > threshold) s = threshold + std::tanh(s - threshold) * 0.1f;
    if (s < -threshold) s = -threshold - std::tanh(-s - threshold) * 0.1f;
  }
  float gain = 1.0f + settings.brightness * 0.2f;
  for (auto& s : out) s *= gain;
  float peak = 0.0001f;
  for (float s : out) peak = std::max(peak, std::abs(s));
  if (peak > 1.0f) {
    for (auto& s : out) s /= peak;
  }
  return out;
}

} }
