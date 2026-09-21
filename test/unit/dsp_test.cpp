#include <iostream>
#include <vector>
#include <cmath>
#include <cassert>
#include <cstring>
#include "dsp/fft.h"
#include "dsp/analysis/yin.h"
#include "dsp/analysis/tempo.h"
#include "dsp/analysis/key.h"
#include "dsp/analysis/mood.h"
#include "dsp/utils/audio_cleaner.h"
#include "dsp/utils/mastering.h"
#include "dsp/utils/wav_codec.h"
#include "dsp/generation/chord_engine.h"
#include "dsp/generation/drum_engine.h"
#include "dsp/generation/arrangement_engine.h"
#include "dsp/instruments/synthesizer.h"
#include "audio_engine/include/audio_engine.h"

using namespace musicbase::dsp;

void test_fft() {
  std::vector<float> buf(8, 0.0f);
  buf[0] = 1.0f;
  FFT::realFFT(buf);
  std::cout << "FFT test: PASS" << std::endl;
}

void test_wav_codec() {
  std::vector<float> samples = {0.0f, 0.5f, -0.5f, 0.0f};
  WavCodec::save("/tmp/test.wav", samples, 44100, 16);
  std::vector<float> loaded;
  WavInfo info;
  bool ok = WavCodec::load("/tmp/test.wav", loaded, info);
  assert(ok);
  assert(info.sampleRate == 44100);
  std::cout << "WAV codec test: PASS" << std::endl;
}

void test_yin() {
  std::vector<float> sine(4410);
  for (size_t i = 0; i < sine.size(); i++) {
    sine[i] = std::sin(2.0f * 3.14159265f * 440.0f * i / 44100.0f);
  }
  auto result = YIN::detectPitch(sine, 44100.0f);
  assert(result.voiced);
  assert(std::abs(result.frequency - 440.0f) < 10.0f);
  std::cout << "YIN pitch test: PASS (freq=" << result.frequency << ")" << std::endl;
}

void test_tempo() {
  std::vector<float> beat(44100 * 2, 0.0f);
  for (int i = 0; i < 8; i++) {
    size_t start = i * 44100 * 60 / 120;
    for (size_t j = 0; j < 1000 && start + j < beat.size(); j++) {
      beat[start + j] = 0.8f;
    }
  }
  auto result = TempoDetector::detect(beat, 44100.0f);
  std::cout << "Tempo test: PASS (bpm=" << result.bpm << ")" << std::endl;
}

void test_audio_engine() {
  surge_engine_initialize();
  auto project = surge_engine_create_project("Test");
  assert(project != nullptr);
  auto name = surge_engine_get_project_name(project);
  assert(std::strcmp(name, "Test") == 0);
  surge_engine_free_project(project);
  surge_engine_dispose();
  std::cout << "Audio engine test: PASS" << std::endl;
}

void test_synthesizer() {
  std::vector<Note> notes = {{440.0f, 0.8f, 0.0f, 0.5f}};
  auto samples = Synthesizer::render(notes, 44100.0f, Waveform::Sine, 1.0f);
  assert(!samples.empty());
  std::cout << "Synthesizer test: PASS" << std::endl;
}

void test_chord_engine() {
  auto chords = ChordEngine::generateProgression("C", "major", 4, 42);
  assert(chords.size() == 4);
  auto freqs = ChordEngine::chordToFrequencies("I", 60);
  assert(freqs.size() == 3);
  std::cout << "Chord engine test: PASS" << std::endl;
}

void test_drum_engine() {
  auto pattern = DrumEngine::generatePattern("Pop", 42);
  assert(!pattern.empty());
  auto audio = DrumEngine::renderPattern(pattern, 44100.0f, 120.0f, 2.0f);
  assert(!audio.empty());
  std::cout << "Drum engine test: PASS" << std::endl;
}

void test_arrangement_engine() {
  auto sections = ArrangementEngine::generateArrangement(60.0f, "Pop", 42);
  assert(!sections.empty());
  std::cout << "Arrangement engine test: PASS" << std::endl;
}

void test_audio_cleaner() {
  std::vector<float> noise(44100, 0.0f);
  for (auto& s : noise) s = (rand() / float(RAND_MAX)) * 0.1f - 0.05f;
  CleaningSettings settings;
  auto cleaned = AudioCleaner::clean(noise, 44100.0f, settings);
  assert(cleaned.size() == noise.size());
  std::cout << "Audio cleaner test: PASS" << std::endl;
}

void test_mastering() {
  std::vector<float> audio(44100, 0.5f);
  MasteringSettings settings;
  auto mastered = MasteringProcessor::process(audio, 44100.0f, settings);
  assert(!mastered.empty());
  std::cout << "Mastering test: PASS" << std::endl;
}

int main() {
  std::cout << "=== MusicBase DSP Unit Tests ===" << std::endl;
  test_fft();
  test_wav_codec();
  test_yin();
  test_tempo();
  test_audio_engine();
  test_synthesizer();
  test_chord_engine();
  test_drum_engine();
  test_arrangement_engine();
  test_audio_cleaner();
  test_mastering();
  std::cout << "=== All tests passed ===" << std::endl;
  return 0;
}
