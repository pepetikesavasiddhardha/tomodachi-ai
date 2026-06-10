import React, { useState } from 'react';
import { User, Save, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  isSetup?: boolean;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const Profile: React.FC<ProfileProps> = ({ profile, isSetup = false, onUpdateProfile }) => {
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [interestsStr, setInterestsStr] = useState(profile?.interests?.join(', ') || '');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const interestsArray = interestsStr.split(',').map(i => i.trim()).filter(i => i.length > 0);

    const updatedProfile: UserProfile = {
      ...profile,
      name,
      age,
      gender,
      location,
      bio,
      summary: profile?.summary || bio,
      interests: interestsArray
    };

    await onUpdateProfile(updatedProfile);
    
    setIsSubmitting(false);
    if (!isSetup) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-warm-200">
        <div className="flex items-center space-x-3 mb-8 text-brand-600">
          <User className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isSetup ? 'Complete Your Profile' : 'My Profile'}
          </h1>
        </div>
        
        <p className="text-gray-600 mb-8 text-lg">
          {isSetup 
            ? "Welcome! Please fill out these details so Tomodachi AI can find the best companions and events for you."
            : "Update your personal details here. This information helps Tomodachi AI find the best companions and events for you."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                required={isSetup}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
              <input 
                type="number" 
                required={isSetup}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 65"
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
              <select 
                required={isSetup}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg appearance-none transition-all"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
              <input 
                type="text" 
                required={isSetup}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Shibuya, Tokyo"
                className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Short Bio</label>
            <input 
              type="text" 
              required={isSetup}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g., I am a retired teacher looking for peaceful moments."
              className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Interests & Hobbies (Comma separated)</label>
            <input 
              type="text" 
              required={isSetup}
              value={interestsStr}
              onChange={(e) => setInterestsStr(e.target.value)}
              placeholder="e.g., Gardening, Chess, Slow Walks"
              className="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white px-6 py-4 rounded-xl text-xl font-bold transition-colors shadow-md flex items-center justify-center space-x-2 mt-8 ${
              isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-600 hover:bg-brand-700'
            } disabled:bg-brand-400`}
          >
            {isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /><span>Saving...</span></>
            ) : isSaved ? (
              <><CheckCircle className="w-6 h-6" /><span>Saved Successfully!</span></>
            ) : isSetup ? (
              <><span>Complete Setup</span><ArrowRight className="w-6 h-6" /></>
            ) : (
              <><Save className="w-6 h-6" /><span>Save Profile</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
