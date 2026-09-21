import React from 'react';
import { 
  Check, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { ScreenId, StudioProject } from '../types/audio';
import { 
  PRODUCTION_STAGES, 
  getStageIndex, 
  isStageCompleted, 
  isStageNeedsUpdate, 
  canAccessStage 
} from '../utils/productionNavigation';

interface ProductionProgressProps {
  currentScreen: ScreenId;
  currentProject: StudioProject | null;
  onNavigate?: (screen: ScreenId) => void;
  compact?: boolean;
}

export const ProductionProgress: React.FC<ProductionProgressProps> = ({
  currentScreen,
  currentProject,
  onNavigate,
  compact = false
}) => {
  const currentIndex = getStageIndex(currentScreen);
  const currentStageMeta = PRODUCTION_STAGES[currentIndex] || PRODUCTION_STAGES[0];

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 shadow-lg mb-4">
      {/* Header with Step indicator & stage description */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2 px-1">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold">
            {currentStageMeta.name}
          </span>
          <span className="hidden sm:inline text-[10px] text-slate-400 font-normal">
            • {currentStageMeta.description}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Stage {currentIndex + 1} of {PRODUCTION_STAGES.length}
        </span>
      </div>

      {/* 9-Stage Interactive Navigation Bar */}
      <div className="grid grid-cols-9 gap-1 relative">
        {PRODUCTION_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = isStageCompleted(currentProject, stage.id);
          const isCurrent = currentScreen === stage.id;
          const needsUpdate = isStageNeedsUpdate(currentProject, stage.id);
          const accessible = canAccessStage(currentProject, stage.id);

          const handleClick = () => {
            if (accessible && onNavigate && !isCurrent) {
              onNavigate(stage.id);
            }
          };

          return (
            <button
              key={stage.id}
              onClick={handleClick}
              disabled={!accessible}
              title={`${stage.name}${needsUpdate ? ' (Needs Update)' : isCompleted ? ' (Completed)' : ''}`}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
                isCurrent
                  ? 'bg-indigo-600/35 border border-indigo-500/60 text-indigo-200 font-bold shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/30'
                  : needsUpdate
                  ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300 font-medium hover:bg-amber-950/60 cursor-pointer animate-pulse'
                  : isCompleted
                  ? 'bg-slate-800/60 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-slate-800 cursor-pointer'
                  : accessible
                  ? 'bg-slate-950/50 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  : 'bg-slate-950/30 border border-slate-800/30 text-slate-400 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="relative mb-0.5 flex items-center justify-center">
                {isCurrent ? (
                  <Icon className="w-3.5 h-3.5 text-indigo-300" />
                ) : needsUpdate ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] leading-tight truncate w-full text-center">
                {stage.shortName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

