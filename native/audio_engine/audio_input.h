#pragma once
#include <vector>
#include <cstdint>

namespace musicbase {
namespace audio {

bool initAudioInput();
void shutdownAudioInput();
bool startRecording(std::vector<float>& buffer, uint32_t sampleRate, uint16_t channels);
bool stopRecording();
bool isRecording();

} // namespace audio
} // namespace musicbase
