cmake_minimum_required(VERSION 3.10...3.22)
project(musicbase)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(AUDIO_ENGINE_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/audio_engine.cpp
)
if(ANDROID)
    list(APPEND AUDIO_ENGINE_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/surge_jni.cpp)
endif()

set(DSP_ANALYSIS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis/key.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis/mood.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis/tempo.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis/yin.cpp
)

set(DSP_FILTERS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/filters/filter.cpp
)

set(DSP_GENERATION_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/generation/arrangement_engine.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/generation/chord_engine.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/generation/drum_engine.cpp
)

set(DSP_INSTRUMENTS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/instruments/synthesizer.cpp
)

set(DSP_UTILS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils/audio_cleaner.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils/mastering.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils/noise_reducer.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils/wav_codec.cpp
)

set(DSP_MISC_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/fft.cpp
)

set(AUDIO_INPUT_SOURCES)
if(ANDROID)
    list(APPEND AUDIO_INPUT_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/audio_input_android.cpp)
elseif(IOS)
    list(APPEND AUDIO_INPUT_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/audio_input_ios.mm)
endif()

set(ALL_SOURCES
    ${AUDIO_ENGINE_SOURCES}
    ${DSP_ANALYSIS_SOURCES}
    ${DSP_FILTERS_SOURCES}
    ${DSP_GENERATION_SOURCES}
    ${DSP_INSTRUMENTS_SOURCES}
    ${DSP_UTILS_SOURCES}
    ${DSP_MISC_SOURCES}
    ${AUDIO_INPUT_SOURCES}
)

add_library(musicbase SHARED ${ALL_SOURCES})

target_include_directories(musicbase PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/include
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/filters
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/generation
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/instruments
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils
    ${CMAKE_CURRENT_SOURCE_DIR}/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine
)

if(IOS)
    add_library(musicbase_static STATIC ${ALL_SOURCES})
    target_include_directories(musicbase_static PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/include
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp/analysis
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp/filters
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp/generation
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp/instruments
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp/utils
        ${CMAKE_CURRENT_SOURCE_DIR}/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/audio_engine
    )
endif()

find_library(MATH_LIBRARY m)
if(MATH_LIBRARY)
    target_link_libraries(musicbase ${MATH_LIBRARY})
    if(IOS)
        target_link_libraries(musicbase_static ${MATH_LIBRARY})
    endif()
endif()

if(ANDROID)
    target_link_libraries(musicbase
        OpenSLES
        log
        android
        m
    )
endif()

if(IOS)
    target_link_libraries(musicbase_static
        "-framework AudioToolbox"
        "-framework AVFoundation"
    )
    set_source_files_properties(${CMAKE_CURRENT_SOURCE_DIR}/audio_engine/audio_input_ios.mm PROPERTIES
        COMPILE_FLAGS "-fobjc-arc"
    )
endif()
