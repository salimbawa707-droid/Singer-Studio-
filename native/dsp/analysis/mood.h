#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

struct MoodResult {
  std::string mood = "Neutral";
  float confidence = 0.0f;
};

class MoodEngine {
public:
  static MoodResult analyze(const std::vector<float>& samples, float sampleRate);
};

} }
