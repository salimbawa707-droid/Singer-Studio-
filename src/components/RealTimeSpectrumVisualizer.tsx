import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Eye, Disc, Volume2, Sparkles } from 'lucide-react';

interface RealTimeSpectrumVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  bpm?: number;
  keyRoot?: string;
  activeStemsCount?: number;
}

export const RealTimeSpectrumVisualizer: React.FC<RealTimeSpectrumVisualizerProps> = ({
  analyserNode,
  isPlaying,
  bpm = 120,
  keyRoot = 'C',
  activeStemsCount = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<'spectrum' | 'bars' | 'oscilloscope'>('spectrum');
  const [peakFreqHz, setPeakFreqHz] = useState<number>(0);
  const [avgDbLevel, setAvgDbLevel] = useState<number>(-60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 128;
    let dataArray = new Uint8Array(bufferLength);
    let timeDomainArray = new Uint8Array(bufferLength);

    if (analyserNode) {
      analyserNode.fftSize = 256;
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      timeDomainArray = new Uint8Array(bufferLength);
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      // Dark Studio Background with subtle frequency grid lines
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = '#1e293b40';
      ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 20; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
        analyserNode.getByteTimeDomainData(timeDomainArray);

        // Calculate peak frequency & average volume
        let maxVal = 0;
        let maxBin = 0;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          sum += val;
          if (val > maxVal) {
            maxVal = val;
            maxBin = i;
          }
        }
        const sampleRate = analyserNode.context.sampleRate || 44100;
        const dominantHz = Math.round((maxBin * (sampleRate / 2)) / bufferLength);
        setPeakFreqHz(dominantHz);
        const avgNorm = sum / (bufferLength * 255);
        const dbEst = avgNorm > 0 ? Math.round(20 * Math.log10(avgNorm)) : -60;
        setAvgDbLevel(Math.max(-60, Math.min(0, dbEst)));
      } else {
        // Idle animation / quiet baseline
        dataArray.fill(0);
        timeDomainArray.fill(128);
        setPeakFreqHz(0);
        setAvgDbLevel(-60);
      }

      if (visualizerMode === 'spectrum') {
        // Continuous smooth FFT Frequency Gradient Curve
        ctx.beginPath();
        const sliceWidth = width / (bufferLength - 1);
        let x = 0;

        ctx.moveTo(0, height);
        for (let i = 0; i < bufferLength; i++) {
          const v = isPlaying ? dataArray[i] / 255.0 : 0.02 * Math.sin(i * 0.2 + Date.now() * 0.003);
          const y = height - (v * (height - 10));

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = x - sliceWidth;
            const prevY = height - ((isPlaying ? dataArray[i - 1] / 255.0 : 0.02) * (height - 10));
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
          }
          x += sliceWidth;
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        // Gradient Fill
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.7)'); // Indigo
        gradient.addColorStop(0.4, 'rgba(168, 85, 247, 0.75)'); // Purple
        gradient.addColorStop(0.7, 'rgba(236, 72, 153, 0.8)'); // Pink
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.8)'); // Green
        ctx.fillStyle = gradient;
        ctx.fill();

        // Glowing Top Outline
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (visualizerMode === 'bars') {
        // 32 Precision Studio Frequency Bands
        const numBands = 32;
        const barWidth = (width / numBands) - 2;
        const step = Math.floor(bufferLength / numBands);

        for (let b = 0; b < numBands; b++) {
          let bSum = 0;
          for (let s = 0; s < step; s++) {
            bSum += dataArray[b * step + s] || 0;
          }
          const bAvg = isPlaying ? bSum / (step * 255.0) : 0.03;
          const barHeight = Math.max(3, bAvg * (height - 12));
          const bx = b * (barWidth + 2);
          const by = height - barHeight;

          // Multi-color band styling
          const hue = 220 + (b / numBands) * 120; // Blue -> Purple -> Magenta
          ctx.fillStyle = `hsl(${hue}, 85%, ${55 + bAvg * 20}%)`;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(bx, by, barWidth, barHeight, [3, 3, 0, 0]) : ctx.rect(bx, by, barWidth, barHeight);
          ctx.fill();

          // Peak cap
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx, Math.max(0, by - 2), barWidth, 1.5);
        }

      } else if (visualizerMode === 'oscilloscope') {
        // Real-time Time-domain waveform
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8'; // Sky Blue
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let ox = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = isPlaying ? timeDomainArray[i] / 128.0 : 1.0;
          const oy = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(ox, oy);
          } else {
            ctx.lineTo(ox, oy);
          }
          ox += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying, visualizerMode]);

  return (
    <div className="bg-slate-950 border border-indigo-500/25 rounded-2xl p-3.5 space-y-2.5 shadow-xl relative overflow-hidden">
      {/* Visualizer Top Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Live FFT Spectrum & Spatial Analyzer
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setVisualizerMode('spectrum')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              visualizerMode === 'spectrum' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Curve
          </button>
          <button
            onClick={() => setVisualizerMode('bars')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              visualizerMode === 'bars' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            32-Band
          </button>
          <button
            onClick={() => setVisualizerMode('oscilloscope')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              visualizerMode === 'oscilloscope' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scope
          </button>
        </div>
      </div>

      {/* Canvas Display */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={640}
          height={140}
          className="w-full h-28 sm:h-32 object-cover block"
        />

        {/* Frequency Band Labels at bottom of visualizer */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[8px] font-mono text-slate-500 pointer-events-none">
          <span>20 Hz (Sub)</span>
          <span>120 Hz (Bass)</span>
          <span>500 Hz (Low-Mid)</span>
          <span>2 kHz (Formants)</span>
          <span>8 kHz (Presence)</span>
          <span>20 kHz (Air)</span>
        </div>
      </div>

      {/* Real-Time Acoustic Readouts */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5 text-center">
          <div className="text-[9px] text-slate-400 uppercase font-mono">Dominant Peak</div>
          <div className="text-xs font-bold font-mono text-indigo-300">
            {isPlaying && peakFreqHz > 0 ? `${peakFreqHz} Hz` : '--'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5 text-center">
          <div className="text-[9px] text-slate-400 uppercase font-mono">RMS Level</div>
          <div className="text-xs font-bold font-mono text-emerald-400">
            {isPlaying ? `${avgDbLevel} dB` : '-inf dB'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5 text-center">
          <div className="text-[9px] text-slate-400 uppercase font-mono">Session Key</div>
          <div className="text-xs font-bold font-mono text-purple-300">
            {keyRoot} ({bpm} BPM)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5 text-center">
          <div className="text-[9px] text-slate-400 uppercase font-mono">Active Stems</div>
          <div className="text-xs font-bold font-mono text-amber-300">
            {activeStemsCount} Stems
          </div>
        </div>
      </div>
    </div>
  );
};
