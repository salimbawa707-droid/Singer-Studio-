import React from 'react';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';
import { ScreenId, StudioProject } from '../types/audio';
import { getPreviousProductionStage } from '../utils/productionNavigation';

interface ProductionStageHeaderProps {
  currentScreen: ScreenId;
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const ProductionStageHeader: React.FC<ProductionStageHeaderProps> = ({
  currentScreen,
  currentProject,
  onNavigate,
  title,
  subtitle,
  rightAction,
}) => {
  const previousStage = getPreviousProductionStage(currentScreen);

  const handleBack = () => {
    onNavigate(previousStage);
  };

  const handleHome = () => {
    // Navigate home while keeping project intact
    onNavigate('home');
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
      {/* Back Button - Returns to previous production stage */}
      <button
        onClick={handleBack}
        id="production-back-button"
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-sm active:scale-95 group"
        title={`Back to ${previousStage}`}
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back</span>
      </button>

      {/* Screen Title / Context Info */}
      <div className="text-center">
        {title && <h2 className="text-xs font-bold text-white truncate max-w-[170px]">{title}</h2>}
        {subtitle ? (
          <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{subtitle}</p>
        ) : currentProject?.title ? (
          <p className="text-[10px] text-indigo-400 font-medium truncate max-w-[170px]">{currentProject.title}</p>
        ) : null}
      </div>

      {/* Right Actions / Home Button */}
      <div className="flex items-center space-x-1.5">
        {rightAction}
        <button
          onClick={handleHome}
          id="production-home-button"
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-300 transition-all text-xs font-medium active:scale-95"
          title="Return to Home (Active project preserved)"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>
    </div>
  );
};
