#include "noise_reducer.h"
#include <cmath>
#include <algorithm>

namespace musicbase { namespace dsp {

std::vector<float> NoiseReducer::reduce(const std::vector<float>& input, float amount) {
  std::vector<float> out = input;
  float threshold = amount * 0.05f;
  for (auto& s : out) {
    if (std::abs(s) < threshold) s *= 0.1f;
  }
  return out;
}

} }
