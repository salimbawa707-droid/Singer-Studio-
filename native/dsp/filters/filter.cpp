#include "filter.h"
#include <cmath>

namespace musicbase { namespace dsp {

Filter::Filter(FilterType type, float sampleRate, float freq, float q) : z1(0), z2(0) {
  float w0 = 2.0f * 3.14159265f * freq / sampleRate;
  float cosw0 = std::cos(w0);
  float sinw0 = std::sin(w0);
  float alpha = sinw0 / (2.0f * q);

  switch (type) {
  case FilterType::LowPass:
    b0 = (1.0f - cosw0) / 2.0f; b1 = 1.0f - cosw0; b2 = (1.0f - cosw0) / 2.0f;
    a0 = 1.0f + alpha; a1 = -2.0f * cosw0; a2 = 1.0f - alpha;
    break;
  case FilterType::HighPass:
    b0 = (1.0f + cosw0) / 2.0f; b1 = -(1.0f + cosw0); b2 = (1.0f + cosw0) / 2.0f;
    a0 = 1.0f + alpha; a1 = -2.0f * cosw0; a2 = 1.0f - alpha;
    break;
  default:
    b0 = b1 = b2 = a0 = a1 = a2 = 0; b0 = a0 = 1;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0; a0 = 1.0f;
}

float Filter::process(float input) {
  float output = b0 * input + b1 * z1 + b2 * z2 - a1 * z1 - a2 * z2;
  z2 = z1; z1 = input;
  return output;
}

void Filter::processBlock(std::vector<float>& buffer) {
  for (auto& s : buffer) s = process(s);
}

} }
