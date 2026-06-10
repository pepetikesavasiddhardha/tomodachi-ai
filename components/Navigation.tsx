import React from 'react';
import { Home, Users, Calendar, MessageSquare, Settings, User } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  if (currentView === 'welcome' || currentView === 'auth' || currentView === 'chat') return null;

  const navItems = [
    { id: 'dashboard' as AppView, icon: Home, label: 'Home' },
    { id: 'companions' as AppView, icon: Users, label: 'People' },
    { id: 'events' as AppView, icon: Calendar, label: 'Events' },
    { id: 'chat' as AppView, icon: MessageSquare, label: 'Tomodachi' },
    { id: 'profile' as AppView, icon: User, label: 'Profile' },
    { id: 'admin' as AppView, icon: Settings, label: 'Setup' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center p-1 sm:p-2 rounded-xl transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 sm:p-2 rounded-full ${isActive ? 'bg-brand-50' : ''}`}>
                <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${isActive ? 'fill-brand-50' : ''}`} />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold mt-1 ${isActive ? 'text-brand-700' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
