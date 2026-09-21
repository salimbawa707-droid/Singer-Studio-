#include "arrangement_engine.h"
#include <random>
#include <algorithm>

namespace musicbase { namespace dsp {

std::vector<Section> ArrangementEngine::generateArrangement(float totalDuration, const std::string& style, unsigned int seed) {
  std::vector<Section> arrangement;
  std::mt19937 rng(seed);
  bool isIndian = (style.find("Indian") != std::string::npos);
  float pos = 0.0f;
  if (totalDuration < 30.0f) {
    float intro = 4.0f;
    float verse = (totalDuration - intro - 8.0f - 4.0f) * 0.5f;
    float chorus = 8.0f;
    float outro = totalDuration - intro - verse - chorus;
    arrangement.push_back({SectionType::Intro, pos, intro}); pos += intro;
    arrangement.push_back({SectionType::Verse, pos, verse}); pos += verse;
    arrangement.push_back({SectionType::Chorus, pos, chorus}); pos += chorus;
    arrangement.push_back({SectionType::Outro, pos, outro});
  } else {
    float intro = 8.0f;
    float verse1 = 16.0f;
    float preChorus = isIndian ? 0.0f : 8.0f;
    float chorus1 = 16.0f;
    float verse2 = 16.0f;
    float chorus2 = 16.0f;
    float bridge = isIndian ? 0.0f : 8.0f;
    float finalChorus = 16.0f;
    float outro = totalDuration - intro - verse1 - preChorus - chorus1 - verse2 - chorus2 - bridge - finalChorus;
    if (outro < 4.0f) outro = 4.0f;
    arrangement.push_back({SectionType::Intro, pos, intro}); pos += intro;
    arrangement.push_back({SectionType::Verse, pos, verse1}); pos += verse1;
    if (preChorus > 0) { arrangement.push_back({SectionType::PreChorus, pos, preChorus}); pos += preChorus; }
    arrangement.push_back({SectionType::Chorus, pos, chorus1}); pos += chorus1;
    arrangement.push_back({SectionType::Verse, pos, verse2}); pos += verse2;
    arrangement.push_back({SectionType::Chorus, pos, chorus2}); pos += chorus2;
    if (bridge > 0) { arrangement.push_back({SectionType::Bridge, pos, bridge}); pos += bridge; }
    arrangement.push_back({SectionType::Chorus, pos, finalChorus}); pos += finalChorus;
    arrangement.push_back({SectionType::Outro, pos, outro});
  }
  return arrangement;
}

std::string ArrangementEngine::sectionName(SectionType type) {
  switch (type) {
  case SectionType::Intro: return "Intro";
  case SectionType::Verse: return "Verse";
  case SectionType::PreChorus: return "Pre-Chorus";
  case SectionType::Chorus: return "Chorus";
  case SectionType::Instrumental: return "Instrumental";
  case SectionType::Bridge: return "Bridge";
  case SectionType::Outro: return "Outro";
  }
  return "Unknown";
}

} }
