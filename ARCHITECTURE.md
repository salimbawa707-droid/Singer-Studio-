# Surge Studio — Canonical Architecture & Foundation Specification (Phase 1)

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|   (Header, BottomNav, HomeScreen, RecordScreen, PipelineScreen, DirectorScreen)    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       APPLICATION / STUDIO CONTROLLER                             |
|          (ProjectManager / App Controller — Actions, State Transitions)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           CANONICAL PROJECT STATE                                 |
|   (StudioProject, ProjectTrack[], Invalidation Ledger, AudioBuffer/PCM Refs)      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                DOMAIN SERVICES                                    |
|   - VocalAnalysisEngine (YIN, FFT, BPM/Key Detection)                             |
|   - VocalCleanupEngine (7-Stage Biquad DSP, Hum/DeClick/DePlosive/HPF)            |
|   - MusicDirectorService (AI Gateway -> Gemini / Local Neural Brain)              |
|   - CompositionEngine (Motifs, Counter-Melody, Harmony, Cadences)                 |
|   - ArrangementEngine (8-Section Archetypes, 9-Stem Orchestration)                |
|   - MixingEngine (Anti-Masking EQ, Ducking, Stereo Imaging, Bus Glue)             |
|   - MasteringEngine (LUFS Profiler, 4-Band Dynamics, Silk Air, Limiter)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        CANONICAL AUDIO ENGINE CONTRACT                            |
|                          (IAudioEngine Interface)                                 |
|  - initialize()   - record()      - stopRecording()                               |
|  - play()         - pause()       - stop()                                        |
|  - analyze()      - process()     - mix()                                         |
|  - render()       - export()      - dispose()                                     |
+-----------------------------------------------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-----------------------------+                 +-----------------------------+
|    PLATFORM AUDIO: WEB      |                 |   PLATFORM AUDIO: NATIVE    |
|     (WebAudioAdapter)       |                 | (NativeCppAudioAdapter - P3)|
| - WebAudio API Context      |                 | - OpenSL ES Audio I/O       |
| - OfflineAudioContext       |                 | - C++ DSP (native/dsp)      |
| - LAME MP3 / WAV Codecs     |                 | - JNI Bridge Contract       |
+-----------------------------+                 +-----------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        CANONICAL RENDER AUTHORITY                                 |
|                       (IRenderEngine / RenderPlan)                                |
|  - Single Graph Authority: Preview Audio Graph == Export Mixdown Audio Graph       |
|  - Deliverable Pipeline: 24-bit Stereo WAV / 320kbps MP3 / Isolated Stems         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Canonical Project Model

Located in `src/types/audio.ts` and managed via `src/services/projectManager.ts`:
- **Identity & Metadata**: `id`, `title`, `genre`, `createdAt`, `updatedAt`, `notes`.
- **Musical Foundation**: `bpm`, `key`, `scale` ('major' | 'minor'), `timeSignature`, `durationSeconds`.
- **Tracks & Stems**: Array of `ProjectTrack` objects (`id`, `name`, `type`, `volume`, `pan`, `isMuted`, `isSolo`, `audioBuffer`, `audioBlob`).
- **Analysis State**: `detectedPitch` (`PitchAnalysisResult`), `detectedBpmKey` (`BpmKeyResult`).
- **Vocal Buffers**: `rawVocalBuffer`, `cleanedVocalBuffer`, `isCleaned`.
- **Semantic & AI Plan**: `lyrics`, `selectedLanguage`, `semanticMode`, `semanticArrangementSheet`, `arrangementPlan`.
- **Mastering Parameters**: `isMastered`, `masterPreset`, `masterIntensity`, `masterBrightness`, `masterWidth`.
- **Non-Destructive Invalidation Ledger**: `arrangementNeedsUpdate`, `mixerNeedsUpdate`, `masteringNeedsUpdate`, `exportNeedsUpdate`.

---

## 3. Platform & Android Strategy

- **Authoritative Architecture**: Android WebView Native Host + React/TypeScript (Vite) Single-Page Application + WebAudio / Native DSP Bridge.
- **Reconciliation**:
  - Removed all obsolete Flutter build configurations and Gradle plugins from `android/app/build.gradle` and `android/settings.gradle`.
  - Upgraded `MainActivity.kt` to an Android Native `AppCompatActivity` hosting an accelerated `WebView` with automatic WebChrome microphone permissions.
  - Updated GitHub Actions workflow `.github/workflows/build-apk.yml` to compile the Vite web bundle and package it into an Android APK.

---

## 4. Native C++ Integration Status

- **Location**: `native/audio_engine` and `native/dsp`.
- **Status in Phase 1**: Architecturally isolated behind `NativeCppAudioAdapter` and C-ABI contract (`native/audio_engine/include/audio_engine.h`).
- **Active Execution**: WebAudio and TypeScript DSP execute all production pipelines with 100% test coverage. Native C++ JNI binding is planned for Phase 3.

---

## 5. API Boundary & AI Safety

- **Server Proxy**: `server.ts` hosts secure `/api/*` endpoints.
- **AI Gateway Hierarchy**:
  1. Google Gemini via server-side SDK (`GEMINI_API_KEY`)
  2. Local Offline Neural / Rule-based Brain (`src/services/aiMusicalBrain`)
- **Safety Boundary**: AI outputs are strictly parsed and validated into `SongArrangementSheet` musical directives before entering the domain layer. AI code cannot directly mutate random UI elements.
