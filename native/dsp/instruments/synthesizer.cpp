#include "synthesizer.h"
#include <cmath>

namespace musicbase { namespace dsp {

std::vector<float> Synthesizer::render(const std::vector<Note>& notes, float sampleRate, Waveform waveform, float totalDuration) {
  size_t samples = static_cast<size_t>(totalDuration * sampleRate);
  std::vector<float> out(samples, 0.0f);

  for (const auto& note : notes) {
    size_t start = static_cast<size_t>(note.startTime * sampleRate);
    size_t len = static_cast<size_t>(note.duration * sampleRate);
    float phase = 0.0f;
    for (size_t i = 0; i < len && start + i < samples; i++) {
      float t = i / sampleRate;
      float env = 1.0f;
      if (t < 0.05f) env = t / 0.05f;
      if (t > note.duration - 0.05f) env = (note.duration - t) / 0.05f;
      env = std::clamp(env, 0.0f, 1.0f);
      float sample = 0.0f;
      float inc = note.frequency / sampleRate;
      switch (waveform) {
      case Waveform::Sine:
        sample = std::sin(2.0f * 3.14159265f * phase);
        break;
      case Waveform::Saw:
        sample = 2.0f * (phase - std::floor(phase + 0.5f));
        break;
      case Waveform::Square:
        sample = (phase < 0.5f) ? 1.0f : -1.0f;
        break;
      case Waveform::Triangle:
        sample = 4.0f * std::abs(phase - std::floor(phase + 0.75f) + 0.25f) - 1.0f;
        break;
      }
      phase += inc;
      if (phase >= 1.0f) phase -= 1.0f;
      out[start + i] += sample * env * note.velocity;
    }
  }
  float peak = 0.0001f;
  for (float s : out) peak = std::max(peak, std::abs(s));
  for (auto& s : out) s *= 0.9f / peak;
  return out;
}

} }
