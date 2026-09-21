#include "wav_codec.h"
#include <cstdio>
#include <cstring>
#include <algorithm>

namespace musicbase { namespace dsp {

#pragma pack(push, 1)
struct WavHeader {
  char riff[4] = {'R','I','F','F'};
  uint32_t fileSize;
  char wave[4] = {'W','A','V','E'};
  char fmt[4] = {'f','m','t',' '};
  uint32_t fmtSize = 16;
  uint16_t audioFormat = 1;
  uint16_t numChannels;
  uint32_t sampleRate;
  uint32_t byteRate;
  uint16_t blockAlign;
  uint16_t bitsPerSample;
  char data[4] = {'d','a','t','a'};
  uint32_t dataSize;
};
#pragma pack(pop)

bool WavCodec::load(const std::string& path, std::vector<float>& samples, WavInfo& info) {
  FILE* f = fopen(path.c_str(), "rb");
  if (!f) return false;
  WavHeader header;
  if (fread(&header, sizeof(header), 1, f) != 1) { fclose(f); return false; }
  if (memcmp(header.riff, "RIFF", 4) != 0 || memcmp(header.wave, "WAVE", 4) != 0) {
    fclose(f); return false;
  }
  info.sampleRate = header.sampleRate;
  info.numChannels = header.numChannels;
  info.bitsPerSample = header.bitsPerSample;
  uint32_t numFrames = header.dataSize / (header.numChannels * header.bitsPerSample / 8);
  info.numSamples = numFrames;
  samples.resize(numFrames * header.numChannels);
  if (header.bitsPerSample == 16) {
    std::vector<int16_t> buffer(numFrames * header.numChannels);
    fread(buffer.data(), sizeof(int16_t), buffer.size(), f);
    for (size_t i = 0; i < buffer.size(); i++) {
      samples[i] = buffer[i] / 32768.0f;
    }
  } else if (header.bitsPerSample == 24) {
    std::vector<uint8_t> buffer(numFrames * header.numChannels * 3);
    fread(buffer.data(), 1, buffer.size(), f);
    for (size_t i = 0; i < numFrames * header.numChannels; i++) {
      int32_t val = (buffer[i*3] | (buffer[i*3+1] << 8) | (buffer[i*3+2] << 16));
      if (val & 0x800000) val |= ~0xFFFFFF;
      samples[i] = val / 8388608.0f;
    }
  } else if (header.bitsPerSample == 32) {
    fread(samples.data(), sizeof(float), samples.size(), f);
  } else {
    fclose(f); return false;
  }
  fclose(f);
  return true;
}

bool WavCodec::save(const std::string& path, const std::vector<float>& samples,
                    uint32_t sampleRate, uint16_t bitsPerSample) {
  FILE* f = fopen(path.c_str(), "wb");
  if (!f) return false;
  uint16_t channels = 1;
  uint32_t dataSize = static_cast<uint32_t>(samples.size() * channels * bitsPerSample / 8);
  WavHeader header;
  header.fileSize = 36 + dataSize;
  header.numChannels = channels;
  header.sampleRate = sampleRate;
  header.bitsPerSample = bitsPerSample;
  header.byteRate = sampleRate * channels * bitsPerSample / 8;
  header.blockAlign = channels * bitsPerSample / 8;
  header.dataSize = dataSize;
  fwrite(&header, sizeof(header), 1, f);
  if (bitsPerSample == 16) {
    for (float s : samples) {
      int16_t val = static_cast<int16_t>(std::clamp(s, -1.0f, 1.0f) * 32767.0f);
      fwrite(&val, sizeof(int16_t), 1, f);
    }
  } else if (bitsPerSample == 24) {
    for (float s : samples) {
      int32_t val = static_cast<int32_t>(std::clamp(s, -1.0f, 1.0f) * 8388607.0f);
      uint8_t bytes[3] = {
        static_cast<uint8_t>(val & 0xFF),
        static_cast<uint8_t>((val >> 8) & 0xFF),
        static_cast<uint8_t>((val >> 16) & 0xFF)
      };
      fwrite(bytes, 1, 3, f);
    }
  } else if (bitsPerSample == 32) {
    for (float s : samples) {
      float val = std::clamp(s, -1.0f, 1.0f);
      fwrite(&val, sizeof(float), 1, f);
    }
  }
  fclose(f);
  return true;
}

std::vector<float> WavCodec::convertToMono(const std::vector<float>& samples, uint16_t channels) {
  if (channels <= 1) return samples;
  size_t frames = samples.size() / channels;
  std::vector<float> mono(frames, 0.0f);
  for (size_t i = 0; i < frames; i++) {
    for (uint16_t c = 0; c < channels; c++) {
      mono[i] += samples[i * channels + c];
    }
    mono[i] /= channels;
  }
  return mono;
}

std::vector<float> WavCodec::convertToStereo(const std::vector<float>& samples) {
  std::vector<float> stereo(samples.size() * 2);
  for (size_t i = 0; i < samples.size(); i++) {
    stereo[i * 2] = samples[i];
    stereo[i * 2 + 1] = samples[i];
  }
  return stereo;
}

} }
