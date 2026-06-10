import React from 'react';
import { MapPin, Heart, MessageCircle } from 'lucide-react';
import { Companion } from '../types';

interface CompanionsListProps {
  companions: Companion[];
}

export const CompanionsList: React.FC<CompanionsListProps> = ({ companions }) => {
  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Community Matches</h1>
        <p className="text-xl text-gray-600 mt-2">
          These individuals share similar interests and live nearby. 
          <br/><span className="text-brand-600 font-medium text-sm">Powered by Elastic Vector Search</span>
        </p>
      </div>

      <div className="space-y-6">
        {companions.map((companion) => (
          <div key={companion.id} className="bg-white p-6 rounded-3xl shadow-sm border border-warm-200 flex flex-col md:flex-row gap-6 items-start">
            <img 
              src={companion.imageUrl} 
              alt={companion.name} 
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-brand-100 mx-auto md:mx-0"
            />
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{companion.name}, {companion.age}</h2>
                {companion.score && (
                  <div className="inline-flex items-center justify-center space-x-1 bg-brand-50 text-brand-700 px-3 py-1 rounded-full mt-2 md:mt-0">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm">{companion.score}% Match</span>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 flex items-center justify-center md:justify-start text-lg mb-4">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" /> {companion.location}
              </p>
              
              <p className="text-gray-800 text-lg mb-4 leading-relaxed">
                "{companion.bio}"
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                {companion.interests.map(interest => (
                  <span key={interest} className="bg-warm-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-medium">
                    {interest}
                  </span>
                ))}
              </div>

              <div className="flex gap-4 justify-center md:justify-start">
                <button className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl text-lg font-bold transition-colors shadow-md flex items-center justify-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Say Hello</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
