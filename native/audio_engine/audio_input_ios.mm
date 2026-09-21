#include "audio_input.h"
#import <AVFoundation/AVFoundation.h>
#include <vector>
#include <mutex>

static AVAudioEngine* audioEngine = nil;
static AVAudioInputNode* inputNode = nil;
static std::vector<float>* outputBuffer = nullptr;
static std::mutex bufferMutex;
static bool recordingActive = false;

namespace musicbase {
namespace audio {

bool initAudioInput() {
  if (audioEngine && inputNode) return true;
  audioEngine = [[AVAudioEngine alloc] init];
  inputNode = [audioEngine inputNode];
  if (!inputNode) {
    audioEngine = nil;
    return false;
  }
  return true;
}

void shutdownAudioInput() {
  recordingActive = false;
  if (inputNode) {
    [inputNode removeTapOnBus:0];
  }
  if (audioEngine && audioEngine.isRunning) {
    [audioEngine stop];
  }
  inputNode = nil;
  audioEngine = nil;
  outputBuffer = nullptr;
}

bool startRecording(
    std::vector<float>& buffer,
    uint32_t sampleRate,
    uint16_t channels) {
  if (!audioEngine || !inputNode || recordingActive) return false;
  if (channels != 1) return false;
  AVAudioFormat* format =
      [inputNode outputFormatForBus:0];
  if (!format || format.channelCount == 0) return false;
  // The native engine stores mono. If the hardware input is stereo,
  // only channel 0 is used intentionally for deterministic mono capture.
  buffer.clear();
  outputBuffer = &buffer;
  [inputNode removeTapOnBus:0];
  __weak AVAudioEngine* weakEngine = audioEngine;
  [inputNode installTapOnBus:0
      bufferSize:4096
      format:format
      block:^(AVAudioPCMBuffer* pcmBuffer, AVAudioTime*) {
        if (!recordingActive || !outputBuffer || !pcmBuffer.floatChannelData)
          return;
        std::lock_guard<std::mutex> lock(bufferMutex);
        AVAudioChannelCount channelCount = pcmBuffer.format.channelCount;
        AVAudioFrameCount frameLength = pcmBuffer.frameLength;
        if (channelCount == 0) return;
        float* channel0 = pcmBuffer.floatChannelData[0];
        for (AVAudioFrameCount i = 0; i < frameLength; ++i) {
          outputBuffer->push_back(channel0[i]);
        }
      }];
  (void)sampleRate;
  (void)weakEngine;
  NSError* error = nil;
  [audioEngine prepare];
  if (![audioEngine startAndReturnError:&error]) {
    [inputNode removeTapOnBus:0];
    outputBuffer = nullptr;
    return false;
  }
  recordingActive = true;
  return true;
}

bool stopRecording() {
  if (!audioEngine || !inputNode || !recordingActive)
    return false;
  recordingActive = false;
  if (audioEngine.isRunning) {
    [audioEngine stop];
  }
  [inputNode removeTapOnBus:0];
  outputBuffer = nullptr;
  return true;
}

bool isRecording() {
  return recordingActive && audioEngine && audioEngine.isRunning;
}

} // namespace audio
} // namespace musicbase
