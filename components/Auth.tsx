import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, HeartHandshake, AlertCircle, ArrowLeft } from 'lucide-react';
import { loginUser, checkUserExists, initializeConfig } from '../services/elasticService';
import { UserProfile } from '../types';

interface AuthProps {
  onLogin: (profile: UserProfile) => void;
  onSignupStep1: (email: string, password: string) => void;
  onBack: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onSignupStep1, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError('');
    
    try {
      // Ensure config is loaded right before making the API call
      await initializeConfig();

      if (isLogin) {
        // Attempt to login
        const profile = await loginUser(email, password);
        onLogin(profile);
      } else {
        // Attempt to signup
        const exists = await checkUserExists(email);
        if (exists) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          onSignupStep1(email, password);
        }
      }
    } catch (err: any) {
      if (err.message.includes("credentials are missing")) {
        setError("Database credentials missing. Please go back and click the Dev Setup (⚙️) icon to configure them.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-md mb-4">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Welcome</span>
        </button>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-warm-200">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center shadow-inner">
            <HeartHandshake className="w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-gray-500 mb-8">
          {isLogin ? 'Sign in to continue your journey.' : 'Join our community today.'}
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-4 rounded-xl text-lg font-bold transition-colors shadow-md flex items-center justify-center space-x-2 mt-4"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Continue'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-brand-600 font-bold hover:underline focus:outline-none"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
