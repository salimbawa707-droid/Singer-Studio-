import React, { useState } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  Edit3, 
  Copy,
  Share2, 
  Check, 
  ChevronLeft, 
  AlertTriangle,
  Save,
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ScreenId, StudioProject } from '../types/audio';

interface ProjectsScreenProps {
  projects: StudioProject[];
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onSelectProject: (project: StudioProject) => void;
  onCreateNewProject: (title: string, genre: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newTitle: string) => void;
  onDuplicateProject?: (projectId: string) => void;
  onSaveProject?: () => void;
  missingAssets?: string[];
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  projects = [],
  currentProject,
  onNavigate,
  onSelectProject,
  onCreateNewProject,
  onDeleteProject,
  onRenameProject,
  onDuplicateProject,
  onSaveProject,
  missingAssets = [],
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Pop Ballad');
  const [projectToDelete, setProjectToDelete] = useState<StudioProject | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioEngine = WebAudioEngine.getInstance();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNewProject(newTitle.trim(), newGenre);
    setNewTitle('');
    setShowCreateModal(false);
    onNavigate('mixer');
  };

  const handlePlayPreview = (proj: StudioProject) => {
    if (playingId === proj.id) {
      audioEngine.stopAllPlayback();
      setPlayingId(null);
      return;
    }

    const firstAudio = (proj.tracks || []).find(t => t.audioBuffer)?.audioBuffer;
    const buffer = firstAudio || audioEngine.generateAccompanimentAudio(proj.genre, 8, proj.bpm, proj.key);

    setPlayingId(proj.id);
    audioEngine.playBuffer(buffer, () => {
      setPlayingId(null);
    });
  };

  const handleStartRename = (proj: StudioProject) => {
    setRenamingId(proj.id);
    setRenameInput(proj.title);
  };

  const handleSaveRename = (projectId: string) => {
    if (renameInput.trim()) {
      onRenameProject(projectId, renameInput.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center space-x-2">
          {onSaveProject && (
            <button
              onClick={onSaveProject}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Now</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Missing Assets Warning Banner */}
      {missingAssets.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Missing Audio Assets Detected</p>
            <p className="text-amber-200/80 text-[11px]">
              {missingAssets.length} audio file{missingAssets.length > 1 ? 's are' : ' is'} missing from persistent storage. Surge Studio will not replace real takes with fake audio.
            </p>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Persistent Studio Sessions ({(projects || []).length})
          </h3>
        </div>

        {(!projects || projects.length === 0) ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Saved Projects</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Create a new studio project to record real vocal takes, arrange harmonies, and persist sessions across app restarts.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          (projects || []).map((proj) => (
            <div
              key={proj.id}
              className={`p-4 rounded-2xl border transition-all ${
                currentProject?.id === proj.id
                  ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handlePlayPreview(proj)}
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 flex items-center justify-center transition-transform active:scale-95 shrink-0"
                  >
                    {playingId === proj.id ? <Square className="w-4 h-4 text-rose-400" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div>
                    {renamingId === proj.id ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(proj.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{proj.title}</span>
                        {currentProject?.id === proj.id && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </h4>
                    )}

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                      <span>{proj.genre}</span>
                      <span>•</span>
                      <span>{proj.bpm} BPM</span>
                      <span>•</span>
                      <span>{proj.key} {proj.scale}</span>
                      <span>•</span>
                      <span>{(proj.tracks || []).length} tracks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleStartRename(proj)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title="Rename"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {onDuplicateProject && (
                    <button
                      onClick={() => onDuplicateProject(proj.id)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="Duplicate Project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setProjectToDelete(proj)}
                    className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Strip */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Updated: {new Date(proj.updatedAt).toLocaleDateString()} {new Date(proj.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      onNavigate('export');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 border border-slate-700"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      onNavigate('mixer');
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
                  >
                    <span>Open Studio</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Create New Studio Project</h3>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Project Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Breeze"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Base Musical Genre</label>
              <select
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option>Pop Ballad</option>
                <option>Synthwave 80s</option>
                <option>Lo-Fi Chill</option>
                <option>R&B Groove</option>
                <option>Hip Hop Boom Bap</option>
                <option>Trap Heavy 808</option>
                <option>Jazz Swing</option>
                <option>Electronic EDM</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Create & Open
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white">Delete Project?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete <span className="font-semibold text-white">"{projectToDelete.title}"</span>? This will clean up its unshared audio assets.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
