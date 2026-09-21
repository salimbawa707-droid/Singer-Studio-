#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

enum class MasteringPreset { Natural, Streaming, Loud, Warm, Bright, Cinematic };

struct MasteringSettings {
  MasteringPreset preset = MasteringPreset::Natural;
  float intensity = 0.5f;
  float brightness = 0.5f;
  float stereoWidth = 0.5f;
};

class MasteringProcessor {
public:
  static std::vector<float> process(const std::vector<float>& input, float sampleRate, const MasteringSettings& settings);
};

} }
