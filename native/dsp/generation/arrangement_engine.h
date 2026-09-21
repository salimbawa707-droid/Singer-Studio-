#pragma once
#include <vector>
#include <string>

namespace musicbase { namespace dsp {

enum class SectionType { Intro, Verse, PreChorus, Chorus, Instrumental, Bridge, Outro };

struct Section {
  SectionType type;
  float startTime;
  float duration;
};

class ArrangementEngine {
public:
  static std::vector<Section> generateArrangement(float totalDuration, const std::string& style, unsigned int seed);
  static std::string sectionName(SectionType type);
};

} }
