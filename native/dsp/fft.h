#pragma once
#include <vector>
#include <complex>

namespace musicbase { namespace dsp {

class FFT {
public:
  static void realFFT(std::vector<float>& buffer, bool inverse = false);
  static void complexFFT(std::vector<std::complex<float>>& buffer, bool inverse = false);
};

} }
