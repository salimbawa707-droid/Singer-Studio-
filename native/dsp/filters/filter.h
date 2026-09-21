#pragma once
#include <vector>

namespace musicbase { namespace dsp {

enum class FilterType { LowPass, HighPass, BandPass, Notch };

class Filter {
public:
  Filter(FilterType type, float sampleRate, float freq, float q = 0.707f);
  float process(float input);
  void processBlock(std::vector<float>& buffer);
private:
  float a0, a1, a2, b0, b1, b2;
  float z1, z2;
};

} }
