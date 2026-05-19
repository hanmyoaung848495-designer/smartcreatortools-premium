
import React from 'react';
import { motion } from 'motion/react';
import { LogIn, Crown, Globe, Command } from 'lucide-react';

interface Props {
  onLoginClick: () => void;
}

const LandingScreen: React.FC<Props> = ({ onLoginClick }) => {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="relative w-full max-w-sm">
        {/* Animated Gradient Border Container */}
        <div className="relative p-[2px] rounded-2xl overflow-hidden animate-gradient-border-premium">
          <div className="bg-white dark:bg-gray-800 rounded-[14px] p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-6">
              <Crown className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            
            <h1 className="text-2xl font-black mb-2 bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 bg-clip-text text-transparent">Smart Creator Tools Premium</h1>
            <p className="mb-8 font-bold bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent">Premium User များသာအသုံးပြုနိုင်ပါသည်</p>

            <div className="w-full space-y-3">
              <button onClick={onLoginClick} className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                <LogIn className="w-4 h-4" /> Log in
              </button>
              
              <a href="https://t.me/kcteamofficialbot" target="_blank" rel="noopener noreferrer" className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors">
                <Crown className="w-4 h-4" /> Buy Premium Plan
              </a>

              <a href="https://smartcreatortools.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                <Globe className="w-4 h-4" /> Free Website
              </a>
              
              <a href="https://kcteamoffical.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors">
                <Command className="w-4 h-4" /> KC Team Official Website
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
