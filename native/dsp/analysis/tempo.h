#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

struct TempoResult {
  float bpm = 120.0f;
  float confidence = 0.0f;
};

class TempoDetector {
public:
  static TempoResult detect(const std::vector<float>& samples, float sampleRate);
};

} }
