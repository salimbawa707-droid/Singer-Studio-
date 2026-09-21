#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

class ChordEngine {
public:
  static std::vector<std::string> generateProgression(const std::string& key, const std::string& scale, int bars, unsigned int seed);
  static std::vector<float> chordToFrequencies(const std::string& chord, int baseMidi);
};

} }
