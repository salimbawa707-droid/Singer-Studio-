import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Square, 
  Check, 
  Sliders, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  Volume2,
  Maximize2,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ScreenId, StudioProject } from '../types/audio';
import { MasterPlan, createDefaultMasterPlan } from '../types/masterPlan';
import { FinalRender } from '../types/finalRender';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';
import { FinalRenderEngine } from '../services/mastering/finalRenderEngine';
import { ProjectManager } from '../services/projectManager';
import { Phase7ForensicVerification, ForensicAuditReport } from '../services/mastering/phase7ForensicVerification';

interface MasteringScreenProps {
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onApplyMastering: (preset: string, intensity: number, brightness: number, width: number) => void;
}

export const MasteringScreen: React.FC<MasteringScreenProps> = ({
  currentProject,
  onNavigate,
  onApplyMastering,
}) => {
  const projectManager = ProjectManager.getInstance();
  const audioEngine = WebAudioEngine.getInstance();
  const renderEngine = FinalRenderEngine.getInstance();

  const [masterPlan, setMasterPlan] = useState<MasterPlan>(() => {
    return currentProject?.masterPlan || createDefaultMasterPlan(currentProject?.masterPreset || 'Streaming');
  });

  const [activeTab, setActiveTab] = useState<'presets' | 'eq' | 'dynamics' | 'stereo' | 'limiter' | 'render'>('presets');
  const [isRendering, setIsRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finalRender, setFinalRender] = useState<FinalRender | null>(currentProject?.finalRender || null);

  const [forensicReport, setForensicReport] = useState<ForensicAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    if (currentProject?.masterPlan) {
      setMasterPlan(currentProject.masterPlan);
    }
    if (currentProject?.finalRender) {
      setFinalRender(currentProject.finalRender);
    }
  }, [currentProject]);

  const updatePlan = (updated: MasterPlan) => {
    setMasterPlan(updated);
    if (currentProject) {
      projectManager.setMasterPlan(currentProject.id, updated);
      onApplyMastering(updated.presetName, updated.limiter.thresholdDb, updated.eq.highGainDb, updated.stereo.width);
    }
  };

  const handleSelectPreset = (presetName: string) => {
    const newPlan = createDefaultMasterPlan(presetName);
    updatePlan(newPlan);
  };

  const PRESETS = [
    { name: 'Streaming', desc: '-14.0 LUFS & -1.0 dBTP ceiling optimized for Spotify & Apple Music' },
    { name: 'Natural', desc: 'Transparent dynamic fidelity with minimal compression' },
    { name: 'Club Loud', desc: '-9.0 LUFS maximum loudness punch for DJ sets & club sound systems' },
    { name: 'Analog Warmth', desc: 'Harmonic tape saturation & broad tube-style EQ warmth' },
    { name: 'Airy & Bright', desc: '+2.5 dB high-shelf shimmer for modern pop & vocal presence' },
    { name: 'Cinematic', desc: 'Massive stereo width & deep sub-bass headroom' },
  ];

  const handleRenderMaster = async () => {
    if (!currentProject) return;
    setIsRendering(true);
    try {
      const result = await renderEngine.renderFinalMaster(currentProject, currentProject.mixPlan, masterPlan);
      setFinalRender(result);
    } catch (err) {
      console.error('Mastering render failed:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.stopAllPlayback();
      setIsPlaying(false);
      return;
    }

    if (!currentProject) return;

    // If final master is rendered, play mastered PCM Float32Array
    if (finalRender && finalRender.pcmDataL && finalRender.pcmDataR) {
      const ctx = audioEngine.getContext();
      const buf = ctx.createBuffer(2, finalRender.pcmDataL.length, finalRender.sampleRate);
      buf.getChannelData(0).set(finalRender.pcmDataL);
      buf.getChannelData(1).set(finalRender.pcmDataR);
      setIsPlaying(true);
      audioEngine.playBuffer(buf, () => setIsPlaying(false));
      return;
    }

    // Otherwise play pre-master audio
    const firstTrack = currentProject.tracks[0]?.audioBuffer;
    const buffer = firstTrack || audioEngine.generateAccompanimentAudio(currentProject.genre || 'Pop Ballad', 15, currentProject.bpm || 120, currentProject.key || 'C');

    setIsPlaying(true);
    audioEngine.playBuffer(buffer, () => setIsPlaying(false));
  };

  const handleRunForensicAudit = async () => {
    setIsAuditing(true);
    try {
      const report = await Phase7ForensicVerification.runSuite();
      setForensicReport(report);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="mastering"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Mastering Engine & Render Pipeline (Phase 7)"
        subtitle="Canonical MasterPlan DSP, ITU-R BS.1770 Loudness & Offline Deterministic Render"
      />

      <ProductionProgress currentScreen="mastering" currentProject={currentProject} onNavigate={onNavigate} />

      {/* Render Status Banner */}
      {finalRender && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          finalRender.status === 'VALIDATED' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold flex items-center space-x-2">
                <span>Canonical Master Render Status: {finalRender.status}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  {finalRender.renderId}
                </span>
              </div>
              <div className="text-[11px] font-mono opacity-80 mt-0.5">
                LUFS: {finalRender.integratedLUFS} | True-Peak: {finalRender.truePeakDbTP} dBTP | LRA: {finalRender.loudnessRangeLU} LU | Checksum: {finalRender.contentChecksum.slice(0, 24)}...
              </div>
            </div>
          </div>
          <button
            onClick={handleRenderMaster}
            disabled={isRendering}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
            <span>Re-Render</span>
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 space-x-1 overflow-x-auto text-xs font-bold">
        {[
          { id: 'presets', label: 'Curve Presets' },
          { id: 'eq', label: 'Master EQ' },
          { id: 'dynamics', label: 'Compressor & Saturation' },
          { id: 'stereo', label: 'Stereo Field' },
          { id: 'limiter', label: 'Limiter & Trim' },
          { id: 'render', label: 'Loudness & Verification' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Curve Presets */}
      {activeTab === 'presets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Mastering Curve Presets</span>
            </h3>
            <span className="text-xs font-mono text-rose-400 font-bold bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              Active: {masterPlan.presetName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleSelectPreset(p.name)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  masterPlan.presetName === p.name
                    ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{p.name}</div>
                <div className="text-[11px] text-slate-300/80 mt-1 leading-snug">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Master EQ */}
      {activeTab === 'eq' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">3-Band Parametric Master EQ</h3>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!masterPlan.eq.bypass}
                onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, bypass: !e.target.checked } })}
                className="rounded accent-rose-500"
              />
              <span>{masterPlan.eq.bypass ? 'EQ Bypassed' : 'EQ Active'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Low Shelf */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="text-xs font-bold text-indigo-400">Low Shelf (Sub / Bass)</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Gain (dB):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.lowGainDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range" min="-12" max="12" step="0.5"
                  value={masterPlan.eq.lowGainDb}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, lowGainDb: Number(e.target.value) } })}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Freq (Hz):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.lowFreqHz} Hz</span>
                </div>
                <input
                  type="range" min="30" max="300" step="5"
                  value={masterPlan.eq.lowFreqHz}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, lowFreqHz: Number(e.target.value) } })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {/* Peaking Mid */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-400">Mid Peaking (Body / Presence)</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Gain (dB):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.midGainDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range" min="-12" max="12" step="0.5"
                  value={masterPlan.eq.midGainDb}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, midGainDb: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Freq (Hz):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.midFreqHz} Hz</span>
                </div>
                <input
                  type="range" min="300" max="5000" step="50"
                  value={masterPlan.eq.midFreqHz}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, midFreqHz: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Q Bandwidth:</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.midQ.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.3" max="5.0" step="0.1"
                  value={masterPlan.eq.midQ}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, midQ: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* High Shelf */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="text-xs font-bold text-rose-400">High Shelf (Air / Brilliance)</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Gain (dB):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.highGainDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range" min="-12" max="12" step="0.5"
                  value={masterPlan.eq.highGainDb}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, highGainDb: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Freq (Hz):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.eq.highFreqHz} Hz</span>
                </div>
                <input
                  type="range" min="4000" max="16000" step="200"
                  value={masterPlan.eq.highFreqHz}
                  onChange={(e) => updatePlan({ ...masterPlan, eq: { ...masterPlan.eq, highFreqHz: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Dynamics & Saturation */}
      {activeTab === 'dynamics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Compressor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Master Bus Compressor</h3>
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!masterPlan.compressor.bypass}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, bypass: !e.target.checked } })}
                  className="rounded accent-rose-500"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Threshold (dB):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.compressor.thresholdDb} dB</span>
                </div>
                <input
                  type="range" min="-40" max="0" step="1"
                  value={masterPlan.compressor.thresholdDb}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, thresholdDb: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ratio:</span>
                  <span className="font-mono text-white font-bold">{masterPlan.compressor.ratio.toFixed(1)}:1</span>
                </div>
                <input
                  type="range" min="1.1" max="10" step="0.1"
                  value={masterPlan.compressor.ratio}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, ratio: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Attack (ms):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.compressor.attackMs} ms</span>
                </div>
                <input
                  type="range" min="1" max="100" step="1"
                  value={masterPlan.compressor.attackMs}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, attackMs: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Release (ms):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.compressor.releaseMs} ms</span>
                </div>
                <input
                  type="range" min="20" max="500" step="5"
                  value={masterPlan.compressor.releaseMs}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, releaseMs: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Makeup Gain (dB):</span>
                  <span className="font-mono text-white font-bold">+{masterPlan.compressor.makeupGainDb} dB</span>
                </div>
                <input
                  type="range" min="0" max="12" step="0.5"
                  value={masterPlan.compressor.makeupGainDb}
                  onChange={(e) => updatePlan({ ...masterPlan, compressor: { ...masterPlan.compressor, makeupGainDb: Number(e.target.value) } })}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Saturation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Harmonic Tape Saturation</h3>
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!masterPlan.saturation.bypass}
                  onChange={(e) => updatePlan({ ...masterPlan, saturation: { ...masterPlan.saturation, bypass: !e.target.checked } })}
                  className="rounded accent-amber-500"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Drive:</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(masterPlan.saturation.drive * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={masterPlan.saturation.drive}
                  onChange={(e) => updatePlan({ ...masterPlan, saturation: { ...masterPlan.saturation, drive: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Dry / Wet Mix:</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(masterPlan.saturation.mix * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={masterPlan.saturation.mix}
                  onChange={(e) => updatePlan({ ...masterPlan, saturation: { ...masterPlan.saturation, mix: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Output Gain (dB):</span>
                  <span className="font-mono text-white font-bold">{masterPlan.saturation.outputGainDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range" min="-6" max="6" step="0.5"
                  value={masterPlan.saturation.outputGainDb}
                  onChange={(e) => updatePlan({ ...masterPlan, saturation: { ...masterPlan.saturation, outputGainDb: Number(e.target.value) } })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Stereo Field */}
      {activeTab === 'stereo' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Mid/Side Stereo Field Width Processor</h3>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!masterPlan.stereo.bypass}
                onChange={(e) => updatePlan({ ...masterPlan, stereo: { ...masterPlan.stereo, bypass: !e.target.checked } })}
                className="rounded accent-indigo-500"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Stereo Width Factor:</span>
                <span className="font-mono text-indigo-400 font-bold">{masterPlan.stereo.width.toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0.0" max="2.0" step="0.05"
                value={masterPlan.stereo.width}
                onChange={(e) => updatePlan({ ...masterPlan, stereo: { ...masterPlan.stereo, width: Number(e.target.value) } })}
                className="w-full accent-indigo-500"
              />
              <div className="text-[10px] text-slate-400">0.0 = Mono, 1.0 = Original, 2.0 = Ultra Wide</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Master Stereo Balance:</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {masterPlan.stereo.balance === 0 ? 'Center' : masterPlan.stereo.balance < 0 ? `L ${Math.abs(Math.round(masterPlan.stereo.balance * 100))}%` : `R ${Math.round(masterPlan.stereo.balance * 100)}%`}
                </span>
              </div>
              <input
                type="range" min="-1.0" max="1.0" step="0.05"
                value={masterPlan.stereo.balance}
                onChange={(e) => updatePlan({ ...masterPlan, stereo: { ...masterPlan.stereo, balance: Number(e.target.value) } })}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Limiter & Trim */}
      {activeTab === 'limiter' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">True-Peak Brickwall Limiter & Input Trim</h3>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!masterPlan.limiter.bypass}
                onChange={(e) => updatePlan({ ...masterPlan, limiter: { ...masterPlan.limiter, bypass: !e.target.checked } })}
                className="rounded accent-emerald-500"
              />
              <span>Limiter Active</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Input Trim Gain (dB):</span>
                <span className="font-mono text-emerald-400 font-bold">{masterPlan.inputGainDb.toFixed(1)} dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="0.5"
                value={masterPlan.inputGainDb}
                onChange={(e) => updatePlan({ ...masterPlan, inputGainDb: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">True-Peak Ceiling (dBTP):</span>
                <span className="font-mono text-emerald-400 font-bold">{masterPlan.limiter.ceilingDb.toFixed(1)} dBTP</span>
              </div>
              <input
                type="range" min="-3.0" max="-0.1" step="0.1"
                value={masterPlan.limiter.ceilingDb}
                onChange={(e) => updatePlan({ ...masterPlan, limiter: { ...masterPlan.limiter, ceilingDb: Number(e.target.value) } })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Loudness & Verification */}
      {activeTab === 'render' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Authoritative Final Render & Analysis</h3>
                <p className="text-xs text-slate-400 mt-0.5">Offline deterministic render with ITU-R BS.1770-4 loudness measurement</p>
              </div>

              <button
                onClick={handleRenderMaster}
                disabled={isRendering}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30"
              >
                <Zap className={`w-4 h-4 ${isRendering ? 'animate-spin' : ''}`} />
                <span>{isRendering ? 'Rendering Master...' : 'Render Final Master'}</span>
              </button>
            </div>

            {finalRender ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Integrated LUFS</div>
                  <div className="text-lg font-mono font-bold text-rose-400 mt-1">{finalRender.integratedLUFS}</div>
                  <div className="text-[10px] text-slate-400">Target: {masterPlan.loudnessTarget.targetLUFS}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">True-Peak</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 mt-1">{finalRender.truePeakDbTP} dBTP</div>
                  <div className="text-[10px] text-slate-400">Ceiling: {masterPlan.limiter.ceilingDb} dBTP</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Loudness Range</div>
                  <div className="text-lg font-mono font-bold text-indigo-400 mt-1">{finalRender.loudnessRangeLU} LU</div>
                  <div className="text-[10px] text-slate-400">Dynamic spread</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Clipping Count</div>
                  <div className="text-lg font-mono font-bold text-amber-400 mt-1">{finalRender.clippingSamplesCount}</div>
                  <div className="text-[10px] text-slate-400">Sample overshoots</div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                No rendered master currently cached. Click "Render Final Master" above.
              </div>
            )}

            {/* Forensic Audit Trigger */}
            <div className="pt-2">
              <button
                onClick={handleRunForensicAudit}
                disabled={isAuditing}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center space-x-2"
              >
                <ShieldCheck className={`w-4 h-4 text-emerald-400 ${isAuditing ? 'animate-spin' : ''}`} />
                <span>{isAuditing ? 'Auditing Phase 7 DSP Engines...' : 'Run Phase 7 Forensic Verification Suite'}</span>
              </button>
            </div>
          </div>

          {/* Forensic Audit Report Display */}
          {forensicReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Phase 7 Forensic Audit Report</h3>
                </div>
                <div className="flex items-center space-x-2 font-mono text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    Score: {forensicReport.scorePercent}%
                  </span>
                  <span className="text-slate-400">
                    ({forensicReport.passedChecks}/{forensicReport.totalChecks} Passed)
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {forensicReport.checks.map(check => (
                  <div key={check.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start justify-between text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>{check.id}</span>
                        <span className="text-[11px] text-slate-400 font-normal">{check.description}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{check.details}</div>
                    </div>
                    {check.status === 'PASS' ? (
                      <span className="flex items-center space-x-1 text-emerald-400 font-bold shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-rose-400 font-bold shrink-0">
                        <XCircle className="w-4 h-4" />
                        <span>FAIL</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Primary Controls */}
      <div className="space-y-2 pt-2">
        <button
          onClick={async () => {
            if (!finalRender) {
              await handleRenderMaster();
            }
            onNavigate('export');
          }}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Apply Master & Continue to Export (Phase 8)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTogglePlay}
            className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border active:scale-[0.98] transition-all ${
              isPlaying 
                ? 'bg-rose-600 border-rose-500 text-white' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-rose-400" />}
            <span>{isPlaying ? 'Stop Playback' : finalRender ? 'Preview Mastered PCM' : 'Preview Mix'}</span>
          </button>

          <button
            onClick={handleRenderMaster}
            disabled={isRendering}
            className="py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/30 active:scale-[0.98] transition-all"
          >
            <Zap className={`w-4 h-4 ${isRendering ? 'animate-spin' : ''}`} />
            <span>{isRendering ? 'Rendering...' : 'Render Master Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
