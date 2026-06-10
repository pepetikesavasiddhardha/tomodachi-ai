import React from 'react';
import { Users, Calendar, MapPin, Heart, Bell, ChevronRight } from 'lucide-react';
import { AppView, Companion, Event } from '../types';

interface DashboardProps {
  onNavigate: (view: AppView) => void;
  companions: Companion[];
  events: Event[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, companions, events }) => {
  const topMatch = companions[0];
  const topEvent = events[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="bg-white p-8 rounded-3xl shadow-sm border border-warm-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-xl text-gray-600">
          Based on our chat, I've searched the local community using Elastic Vector Search and found some wonderful people and activities you might enjoy.
        </p>
      </header>

      {topMatch && (
        <section className="bg-brand-50 border-2 border-brand-200 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-500 text-white px-4 py-1 rounded-bl-xl font-medium flex items-center space-x-1">
              <Bell className="w-4 h-4" />
              <span>Top Semantic Match</span>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mt-4">
              <div className="bg-white p-4 rounded-full shadow-sm text-brand-600">
                  <Heart className="w-10 h-10" />
              </div>
              <div className="flex-1">
                  <h2 className="text-2xl font-bold text-brand-900 mb-2">You have a lot in common with {topMatch.name}!</h2>
                  <p className="text-lg text-brand-800 mb-4">
                      Like you, {topMatch.name} enjoys {topMatch.interests.join(' and ')}. They live in {topMatch.location}. Would you like to send a friendly hello?
                  </p>
                  <button 
                      onClick={() => onNavigate('companions')}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl text-lg font-bold transition-colors shadow-md"
                  >
                      View Profile
                  </button>
              </div>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-warm-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 text-brand-700">
              <Users className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Local Companions</h2>
            </div>
            <span className="bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-sm font-bold">
              {companions.length} Matches
            </span>
          </div>
          
          <div className="space-y-4 flex-1">
            {companions.slice(0, 2).map(companion => (
              <div key={companion.id} className="flex items-center space-x-4 p-3 hover:bg-warm-50 rounded-xl transition-colors">
                <img src={companion.imageUrl} alt={companion.name} className="w-16 h-16 rounded-full object-cover border-2 border-warm-200" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{companion.name}, {companion.age}</h3>
                  <p className="text-gray-600 flex items-center text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" /> {companion.location}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onNavigate('companions')}
            className="mt-6 w-full py-4 flex items-center justify-center space-x-2 text-brand-700 font-bold text-lg hover:bg-brand-50 rounded-xl transition-colors border border-brand-200"
          >
            <span>See All Companions</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </section>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-warm-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 text-orange-600">
              <Calendar className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Suggested Events</h2>
            </div>
             <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
              {events.length} Nearby
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {events.slice(0, 2).map(event => (
              <div key={event.id} className="flex items-start space-x-4 p-3 hover:bg-warm-50 rounded-xl transition-colors">
                <img src={event.imageUrl} alt={event.title} className="w-20 h-20 rounded-xl object-cover border border-warm-200" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{event.title}</h3>
                  <p className="text-orange-600 font-medium text-sm mt-1">{event.date}</p>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-1">{event.location}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onNavigate('events')}
            className="mt-6 w-full py-4 flex items-center justify-center space-x-2 text-orange-700 font-bold text-lg hover:bg-orange-50 rounded-xl transition-colors border border-orange-200"
          >
            <span>Explore All Events</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </section>
      </div>
    </div>
  );
};
