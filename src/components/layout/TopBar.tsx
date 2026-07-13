import React from 'react';

interface TopBarProps {
  profilePic: string;
  profesionalNombre: string;
  profesionalProfesion: string;
  activeTab: string;
  onSettingsClick: () => void;
  onProfilePicClick: () => void;
}

export function TopBar({ profilePic, profesionalNombre, profesionalProfesion, activeTab, onSettingsClick, onProfilePicClick }: TopBarProps) {
  return (
    <header className="fixed top-0 max-w-md w-full z-50 ios-blur bg-surface-bg/85 flex justify-between items-center px-5 py-3 h-16 border-b border-outline-variant/20 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          onClick={onProfilePicClick}
          className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/40 shadow-sm cursor-pointer hover:opacity-85 transition-opacity relative group"
          title="Haz clic para subir foto de perfil"
        >
          <img alt="Silvia Margarita Pérez F." className="w-full h-full object-cover" src={profilePic} />
        </div>
        <div>
          <h1 className="font-display font-bold text-primary leading-tight text-sm">{profesionalNombre}</h1>
          <p className="text-[10px] font-callout text-secondary font-semibold uppercase tracking-wider">{profesionalProfesion}</p>
        </div>
      </div>
      <button
        onClick={onSettingsClick}
        className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-95 duration-200 border ${activeTab === 'ajustes' ? 'border-secondary text-secondary' : 'border-outline-variant/10 text-primary'}`}
      >
        <span className="material-symbols-outlined text-xl">settings</span>
      </button>
    </header>
  );
}
