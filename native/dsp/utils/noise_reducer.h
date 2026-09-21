#pragma once
#include <vector>

namespace musicbase { namespace dsp {

class NoiseReducer {
public:
  static std::vector<float> reduce(const std::vector<float>& input, float amount);
};

} }
