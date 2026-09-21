import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { RecordScreen } from './screens/RecordScreen';
import { ProductionPipelineScreen } from './screens/ProductionPipelineScreen';
import { VocalCleanupScreen } from './screens/VocalCleanupScreen';
import { PitchScreen } from './screens/PitchScreen';
import { BpmKeyScreen } from './screens/BpmKeyScreen';
import { AccompanimentScreen } from './screens/AccompanimentScreen';
import { MixerScreen } from './screens/MixerScreen';
import { MasteringScreen } from './screens/MasteringScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ExportScreen } from './screens/ExportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { MusicDirectorScreen } from './screens/MusicDirectorScreen';
import { OmniTestScreen } from './screens/OmniTestScreen';
import { VakScreen } from './screens/VakScreen';
import { 
  ScreenId, 
  StudioProject, 
  StudioTrack, 
  ProductionStage, 
  ProjectTrack, 
  PitchAnalysisResult,
  SaveStatus,
  DspPipelineSettings
} from './types/audio';
import { SongArrangementSheet } from './types/musicDirector';
import { ProjectManager } from './services/projectManager';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [latestVocalBuffer, setLatestVocalBuffer] = useState<AudioBuffer | null>(null);

  // Canonical Persistent Project Controller
  const projectManager = ProjectManager.getInstance();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [currentProject, setCurrentProject] = useState<StudioProject | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [missingAssets, setMissingAssets] = useState<string[]>([]);

  // Initialize and subscribe to ProjectManager
  useEffect(() => {
    projectManager.init();

    const unsubProjects = projectManager.subscribe((allProjects, active) => {
      setProjects(allProjects);
      setCurrentProject(active);
      if (active?.rawVocalBuffer) {
        setLatestVocalBuffer(active.rawVocalBuffer);
      } else if (active?.cleanedVocalBuffer) {
        setLatestVocalBuffer(active.cleanedVocalBuffer);
      }
    });

    const unsubStatus = projectManager.subscribeSaveStatus((status) => {
      setSaveStatus(status);
    });

    const unsubMissing = projectManager.subscribeMissingAssets((projId, missing) => {
      if (currentProject?.id === projId) {
        setMissingAssets(missing);
      }
    });

    return () => {
      unsubProjects();
      unsubStatus();
      unsubMissing();
    };
  }, []);

  // Update missing assets when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setMissingAssets(projectManager.getMissingAssetsForProject(currentProject.id));
    }
  }, [currentProject?.id]);

  // Project Management Actions
  const handleCreateNewProject = async (title: string, genre: string) => {
    await projectManager.createProject(title, genre);
  };

  const handleDeleteProject = async (projectId: string) => {
    await projectManager.deleteProject(projectId);
  };

  const handleRenameProject = async (projectId: string, newTitle: string) => {
    await projectManager.renameProject(projectId, newTitle);
  };

  const handleDuplicateProject = async (projectId: string) => {
    await projectManager.duplicateProject(projectId);
  };

  const handleSelectProject = async (project: StudioProject) => {
    await projectManager.setActiveProject(project.id);
  };

  const handleSaveActiveProject = async () => {
    await projectManager.saveActiveProjectNow();
  };

  const handleImportAudio = async (file: File) => {
    try {
      const imported = await projectManager.importAudioFile(file);
      if (imported?.rawVocalBuffer) {
        setLatestVocalBuffer(imported.rawVocalBuffer);
      }
      setCurrentScreen('pipeline');
    } catch (err) {
      console.error("Audio import error:", err);
    }
  };

  // Vocal Track Storage
  const handleSaveVocalTake = async (buffer: AudioBuffer, blob: Blob, capturedLyrics?: string) => {
    setLatestVocalBuffer(buffer);
    let activeProj = currentProject;
    if (!activeProj) {
      activeProj = await projectManager.createProject(`Session ${(projects || []).length + 1}`, 'Pop Ballad');
    }
    await projectManager.setVocalTrack(activeProj.id, buffer, capturedLyrics, blob);
  };

  // Cleaned Vocal Application
  const handleApplyCleanedVocal = async (cleanedBuffer: AudioBuffer, settings?: DspPipelineSettings) => {
    setLatestVocalBuffer(cleanedBuffer);
    if (!currentProject) return;
    await projectManager.applyCleanedVocal(currentProject.id, cleanedBuffer, settings);
  };

  // Set All Arranged Multi-Tracks with Mixer Level Preservation
  const handleSetProjectTracks = async (newTracks: ProjectTrack[], totalDuration: number, plan?: any) => {
    if (!currentProject) return;
    await projectManager.setArrangedTracks(currentProject.id, newTracks, totalDuration, plan);
  };

  // Update Project Generic
  const handleUpdateProject = (updated: Partial<StudioProject>) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, updated);
  };

  // Update Production Stage
  const handleUpdateProjectStage = (stage: ProductionStage) => {
    if (!currentProject) return;
    projectManager.setProjectStage(currentProject.id, stage);
  };

  const handleSaveAccompanimentTrack = (buffer: AudioBuffer, genre: string, bpm: number, key: string) => {
    if (!currentProject) return;

    const existingAcc = currentProject.tracks.find(t => t.type === 'accompaniment');
    const newTrack: StudioTrack = {
      id: existingAcc?.id || `trk-acc-${Date.now()}`,
      name: `${genre} Backing Track`,
      type: 'accompaniment',
      volume: existingAcc ? existingAcc.volume : 0.8,
      pan: existingAcc ? existingAcc.pan : 0,
      isMuted: existingAcc ? existingAcc.isMuted : false,
      isSolo: existingAcc ? existingAcc.isSolo : false,
      audioBuffer: buffer,
    };

    projectManager.updateProject(currentProject.id, {
      genre,
      bpm,
      key,
      tracks: [...currentProject.tracks.filter(t => t.type !== 'accompaniment'), newTrack],
      durationSeconds: Math.max(currentProject.durationSeconds || 0, Math.round(buffer.duration)),
      arrangementNeedsUpdate: false,
      mixerNeedsUpdate: false,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  const handleSaveHarmonyTrack = (buffer: AudioBuffer, presetName: string) => {
    if (!currentProject) return;

    const harmonyTrack: StudioTrack = {
      id: `trk-harmony-${Date.now()}`,
      name: `Backing: ${presetName}`,
      type: 'harmony',
      volume: 0.72,
      pan: 0,
      isMuted: false,
      isSolo: false,
      audioBuffer: buffer,
    };

    projectManager.updateProject(currentProject.id, {
      tracks: [...currentProject.tracks.filter(t => t.type !== 'harmony'), harmonyTrack],
      durationSeconds: Math.max(currentProject.durationSeconds || 0, Math.round(buffer.duration)),
      mixerNeedsUpdate: false,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  // AI Music Director Semantic Plan Application
  const handleApplyDirectorPlan = (sheet: SongArrangementSheet) => {
    if (!currentProject) return;

    projectManager.updateProject(currentProject.id, {
      bpm: sheet.recommendedBpm,
      key: sheet.recommendedKey,
      scale: sheet.scaleMode === 'minor' ? 'minor' : 'major',
      detectedBpmKey: {
        bpm: sheet.recommendedBpm,
        key: sheet.recommendedKey,
        scale: sheet.scaleMode === 'minor' ? 'minor' : 'major',
        confidence: 0.99
      },
      semanticArrangementSheet: sheet,
      arrangementNeedsUpdate: true,
      mixerNeedsUpdate: true,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  // BPM and Key Updates
  const handleUpdateBpmKey = (bpm: number, key: string, scale: 'major' | 'minor') => {
    if (!currentProject) return;
    projectManager.updateVocalAnalysis(
      currentProject.id,
      undefined,
      { bpm, key, scale, confidence: 0.96 }
    );
  };

  // Pitch Updates
  const handleUpdatePitch = (pitch: PitchAnalysisResult) => {
    if (!currentProject) return;
    projectManager.updateVocalAnalysis(
      currentProject.id,
      pitch
    );
  };

  // Arrangement Settings Updates (Instruments, Intro duration, Style, Energy)
  const handleUpdateArrangementSettings = (
    instruments: string[],
    introDurationSeconds: number,
    style?: string,
    energy?: string
  ) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, {
      selectedInstruments: instruments,
      introDurationSeconds,
      arrangementStyle: style || currentProject.arrangementStyle,
      energyLevel: energy || currentProject.energyLevel,
      arrangementNeedsUpdate: true,
      mixerNeedsUpdate: true,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  // Track Mixer Adjustments
  const handleUpdateTrackVolume = (trackId: string, volume: number) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, {
      tracks: currentProject.tracks.map(t => t.id === trackId ? { ...t, volume } : t),
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  const handleUpdateTrackPan = (trackId: string, pan: number) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, {
      tracks: currentProject.tracks.map(t => t.id === trackId ? { ...t, pan } : t),
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  const handleToggleMute = (trackId: string) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, {
      tracks: currentProject.tracks.map(t => t.id === trackId ? { ...t, isMuted: !t.isMuted } : t),
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  const handleToggleSolo = (trackId: string) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, {
      tracks: currentProject.tracks.map(t => t.id === trackId ? { ...t, isSolo: !t.isSolo } : t),
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  };

  const handleApplyMastering = (preset: string, intensity: number, brightness: number, width: number) => {
    if (!currentProject) return;
    projectManager.updateProject(currentProject.id, { 
      isMastered: true,
      masterPreset: preset,
      masterIntensity: intensity,
      masterBrightness: brightness,
      masterWidth: width,
      masteringNeedsUpdate: false,
      exportNeedsUpdate: false,
      stage: 'completed',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Navigation Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeProject={currentProject}
        saveStatus={saveStatus}
      />

      {/* Main Screen Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-5">
        {currentScreen === 'home' && (
          <HomeScreen
            currentProject={currentProject}
            projects={projects}
            onNavigate={setCurrentScreen}
            onSelectProject={handleSelectProject}
            onImportAudio={handleImportAudio}
            onSaveVocalTake={handleSaveVocalTake}
            onNewProject={async () => {
              const newProj = await projectManager.createProject(`Session ${(projects || []).length + 1}`, 'Pop Ballad');
              setCurrentScreen('record');
            }}
          />
        )}

        {currentScreen === 'record' && (
          <RecordScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onSaveVocalTake={handleSaveVocalTake}
          />
        )}

        {currentScreen === 'pipeline' && (
          <ProductionPipelineScreen
            currentProject={currentProject}
            vocalBuffer={latestVocalBuffer}
            onNavigate={setCurrentScreen}
            onApplyCleanedVocal={handleApplyCleanedVocal}
            onUpdateBpmKey={handleUpdateBpmKey}
            onUpdatePitch={handleUpdatePitch}
            onUpdateArrangementSettings={handleUpdateArrangementSettings}
            onSetProjectTracks={handleSetProjectTracks}
            onUpdateProjectStage={handleUpdateProjectStage}
          />
        )}

        {currentScreen === 'director' && (
          <MusicDirectorScreen
            currentProject={currentProject}
            vocalBuffer={latestVocalBuffer}
            onNavigate={setCurrentScreen}
            onApplyDirectorPlan={handleApplyDirectorPlan}
            onSetProjectTracks={handleSetProjectTracks}
          />
        )}

        {currentScreen === 'cleanup' && (
          <VocalCleanupScreen
            currentProject={currentProject}
            vocalBuffer={latestVocalBuffer}
            onNavigate={setCurrentScreen}
            onApplyCleanedVocal={handleApplyCleanedVocal}
          />
        )}

        {currentScreen === 'pitch' && (
          <PitchScreen
            currentProject={currentProject}
            vocalBuffer={latestVocalBuffer}
            onNavigate={setCurrentScreen}
            onUpdatePitch={handleUpdatePitch}
            onUpdateCleanedVocal={handleApplyCleanedVocal}
          />
        )}

        {currentScreen === 'bpm_key' && (
          <BpmKeyScreen
            currentProject={currentProject}
            vocalBuffer={latestVocalBuffer}
            onNavigate={setCurrentScreen}
            onUpdateBpmKey={handleUpdateBpmKey}
          />
        )}

        {currentScreen === 'accompaniment' && (
          <AccompanimentScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onSaveAccompanimentTrack={handleSaveAccompanimentTrack}
            onSaveHarmonyTrack={handleSaveHarmonyTrack}
          />
        )}

        {currentScreen === 'mixer' && (
          <MixerScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onUpdateTrackVolume={handleUpdateTrackVolume}
            onUpdateTrackPan={handleUpdateTrackPan}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
          />
        )}

        {currentScreen === 'mastering' && (
          <MasteringScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onApplyMastering={handleApplyMastering}
          />
        )}

        {currentScreen === 'projects' && (
          <ProjectsScreen
            projects={projects}
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onSelectProject={handleSelectProject}
            onCreateNewProject={handleCreateNewProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onSaveProject={handleSaveActiveProject}
            missingAssets={missingAssets}
          />
        )}

        {currentScreen === 'export' && (
          <ExportScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            onNavigate={setCurrentScreen}
          />
        )}

        {currentScreen === 'omni_test' && (
          <OmniTestScreen
            onNavigate={setCurrentScreen}
            currentProject={currentProject}
          />
        )}

        {currentScreen === 'vak' && (
          <VakScreen
            currentProject={currentProject}
            onNavigate={setCurrentScreen}
            onUpdateProject={(updated) => {
              if (currentProject?.id) {
                projectManager.updateProject(currentProject.id, updated);
              }
            }}
          />
        )}
      </main>

      {/* Mobile Responsive Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
      />
    </div>
  );
}
