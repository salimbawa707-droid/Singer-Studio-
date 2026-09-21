// ============================================================================
// MULTI-TRACK STUDIO STEM EXPORTER & BROADCAST ARCHIVER
// Encodes 24-bit / 16-bit Broadcast WAV + 320kbps MP3 Stems in a standard ZIP
// ============================================================================

import JSZip from 'jszip';
import { StudioProject, StudioTrack } from '../types/audio';
import { WebAudioEngine } from './webAudioEngine';

export interface StemExportOptions {
  format: 'wav24' | 'wav16' | 'mp3';
  normalizeIndividualStems: boolean;
  normalizeMasterMix: boolean;
  includeMasterBus: boolean;
  sampleRate: 44100 | 48000;
}

export interface StemFileDescriptor {
  filename: string;
  blob: Blob;
  sizeBytes: number;
  trackRole: string;
  durationSec: number;
}

export interface StemExportResult {
  zipBlob: Blob;
  zipUrl: string;
  totalSizeMb: number;
  stemFiles: StemFileDescriptor[];
  masterBlob?: Blob;
  masterUrl?: string;
}

export class StemExporterEngine {
  private static instance: StemExporterEngine;

  public static getInstance(): StemExporterEngine {
    if (!StemExporterEngine.instance) {
      StemExporterEngine.instance = new StemExporterEngine();
    }
    return StemExporterEngine.instance;
  }

