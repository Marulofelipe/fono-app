import React from 'react';

type TabId = 'inicio' | 'agenda' | 'pacientes' | 'registros' | 'bonos' | 'ajustes';

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'inicio', icon: 'home', label: 'Inicio' },
  { id: 'agenda', icon: 'calendar_month', label: 'Agenda' },
  { id: 'pacientes', icon: 'group', label: 'Pacientes' },
  { id: 'registros', icon: 'description', label: 'Registros' },
  { id: 'bonos', icon: 'redeem', label: 'Bonos' },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 max-w-md w-full z-40 bg-surface-bg/90 ios-blur border-t border-outline-variant/20 flex justify-around items-center h-16 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === tab.id ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === tab.id ? '"FILL" 1' : '"FILL" 0' }}>{tab.icon}</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
