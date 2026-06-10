import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowRight } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { sendMessageToAgent as sendGeminiMessage, initChat, analyzeChatForProfile, extractUserProfile } from '../services/geminiService';
import { hasAgentId, createAgentSession, streamAgentMessage } from '../services/agentService';

interface ChatInterfaceProps {
  userProfile: UserProfile | null;
  existingSessionId: string | null;
  onSessionCreated: (id: string) => void;
  onProfileReady: (profile: UserProfile) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userProfile, existingSessionId, onSessionCreated, onProfileReady }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReadyToMatch, setIsReadyToMatch] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [useAgent, setUseAgent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      const init = async () => {
          if (hasAgentId()) {
              setUseAgent(true);
              try {
                  let sid = sessionId;
                  if (!sid) {
                      sid = await createAgentSession(userProfile?.email || 'anonymous');
                      setSessionId(sid);
                      onSessionCreated(sid);
                  }
                  handleSend("Hello", sid, true);
              } catch (e) {
                  console.error("Failed to init Agent session, falling back to Gemini", e);
                  setUseAgent(false);
                  initChat();
                  handleSend("Hello", null, false);
              }
          } else {
              initChat();
              handleSend("Hello", null, false);
          }
      };
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (textOverride?: string, currentSessionId?: string | null, isAgent?: boolean) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    if (!textOverride) {
        setMessages((prev) => [...prev, newUserMsg]);
        setInputValue('');
    }
    
    setIsLoading(true);
    
    const activeSessionId = currentSessionId !== undefined ? currentSessionId : sessionId;
    const activeUseAgent = isAgent !== undefined ? isAgent : useAgent;

    try {
      if (activeUseAgent && activeSessionId) {
          // 🚀 NEW ARCHITECTURE: Stream from GCP Agent Builder
          let fullResponse = "";
          const newModelMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: '',
              timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, newModelMsg]);
          setIsLoading(false); // Turn off main loader since we are streaming

          for await (const chunk of streamAgentMessage(activeSessionId, userProfile?.email || 'anonymous', textToSend)) {
              fullResponse += chunk;
              setMessages(prev => prev.map(m => m.id === newModelMsg.id ? { ...m, text: fullResponse } : m));
          }
          
          checkIfReadyToMatch([...messages, newUserMsg, { ...newModelMsg, text: fullResponse }]);
          
      } else {
          // 🚀 OLD ARCHITECTURE: Direct Gemini Call
          const responseText = await sendGeminiMessage(textToSend);
          
          const newModelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date(),
          };

          setMessages((prev) => {
              const updatedMessages = [...prev, newModelMsg];
              checkIfReadyToMatch(updatedMessages);
              return updatedMessages;
          });
          setIsLoading(false);
      }

    } catch (error) {
      console.error("Chat error", error);
      setIsLoading(false);
    }
  };

  const checkIfReadyToMatch = (updatedMessages: Message[]) => {
      if (updatedMessages.length > 4 && !isReadyToMatch) {
          const historyText = updatedMessages.map(m => `${m.role}: ${m.text}`).join('\n');
          analyzeChatForProfile(historyText).then(isReady => {
              if (isReady) setIsReadyToMatch(true);
          });
      }
  };

  const handleFinishChat = async () => {
      setIsExtracting(true);
      const historyText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
      const profile = await extractUserProfile(historyText);
      setIsExtracting(false);
      onProfileReady(profile);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-warm-200">
      <div className="bg-brand-600 text-white p-6 text-center relative">
        <h2 className="text-2xl font-bold">Chat with Tomodachi</h2>
        <p className="text-brand-100 mt-1 text-lg">I'm here to listen and help you find local activities.</p>
        {useAgent && (
            <span className="absolute top-2 right-2 bg-brand-800 text-xs px-2 py-1 rounded-full font-mono">
                Agent Active
            </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-warm-50">
        {messages.filter(m => m.text !== "Hello").map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-5 rounded-2xl text-xl leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-warm-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-warm-200 p-5 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <span className="text-lg text-gray-500">Tomodachi is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isReadyToMatch && (
        <div className="bg-brand-50 p-4 border-t border-brand-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-brand-900 text-lg font-medium text-center sm:text-left">
                I think I know enough to suggest some great people and events nearby!
            </p>
            <button
                onClick={handleFinishChat}
                disabled={isExtracting}
                className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-6 py-3 rounded-xl text-lg font-bold transition-colors shadow-md whitespace-nowrap"
            >
                {isExtracting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Searching...</span></>
                ) : (
                    <><span>See My Matches</span><ArrowRight className="w-5 h-5" /></>
                )}
            </button>
        </div>
      )}

      <div className="p-4 bg-white border-t border-warm-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message here..."
            className="flex-1 p-4 text-xl bg-warm-50 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            disabled={isLoading || isExtracting}
            aria-label="Chat input"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim() || isExtracting}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-xl transition-colors flex items-center justify-center shadow-md"
            aria-label="Send message"
          >
            <Send className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
};
