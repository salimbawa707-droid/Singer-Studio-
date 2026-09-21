import React from 'react';
import { Home, Mic, Wand2, FolderOpen, Settings } from 'lucide-react';
import { ScreenId } from '../types/audio';

interface BottomNavProps {
  activeScreen?: ScreenId;
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, currentScreen, onNavigate }) => {
  const current = currentScreen || activeScreen || 'home';
  const navItems = [
    { id: 'home' as ScreenId, label: 'Home', icon: Home },
    { id: 'record' as ScreenId, label: 'Recorder', icon: Mic },
    { id: 'pipeline' as ScreenId, label: 'Studio Flow', icon: Wand2 },
    { id: 'projects' as ScreenId, label: 'Projects', icon: FolderOpen },
    { id: 'settings' as ScreenId, label: 'Settings', icon: Settings },
  ];

  const isStudioScreen = ['pipeline', 'director', 'cleanup', 'pitch', 'bpm_key', 'accompaniment', 'mixer', 'mastering', 'export'].includes(current);

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 sm:px-4 py-2 z-40 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === 'record' 
          ? current === 'record' 
          : item.id === 'pipeline' 
          ? isStudioScreen 
          : current === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 relative ${
              isActive
                ? 'text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-transform ${isActive ? 'bg-indigo-500/20 scale-105' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            {isActive && (
              <span className="absolute -bottom-1 w-4 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

