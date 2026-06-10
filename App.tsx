import React, { useState, useEffect } from 'react';
import { AppView, Companion, Event, UserProfile } from './types';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { CompanionsList } from './components/CompanionsList';
import { EventsList } from './components/EventsList';
import { CreateEvent } from './components/CreateEvent';
import { Navigation } from './components/Navigation';
import { AdminSetup } from './components/AdminSetup';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { HeartHandshake, Settings, LogOut, Loader2 } from 'lucide-react';
import { searchCompanions, searchEvents, initializeConfig, saveUser } from './services/elasticService';
import { initializeAgentConfig, hasAgentId, createAgentSession, getMatchesViaAgent } from './services/agentService';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tempAuth, setTempAuth] = useState({ email: '', password: '' });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [adminError, setAdminError] = useState<string>('');
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);

  // Initialize config immediately on app load so credentials are ready
  useEffect(() => {
    Promise.all([initializeConfig(), initializeAgentConfig()]).then(() => {
      setIsInitializing(false);
    });
  }, []);

  const fetchMatches = async (profile: UserProfile) => {
    try {
      await initializeConfig();
      await initializeAgentConfig();

      if (hasAgentId()) {
        // 🚀 NEW ARCHITECTURE: Fetch matches via the GCP Agent + Elastic MCP Server
        console.log("Fetching matches via GCP Agent Builder & MCP...");
        let sessionId = agentSessionId;
        if (!sessionId) {
            sessionId = await createAgentSession(profile.email || 'default');
            setAgentSessionId(sessionId);
        }
        const matches = await getMatchesViaAgent(profile, sessionId);
        setCompanions(matches.companions || []);
        setEvents(matches.events || []);
      } else {
        // 🚀 OLD ARCHITECTURE: Fetch matches directly from Elasticsearch
        console.log("Fetching matches directly from Elasticsearch...");
        const [fetchedCompanions, fetchedEvents] = await Promise.all([
          searchCompanions(profile),
          searchEvents(profile)
        ]);
        setCompanions(fetchedCompanions);
        setEvents(fetchedEvents);
      }
      
      setAdminError('');
    } catch (error: any) {
      console.error("Search Error:", error);
      setAdminError(`Search failed: ${error.message}`);
      setCurrentView('admin');
      throw error;
    }
  };

  const handleLogin = async (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView('dashboard');
    await fetchMatches(profile);
  };

  const handleSignupStep1 = (email: string, password: string) => {
    setTempAuth({ email, password });
    setCurrentView('profile-setup');
  };

  const handleProfileSetupComplete = async (profile: UserProfile) => {
    const fullProfile = { ...profile, email: tempAuth.email };
    try {
      await saveUser(fullProfile, tempAuth.password);
      setUserProfile(fullProfile);
      setCurrentView('dashboard');
      await fetchMatches(fullProfile);
    } catch (error: any) {
      alert(`Failed to save profile: ${error.message}`);
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    try {
      await saveUser(updatedProfile); // Password not needed for update
      setUserProfile(updatedProfile);
      await fetchMatches(updatedProfile); // Refresh matches based on new info
    } catch (error: any) {
      alert(`Failed to update profile: ${error.message}`);
    }
  };

  const handleChatProfileReady = async (profile: UserProfile) => {
    // If user chats to update profile, merge and save
    const mergedProfile = { ...userProfile, ...profile };
    await handleUpdateProfile(mergedProfile);
    setCurrentView('dashboard');
  };

  const handleEventCreated = async () => {
    if (userProfile) {
      try {
        if (hasAgentId() && agentSessionId) {
            const matches = await getMatchesViaAgent(userProfile, agentSessionId);
            setEvents(matches.events || []);
        } else {
            const updatedEvents = await searchEvents(userProfile);
            setEvents(updatedEvents);
        }
      } catch (error) {
        console.error("Failed to refresh events:", error);
      }
    }
    setCurrentView('events');
  };

  const handleSignOut = () => {
    // Clear user session data here if needed
    setUserProfile(null);
    setCompanions([]);
    setEvents([]);
    setTempAuth({ email: '', password: '' });
    setAgentSessionId(null);
    setCurrentView('welcome');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50">
        <Loader2 className="w-12 h-12 animate-spin text-brand-600 mb-4" />
        <p className="text-gray-600 font-medium">Loading Tomodachi AI...</p>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'welcome':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
            <button 
                onClick={() => { setAdminError(''); setCurrentView('admin'); }}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 flex items-center space-x-2"
            >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-bold">Dev Setup</span>
            </button>
            <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full border border-warm-200">
              <div className="w-24 h-24 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <HeartHandshake className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Tomodachi AI</h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Your personal companion to help you discover local activities and meet wonderful people nearby using Elastic Vector Search.
              </p>
              <button
                onClick={() => setCurrentView('auth')}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white text-2xl font-bold py-5 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02]"
              >
                Get Started
              </button>
            </div>
          </div>
        );
      case 'auth':
        return <Auth onLogin={handleLogin} onSignupStep1={handleSignupStep1} onBack={() => setCurrentView('welcome')} />;
      case 'profile-setup':
        return <Profile profile={null} isSetup={true} onUpdateProfile={handleProfileSetupComplete} />;
      case 'chat':
        return (
          <div className="h-screen p-4 md:p-8 pb-24">
            <ChatInterface 
                userProfile={userProfile} 
                onProfileReady={handleChatProfileReady} 
                existingSessionId={agentSessionId}
                onSessionCreated={setAgentSessionId}
            />
          </div>
        );
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} companions={companions} events={events} />;
      case 'companions':
        return <CompanionsList companions={companions} />;
      case 'events':
        return <EventsList events={events} onNavigate={setCurrentView} />;
      case 'create-event':
        return <CreateEvent onBack={() => setCurrentView('events')} onCreated={handleEventCreated} />;
      case 'profile':
        return <Profile profile={userProfile} onUpdateProfile={handleUpdateProfile} />;
      case 'admin':
        return <AdminSetup 
            initialError={adminError} 
            onRetry={userProfile ? () => fetchMatches(userProfile).then(() => setCurrentView('dashboard')) : undefined} 
        />;
      default:
        return <div>View not found</div>;
    }
  };

  const isHeaderHidden = currentView === 'welcome' || currentView === 'auth' || currentView === 'profile-setup' || currentView === 'chat';

  return (
    <div className="min-h-screen bg-warm-50 font-sans">
      {!isHeaderHidden && (
        <header className="bg-white border-b border-warm-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">Tomodachi</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-500 hover:text-red-600 transition-colors font-medium"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      <main className={`pt-6 px-4 md:px-8 ${!isHeaderHidden ? 'pb-28' : ''}`}>
        {renderView()}
      </main>

      <Navigation currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;
