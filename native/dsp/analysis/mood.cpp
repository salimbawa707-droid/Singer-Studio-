#include "mood.h"
#include <cmath>
#include <numeric>

namespace musicbase { namespace dsp {

MoodResult MoodEngine::analyze(const std::vector<float>& samples, float sampleRate) {
  float mean = 0, energy = 0, zcr = 0;
  for (float s : samples) {
    mean += s;
    energy += s * s;
  }
  mean /= samples.size();
  for (size_t i = 1; i < samples.size(); i++) {
    if ((samples[i-1] - mean) * (samples[i] - mean) < 0) zcr++;
  }
  float zcrRate = zcr * sampleRate / samples.size();
  if (energy > 0.1f && zcrRate > 2000) return {"Energetic", 0.6f};
  if (energy < 0.01f) return {"Calm", 0.6f};
  if (zcrRate < 500) return {"Romantic", 0.5f};
  return {"Neutral", 0.7f};
}

} }
