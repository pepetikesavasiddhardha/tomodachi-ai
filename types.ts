export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface UserProfile {
  email?: string;
  name?: string;
  age?: string | number;
  gender?: string;
  location?: string;
  bio?: string;
  summary: string;
  interests: string[];
}

export interface Companion {
  id: string;
  name: string;
  age: number;
  interests: string[];
  location: string;
  imageUrl: string;
  bio: string;
  score?: number; // Elastic similarity score
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
  imageUrl: string;
  description: string;
  tags: string[];
  score?: number;
}

export type AppView = 'welcome' | 'auth' | 'profile-setup' | 'chat' | 'dashboard' | 'companions' | 'events' | 'profile' | 'admin' | 'create-event';
