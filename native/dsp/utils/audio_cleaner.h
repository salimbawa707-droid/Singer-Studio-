#pragma once
#include <vector>

namespace musicbase { namespace dsp {

struct CleaningSettings {
  float noiseReduction = 0.5f;
  float humRemoval = 0.0f;
  float vocalPresence = 0.5f;
  float deEsser = 0.3f;
  float compression = 0.4f;
};

class AudioCleaner {
public:
  static std::vector<float> clean(const std::vector<float>& input, float sampleRate, const CleaningSettings& settings);
};

} }
