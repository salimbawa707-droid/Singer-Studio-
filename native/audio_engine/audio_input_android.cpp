#include "audio_input.h"
#include <SLES/OpenSLES.h>
#include <SLES/OpenSLES_Android.h>
#include <vector>
#include <mutex>
#include <algorithm>
#include <cstdint>

namespace musicbase {
namespace audio {

static SLObjectItf engineObj = nullptr;
static SLEngineItf engine = nullptr;
static SLObjectItf recorderObj = nullptr;
static SLRecordItf recorder = nullptr;
static SLAndroidSimpleBufferQueueItf bufferQueue = nullptr;
static std::vector<float>* outputBuffer = nullptr;
static std::mutex bufferMutex;
static bool recordingActive = false;
static constexpr int BUFFER_FRAMES = 1024;
static std::vector<int16_t> tempBuffer;

static void recorderCallback(SLAndroidSimpleBufferQueueItf bq, void*) {
  std::lock_guard<std::mutex> lock(bufferMutex);
  if (!recordingActive || !outputBuffer || tempBuffer.empty()) return;
  for (int16_t sample : tempBuffer) {
    outputBuffer->push_back(
        static_cast<float>(sample) / 32768.0f);
  }
  if (recordingActive && bq) {
    (*bq)->Enqueue(
        bq, tempBuffer.data(),
        static_cast<SLuint32>(tempBuffer.size() * sizeof(int16_t)));
  }
}

bool initAudioInput() {
  if (engineObj && engine) return true;
  SLresult res = slCreateEngine(
      &engineObj, 0, nullptr, 0, nullptr, nullptr);
  if (res != SL_RESULT_SUCCESS) {
    engineObj = nullptr;
    return false;
  }
  res = (*engineObj)->Realize(engineObj, SL_BOOLEAN_FALSE);
  if (res != SL_RESULT_SUCCESS) {
    (*engineObj)->Destroy(engineObj);
    engineObj = nullptr;
    return false;
  }
  res = (*engineObj)->GetInterface(
      engineObj, SL_IID_ENGINE, &engine);
  if (res != SL_RESULT_SUCCESS) {
    (*engineObj)->Destroy(engineObj);
    engineObj = nullptr;
    engine = nullptr;
    return false;
  }
  return true;
}

void shutdownAudioInput() {
  recordingActive = false;
  outputBuffer = nullptr;
  if (recorderObj) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
  }
  recorder = nullptr;
  bufferQueue = nullptr;
  if (engineObj) {
    (*engineObj)->Destroy(engineObj);
    engineObj = nullptr;
  }
  engine = nullptr;
  tempBuffer.clear();
}

bool startRecording(
    std::vector<float>& buffer,
    uint32_t sampleRate,
    uint16_t channels) {
  if (!engine || recordingActive) return false;
  if (channels != 1 || sampleRate == 0) return false;
  buffer.clear();
  outputBuffer = &buffer;
  tempBuffer.assign(BUFFER_FRAMES, 0);

  // Android recording source: audio input device.
  SLDataLocator_IODevice deviceLocator = {
    SL_DATALOCATOR_IODEVICE,
    SL_IODEVICE_AUDIOINPUT,
    SL_DEFAULTDEVICEID_AUDIOINPUT,
    nullptr
  };
  SLDataSource audioSrc = {
    &deviceLocator,
    nullptr
  };

  // Recorder sink: Android simple buffer queue.
  SLDataLocator_AndroidSimpleBufferQueue queueLocator = {
    SL_DATALOCATOR_ANDROIDSIMPLEBUFFERQUEUE,
    2
  };
  SLDataFormat_PCM formatPcm = {
    SL_DATAFORMAT_PCM,
    1,
    static_cast<SLuint32>(sampleRate * 1000),
    SL_PCMSAMPLEFORMAT_FIXED_16,
    SL_PCMSAMPLEFORMAT_FIXED_16,
    SL_SPEAKER_FRONT_CENTER,
    SL_BYTEORDER_LITTLEENDIAN
  };
  SLDataSink audioSink = {
    &queueLocator,
    &formatPcm
  };

  const SLInterfaceID ids[] = {SL_IID_ANDROIDSIMPLEBUFFERQUEUE};
  const SLboolean req[] = {SL_BOOLEAN_TRUE};

  SLresult res = (*engine)->CreateAudioRecorder(
      engine, &recorderObj, &audioSrc, &audioSink,
      1, ids, req);
  if (res != SL_RESULT_SUCCESS) {
    outputBuffer = nullptr;
    return false;
  }

  res = (*recorderObj)->Realize(recorderObj, SL_BOOLEAN_FALSE);
  if (res != SL_RESULT_SUCCESS) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  res = (*recorderObj)->GetInterface(
      recorderObj, SL_IID_RECORD, &recorder);
  if (res != SL_RESULT_SUCCESS) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    recorder = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  res = (*recorderObj)->GetInterface(
      recorderObj, SL_IID_ANDROIDSIMPLEBUFFERQUEUE, &bufferQueue);
  if (res != SL_RESULT_SUCCESS) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    recorder = nullptr;
    bufferQueue = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  res = (*bufferQueue)->RegisterCallback(
      bufferQueue, recorderCallback, nullptr);
  if (res != SL_RESULT_SUCCESS) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    recorder = nullptr;
    bufferQueue = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  res = (*bufferQueue)->Enqueue(
      bufferQueue, tempBuffer.data(),
      static_cast<SLuint32>(tempBuffer.size() * sizeof(int16_t)));
  if (res != SL_RESULT_SUCCESS) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    recorder = nullptr;
    bufferQueue = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  recordingActive = true;
  res = (*recorder)->SetRecordState(
      recorder, SL_RECORDSTATE_RECORDING);
  if (res != SL_RESULT_SUCCESS) {
    recordingActive = false;
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
    recorder = nullptr;
    bufferQueue = nullptr;
    outputBuffer = nullptr;
    return false;
  }

  return true;
}

bool stopRecording() {
  if (!recorder || !recordingActive) return false;
  recordingActive = false;
  (*recorder)->SetRecordState(
      recorder, SL_RECORDSTATE_STOPPED);
  // Destroying the recorder stops callbacks and releases the queue.
  if (recorderObj) {
    (*recorderObj)->Destroy(recorderObj);
    recorderObj = nullptr;
  }
  recorder = nullptr;
  bufferQueue = nullptr;
  outputBuffer = nullptr;
  return true;
}

bool isRecording() {
  return recordingActive;
}

} // namespace audio
} // namespace musicbase
