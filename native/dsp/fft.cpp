#include "fft.h"
#include <cmath>

namespace musicbase { namespace dsp {

void FFT::realFFT(std::vector<float>& buffer, bool inverse) {
  size_t n = buffer.size();
  if (n < 2) return;
  std::vector<std::complex<float>> tmp(n);
  for (size_t i = 0; i < n; i++) tmp[i] = buffer[i];
  complexFFT(tmp, inverse);
  for (size_t i = 0; i < n; i++) buffer[i] = tmp[i].real();
}

void FFT::complexFFT(std::vector<std::complex<float>>& buffer, bool inverse) {
  size_t n = buffer.size();
  if (n < 2) return;
  size_t j = 0;
  for (size_t i = 1; i < n; i++) {
    size_t bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) std::swap(buffer[i], buffer[j]);
  }
  for (size_t len = 2; len <= n; len <<= 1) {
    float ang = 2 * 3.14159265358979f / len * (inverse ? -1 : 1);
    std::complex<float> wlen(std::cos(ang), std::sin(ang));
    for (size_t i = 0; i < n; i += len) {
      std::complex<float> w(1);
      for (size_t j = 0; j < len / 2; j++) {
        auto u = buffer[i+j];
        auto v = buffer[i+j+len/2] * w;
        buffer[i+j] = u + v;
        buffer[i+j+len/2] = u - v;
        w *= wlen;
      }
    }
  }
  if (inverse) {
    for (auto& x : buffer) x /= n;
  }
}

} }
