import React, { useState } from 'react';
import { Calendar, MapPin, Users, ArrowRight, Plus, CheckCircle } from 'lucide-react';
import { Event, AppView } from '../types';

interface EventsListProps {
  events: Event[];
  onNavigate: (view: AppView) => void;
}

export const EventsList: React.FC<EventsListProps> = ({ events, onNavigate }) => {
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);

  const handleRegister = (eventId: string) => {
    setRegisteredEventIds(prev => [...prev, eventId]);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recommended Activities</h1>
          <p className="text-xl text-gray-600 mt-2">
            Local events and gatherings that match your interests.
            <br/><span className="text-orange-600 font-medium text-sm">Powered by Elastic Vector Search</span>
          </p>
        </div>
        <button 
          onClick={() => onNavigate('create-event')}
          className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-5 py-3 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2 border border-orange-200 shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          <span>Organize Event</span>
        </button>
      </div>

      <div className="grid gap-8">
        {events.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center border border-warm-200">
            <p className="text-gray-500 text-lg">No events found matching your profile. Why not organize one?</p>
          </div>
        ) : (
          events.map((event) => {
            const isRegistered = registeredEventIds.includes(event.id);

            return (
              <div key={event.id} className="bg-white rounded-3xl shadow-sm border border-warm-200 overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-2/5 h-64 md:h-auto relative">
                  <img 
                    src={event.imageUrl} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
                    <p className="text-orange-600 font-bold text-lg">{event.date.split(',')[0]}</p>
                  </div>
                </div>
                
                <div className="p-6 md:p-8 md:w-3/5 flex flex-col">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.tags.map(tag => (
                      <span key={tag} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-bold border border-orange-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h2>
                  
                  <div className="space-y-3 mb-6">
                    <p className="text-gray-600 flex items-center text-lg">
                      <Calendar className="w-5 h-5 mr-3 text-gray-400" /> 
                      {event.date}
                    </p>
                    <p className="text-gray-600 flex items-center text-lg">
                      <MapPin className="w-5 h-5 mr-3 text-gray-400" /> 
                      {event.location}
                    </p>
                    <p className="text-gray-600 flex items-center text-lg">
                      <Users className="w-5 h-5 mr-3 text-gray-400" /> 
                      {event.attendees + (isRegistered ? 1 : 0)} people attending
                    </p>
                  </div>
                  
                  <p className="text-gray-700 text-lg mb-8 flex-1">
                    {event.description}
                  </p>
                  
                  {isRegistered ? (
                    <div className="w-full bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-lg">Registered Successfully!</span>
                      </div>
                      <p className="text-sm text-center text-green-700">
                        Thank you, you have registered for the event and you will get further communication from the organizer.
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleRegister(event.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-xl text-lg font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
                    >
                      <span>I'm Interested</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
