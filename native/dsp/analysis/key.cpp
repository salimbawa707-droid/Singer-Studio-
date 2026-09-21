#include "key.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

KeyResult KeyDetector::detect(const std::vector<float>& samples, float sampleRate) {
  size_t fftSize = 4096;
  size_t hop = 1024;
  float chroma[12] = {0};
  size_t frames = 0;

  for (size_t i = 0; i + fftSize < samples.size(); i += hop) {
    float localMax = 0.0001f;
    for (size_t j = 0; j < fftSize; j++) localMax = std::max(localMax, std::abs(samples[i+j]));
    for (size_t j = 0; j < fftSize; j++) {
      float s = samples[i+j] / localMax;
      if (s > 0.5f) {
        int pc = static_cast<int>(std::fmod(std::log2(localMax + 100.0f) * 12.0f, 12));
        if (pc >= 0 && pc < 12) chroma[pc] += s;
      }
    }
    frames++;
  }

  if (frames == 0) return {"C", "major", 0.0f};
  int maxPC = 0;
  for (int i = 1; i < 12; i++) if (chroma[i] > chroma[maxPC]) maxPC = i;
  const char* names[] = {"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};
  return {names[maxPC], "major", 0.6f};
}

} }
