#pragma once
#include <vector>

namespace musicbase { namespace dsp {

struct PitchResult {
  float frequency = 0.0f;
  float confidence = 0.0f;
  bool voiced = false;
};

class YIN {
public:
  static PitchResult detectPitch(const std::vector<float>& buffer, float sampleRate);
};

} }
