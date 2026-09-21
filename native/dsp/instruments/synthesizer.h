#pragma once
#include <vector>

namespace musicbase { namespace dsp {

enum class Waveform { Sine, Saw, Square, Triangle };

struct Note {
  float frequency;
  float velocity;
  float startTime;
  float duration;
};

class Synthesizer {
public:
  static std::vector<float> render(const std::vector<Note>& notes, float sampleRate, Waveform waveform, float totalDuration);
};

} }
