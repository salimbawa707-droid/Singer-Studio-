#include "chord_engine.h"
#include <cmath>
#include <random>

namespace musicbase { namespace dsp {

std::vector<std::string> ChordEngine::generateProgression(const std::string& key, const std::string& scale, int bars, unsigned int seed) {
  std::mt19937 rng(seed);
  std::vector<std::string> prog;
  std::vector<std::string> pool;
  if (scale == "minor") {
    pool = {"i", "iv", "v", "VI", "VII"};
  } else {
    pool = {"I", "IV", "V", "vi"};
  }
  for (int i = 0; i < bars; i++) {
    prog.push_back(pool[rng() % pool.size()]);
  }
  return prog;
}

std::vector<float> ChordEngine::chordToFrequencies(const std::string& chord, int baseMidi) {
  std::vector<int> intervals;
  if (chord == "I" || chord == "i") intervals = {0, 4, 7};
  else if (chord == "IV" || chord == "iv") intervals = {0, 5, 9};
  else if (chord == "V" || chord == "v") intervals = {0, 7, 11};
  else if (chord == "vi" || chord == "VI") intervals = {0, 4, 9};
  else if (chord == "VII") intervals = {0, 3, 7};
  else intervals = {0, 4, 7};

  std::vector<float> freqs;
  for (int interval : intervals) {
    float f = 440.0f * std::pow(2.0f, (baseMidi + interval - 69) / 12.0f);
    freqs.push_back(f);
  }
  return freqs;
}

} }
