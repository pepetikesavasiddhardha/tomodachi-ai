import { GoogleGenAI, Chat } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';
import { UserProfile } from '../types';

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getGeminiApiKey = (): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env as Record<string, string | undefined>;
      return env.VITE_GEMINI_API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';
    }
  } catch (e) {
    console.warn('Unable to read Vite env for Gemini API key.', e);
  }

  return '';
};

const getAI = () => {
  if (!aiInstance) {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new Error('Missing Gemini API key. Add VITE_GEMINI_API_KEY to Netlify or your local .env file.');
    }

    aiInstance = new GoogleGenAI({ apiKey, vertexai: false });
  }

  return aiInstance;
};

export const initChat = (): Chat => {
  const ai = getAI();
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
  return chatSession;
};

export const sendMessageToAgent = async (message: string): Promise<string> => {
  if (!chatSession) {
    initChat();
  }
  
  try {
    const response = await chatSession!.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "I'm sorry, I'm having a little trouble hearing you right now. Could you try saying that again?";
  }
};

export const analyzeChatForProfile = async (chatHistoryText: string): Promise<boolean> => {
    const ai = getAI();
    const prompt = `
    Analyze the following conversation between an AI and a senior user.
    Determine if we have gathered enough information to suggest local events and companions.
    We need at least:
    1. A general sense of their location or living situation.
    2. At least one or two hobbies/interests.
    
    Conversation:
    ${chatHistoryText}
    
    Respond ONLY with "READY" if we have enough info, or "NOT_READY" if we need more.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim().toUpperCase() === 'READY';
    } catch (e) {
        return false;
    }
};

export const extractUserProfile = async (chatHistoryText: string): Promise<UserProfile> => {
    const ai = getAI();
    const prompt = `
    Based on the following conversation, create a concise summary of the user's profile.
    Include their location, age (if mentioned), mobility constraints, and personality traits.
    Also extract a comma-separated list of their interests.
    
    Conversation:
    ${chatHistoryText}
    
    Format your response exactly like this:
    SUMMARY: [A 2-3 sentence description of the person]
    INTERESTS: [comma separated list]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const text = response.text;
        const summaryMatch = text.match(/SUMMARY:\s*(.*)/i);
        const interestsMatch = text.match(/INTERESTS:\s*(.*)/i);
        
        return {
            summary: summaryMatch ? summaryMatch[1].trim() : "A senior looking for companionship.",
            interests: interestsMatch ? interestsMatch[1].split(',').map((i: string) => i.trim()) : []
        };
    } catch (e) {
        console.error("Failed to extract profile", e);
        return { summary: "A senior looking for companionship.", interests: [] };
    }
};

// Generates a 768-dimensional vector embedding for Elastic Vector Search
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const ai = getAI();
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
    });
    
    if (response.embeddings && response.embeddings.length > 0) {
        return response.embeddings[0].values;
    }
    throw new Error("No embeddings returned from Gemini API.");
};
