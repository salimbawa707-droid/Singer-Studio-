#pragma once
#include <vector>
#include <string>
#include <cstdint>

namespace musicbase { namespace dsp {

struct WavInfo {
  uint32_t sampleRate;
  uint16_t numChannels;
  uint16_t bitsPerSample;
  uint32_t numSamples;
};

class WavCodec {
public:
  static bool load(const std::string& path, std::vector<float>& samples, WavInfo& info);
  static bool save(const std::string& path, const std::vector<float>& samples,
                   uint32_t sampleRate, uint16_t bitsPerSample = 16);
  static std::vector<float> convertToMono(const std::vector<float>& samples, uint16_t channels);
  static std::vector<float> convertToStereo(const std::vector<float>& samples);
};

} }
