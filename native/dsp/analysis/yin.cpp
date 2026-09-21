#include "yin.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

PitchResult YIN::detectPitch(const std::vector<float>& buffer, float sampleRate) {
  size_t n = buffer.size();
  if (n < 512) return {0, 0, false};
  size_t tauMax = n / 2;
  std::vector<float> diff(tauMax, 0.0f);

  for (size_t tau = 1; tau < tauMax; tau++) {
    float sum = 0;
    for (size_t i = 0; i < tauMax; i++) {
      float d = buffer[i] - buffer[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  std::vector<float> cmndf(tauMax);
  cmndf[0] = 1.0f;
  float runningSum = 0;
  for (size_t tau = 1; tau < tauMax; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] * tau / runningSum;
  }

  float threshold = 0.1f;
  size_t bestTau = 0;
  for (size_t tau = 2; tau < tauMax; tau++) {
    if (cmndf[tau] < threshold) {
      bestTau = tau;
      break;
    }
  }

  if (bestTau == 0) return {0, 0, false};
  float y1 = cmndf[bestTau - 1], y2 = cmndf[bestTau], y3 = cmndf[bestTau + 1];
  float p = 0.5f * (y1 - y3) / (y1 - 2.0f * y2 + y3);
  float tauInterp = bestTau + p;
  float freq = sampleRate / tauInterp;
  float conf = 1.0f - std::min(y2, 1.0f);
  return {freq, conf, freq > 50.0f && freq < 2000.0f};
}

} }
