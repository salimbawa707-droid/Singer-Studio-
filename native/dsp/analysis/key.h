#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

struct KeyResult {
  std::string key = "C";
  std::string scale = "major";
  float confidence = 0.0f;
};

class KeyDetector {
public:
  static KeyResult detect(const std::vector<float>& samples, float sampleRate);
};

} }