  /**
   * Render and package all session tracks into isolated dry/wet stems and a master mixdown,
   * bundled into a professional DAW-ready ZIP archive.
   */
  public async exportProjectStems(
    project: StudioProject,
    options: StemExportOptions,
    onProgress?: (progressPercent: number, statusMessage: string) => void
  ): Promise<StemExportResult> {
    const audioEngine = WebAudioEngine.getInstance();
    const zip = new JSZip();
    const stemDescriptors: StemFileDescriptor[] = [];

    const tracks = project.tracks && project.tracks.length > 0 ? project.tracks : [];
    const bitDepth = options.format === 'wav24' ? 24 : 16;
    const fileExt = options.format === 'mp3' ? 'mp3' : 'wav';
    const projectSlug = (project.title || 'Studio_Session').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    if (onProgress) onProgress(5, 'Preparing multi-track stem buffers...');

    // 1. Calculate project-wide timeline boundary
    const maxDuration = Math.max(
      ...tracks.map(t => t.audioBuffer?.duration || project.durationSeconds || 30),
      10
    );
    const targetSampleRate = options.sampleRate || 44100;
    const totalSamples = Math.floor(targetSampleRate * maxDuration);

    // 2. Setup Master Mixdown Accumulator
    const ctx = audioEngine.getContext();
    let masterBuffer: AudioBuffer | null = null;
    if (options.includeMasterBus) {
      masterBuffer = ctx.createBuffer(2, totalSamples, targetSampleRate);
    }
    const masterL = masterBuffer ? masterBuffer.getChannelData(0) : null;
    const masterR = masterBuffer ? masterBuffer.getChannelData(1) : null;

    // Check Solo state across tracks
    const hasSolo = tracks.some(t => t.isSolo && !t.isMuted);

    // 3. Process & Encode Each Stem
    const totalTracks = tracks.length > 0 ? tracks.length : 1;
    let trackIdx = 0;

    for (const track of tracks) {
      trackIdx++;
      const currentPct = 10 + Math.floor((trackIdx / totalTracks) * 65);
      if (onProgress) {
        onProgress(currentPct, `Rendering stem ${trackIdx}/${totalTracks}: ${track.name}...`);
      }

      if (!track.audioBuffer) continue;

      // Extract stem audio buffer aligned to timeline duration
      const stemBuffer = ctx.createBuffer(2, totalSamples, targetSampleRate);
      const sL = stemBuffer.getChannelData(0);
      const sR = stemBuffer.getChannelData(1);

      const srcL = track.audioBuffer.getChannelData(0);
      const srcR = track.audioBuffer.numberOfChannels > 1 ? track.audioBuffer.getChannelData(1) : srcL;
      const copyLen = Math.min(srcL.length, totalSamples);

      for (let i = 0; i < copyLen; i++) {
        sL[i] = isFinite(srcL[i]) ? srcL[i] : 0;
        sR[i] = isFinite(srcR[i]) ? srcR[i] : 0;
      }

      // Optional Individual Stem Peak Normalization (-1.0 dBFS)
      if (options.normalizeIndividualStems) {
        let maxPeak = 0;
        for (let i = 0; i < totalSamples; i++) {
          const pL = Math.abs(sL[i]);
          const pR = Math.abs(sR[i]);
          if (pL > maxPeak) maxPeak = pL;
          if (pR > maxPeak) maxPeak = pR;
        }
        if (maxPeak > 0) {
          const normGain = 0.891 / maxPeak; // -1 dBFS
          for (let i = 0; i < totalSamples; i++) {
            sL[i] = Math.max(-1, Math.min(1, sL[i] * normGain));
            sR[i] = Math.max(-1, Math.min(1, sR[i] * normGain));
          }
        }
      }

      // Accumulate into Master Bus with Fader Gain & Stereo Pan
      if (masterL && masterR && !track.isMuted && (!hasSolo || track.isSolo)) {
        const vol = isFinite(track.volume) ? Math.max(0, track.volume) : 0.8;
        const pan = isFinite(track.pan) ? Math.max(-1, Math.min(1, track.pan)) : 0;
        const panL = Math.cos((pan + 1) * Math.PI / 4) * vol;
        const panR = Math.sin((pan + 1) * Math.PI / 4) * vol;

        for (let i = 0; i < totalSamples; i++) {
          masterL[i] += sL[i] * panL;
          masterR[i] += sR[i] * panR;
        }
      }

      // Convert stem buffer to Blob
      let stemBlob: Blob;
      if (options.format === 'mp3') {
        stemBlob = audioEngine.audioBufferToMp3Blob(stemBuffer, 320);
      } else {
        stemBlob = audioEngine.audioBufferToWavBlob(stemBuffer, bitDepth);
      }

      const cleanStemName = `${String(trackIdx).padStart(2, '0')}_${track.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${track.type || 'audio'}.${fileExt}`;
      zip.file(`Stems/${cleanStemName}`, stemBlob);

      stemDescriptors.push({
        filename: cleanStemName,
        blob: stemBlob,
        sizeBytes: stemBlob.size,
        trackRole: track.type || 'stem',
        durationSec: maxDuration
      });
    }

    // 4. Encode Master Mixdown File
    let masterBlob: Blob | undefined;
    let masterUrl: string | undefined;

    if (masterBuffer && masterL && masterR) {
      if (onProgress) onProgress(80, 'Processing 24-bit Master Bus Mixdown...');

      // Apply safe Peak Normalization to Master Mix (-0.3 dBFS)
      let masterPeak = 0;
      for (let i = 0; i < totalSamples; i++) {
        const pL = Math.abs(masterL[i]);
        const pR = Math.abs(masterR[i]);
        if (pL > masterPeak) masterPeak = pL;
        if (pR > masterPeak) masterPeak = pR;
      }

      if (masterPeak > 0) {
        const target = options.normalizeMasterMix ? 0.965 : 0.89; // -0.3 dBFS
        const gain = target / masterPeak;
        for (let i = 0; i < totalSamples; i++) {
          masterL[i] = Math.max(-1, Math.min(1, masterL[i] * gain));
          masterR[i] = Math.max(-1, Math.min(1, masterR[i] * gain));
        }
      }

      if (options.format === 'mp3') {
        masterBlob = audioEngine.audioBufferToMp3Blob(masterBuffer, 320);
      } else {
        masterBlob = audioEngine.audioBufferToWavBlob(masterBuffer, bitDepth);
      }

      const masterFilename = `00_FULL_MASTER_MIXDOWN_${projectSlug}.${fileExt}`;
      zip.file(masterFilename, masterBlob);
      masterUrl = URL.createObjectURL(masterBlob);
    }

    // 5. Generate Session Info Readme text file inside ZIP
    const readmeContent = `===================================================================
MUSICBASE STUDIO - MULTI-TRACK STEM ARCHIVE
Project: ${project.title}
Key / Root: ${project.key} ${project.scale || 'Major'}
Tempo: ${project.bpm} BPM
Sample Rate: ${options.sampleRate} Hz
Bit Depth: ${options.format === 'wav24' ? '24-bit PCM' : options.format === 'wav16' ? '16-bit PCM' : '320kbps MP3'}
Total Stems: ${stemDescriptors.length}
Generated: ${new Date().toUTCString()}
===================================================================

STEMS LIST:
${stemDescriptors.map(s => `- ${s.filename} (${(s.sizeBytes / (1024 * 1024)).toFixed(2)} MB, Role: ${s.trackRole})`).join('\n')}

COMPATIBILITY:
- Compatible with all major DAWs: Pro Tools, Logic Pro X, Ableton Live, FL Studio, Cubase, Studio One, Reaper.
- Align all stems to Bar 1 Beat 1 (0:00.000) for sample-accurate playback.
`;
    zip.file('SESSION_INFO.txt', readmeContent);

    // 6. Finalize ZIP compression
    if (onProgress) onProgress(90, 'Packaging Broadcast ZIP Archive...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const zipUrl = URL.createObjectURL(zipBlob);
    const totalSizeMb = parseFloat((zipBlob.size / (1024 * 1024)).toFixed(2));

    if (onProgress) onProgress(100, 'Stem Export Completed!');

    return {
      zipBlob,
      zipUrl,
      totalSizeMb,
      stemFiles: stemDescriptors,
      masterBlob,
      masterUrl
    };
  }
}
