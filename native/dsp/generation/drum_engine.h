#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

struct DrumHit {
  float time;
  int drum; // 0=kick, 1=snare, 2=hihat
  float velocity;
};

class DrumEngine {
public:
  static std::vector<DrumHit> generatePattern(const std::string& style, unsigned int seed);
  static std::vector<float> renderPattern(const std::vector<DrumHit>& pattern, float sampleRate, float bpm, float duration);
};

} }
