import React from 'react';
import { Music2, Cpu, Sparkles, Smartphone, Check, CloudOff, RefreshCw } from 'lucide-react';
import { StudioProject, ScreenId, SaveStatus } from '../types/audio';

interface HeaderProps {
  currentProject?: StudioProject | null;
  activeProject?: StudioProject | null;
  activeScreen?: ScreenId;
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isProcessing?: boolean;
  saveStatus?: SaveStatus;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  activeProject,
  activeScreen,
  currentScreen,
  onNavigate,
  isProcessing = false,
  saveStatus = 'saved',
}) => {
  const screen = currentScreen || activeScreen || 'home';
  const project = activeProject || currentProject || null;

  const renderSaveStatusBadge = () => {
    if (!project) return null;

    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full text-[10px] font-medium animate-pulse">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Unsaved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-medium">
            <CloudOff className="w-2.5 h-2.5" />
            <span>Save error</span>
          </div>
        );
      case 'saved':
      default:
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-medium">
            <Check className="w-2.5 h-2.5" />
            <span>Saved</span>
          </div>
        );
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm">
      <div 
        className="flex items-center space-x-2.5 cursor-pointer"
        onClick={() => onNavigate('home')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-sm text-white tracking-tight">MUSICBASE</span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
              Surge
            </span>
            {renderSaveStatusBadge()}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Offline Singing & Production</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onNavigate('omni_test')}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/40 text-purple-300 hover:text-white hover:border-purple-400 text-xs font-bold transition-all shadow-sm"
          title="Google Gemini AI Keys & Omni Mode Center"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="hidden sm:inline">Online Gemini AI</span>
        </button>

        <a
          href="/SurgeStudio.apk"
          download="SurgeStudio.apk"
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          title="Download Android APK (SurgeStudio.apk)"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">APK</span>
        </a>

        {isProcessing && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium animate-pulse">
            <Sparkles className="w-3 h-3" />
            <span>Processing...</span>
          </div>
        )}

        <button
          onClick={() => onNavigate('settings')}
          className={`p-2 rounded-lg transition-colors border ${
            screen === 'settings'
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
          title="Studio Settings & Engine Diagnostics"
        >
          <Cpu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

