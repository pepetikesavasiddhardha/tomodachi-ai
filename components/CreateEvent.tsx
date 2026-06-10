import React, { useState } from 'react';
import { ArrowLeft, Loader2, CalendarPlus } from 'lucide-react';
import { createEvent } from '../services/elasticService';

interface CreateEventProps {
  onBack: () => void;
  onCreated: () => void;
}

export const CreateEvent: React.FC<CreateEventProps> = ({ onBack, onCreated }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !location || !description) return;

    setIsSubmitting(true);
    
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    await createEvent({
      title,
      date,
      location,
      description,
      tags: tagArray,
      attendees: 1, // The creator
      imageUrl: `https://picsum.photos/400/200?random=${Math.floor(Math.random() * 1000)}`
    });

    setIsSubmitting(false);
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <button 
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-brand-600 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Events</span>
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-warm-200">
        <div className="flex items-center space-x-3 mb-8 text-orange-600">
          <CalendarPlus className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-gray-900">Organize an Event</h1>
        </div>

        <p className="text-gray-600 mb-8 text-lg">
          Create a gathering for the community. Once submitted, your event will be analyzed by our AI, converted into a vector embedding, and stored in the Elastic database so others can discover it through semantic search!
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Event Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunday Morning Chess Club"
              className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Date & Time</label>
              <input 
                type="text" 
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g., Next Sunday, 10:00 AM"
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
              <input 
                type="text" 
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Yoyogi Park"
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'll be doing, who should join, and any accessibility notes..."
              rows={4}
              className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tags (comma separated)</label>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., Board Games, Indoor, Quiet"
              className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-4 rounded-xl text-xl font-bold transition-colors shadow-md flex items-center justify-center space-x-2 mt-8"
          >
            {isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /><span>Indexing to Elastic...</span></>
            ) : (
              <span>Publish Event</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
