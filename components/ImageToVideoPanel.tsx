/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ImageToVideoPanelProps {
  onGenerateVideo: (prompt: string) => void;
  isLoading: boolean;
}

const ImageToVideoPanel: React.FC<ImageToVideoPanelProps> = ({ onGenerateVideo, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const presets = [
    'A gentle breeze causes the leaves on the trees to sway softly.',
    'A cinematic, slow zoom-in on the main subject.',
    'The clouds in the sky move slowly from left to right.',
    'Subtle steam rises from the coffee cup.',
  ];

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerateVideo(prompt);
    }
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-300">Generate Video from Image</h3>
        <p className="text-sm text-gray-400">Describe the motion you want to see. Video generation can take several minutes.</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => setPrompt(preset)}
            disabled={isLoading}
            className="w-full h-full text-left text-sm bg-white/10 border border-transparent text-gray-300 font-medium p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {preset}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., 'Make the waterfall flow realistically.'"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base min-h-[80px]"
        disabled={isLoading}
      />
      
      <button
        onClick={handleGenerate}
        className="w-full bg-gradient-to-br from-teal-600 to-cyan-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none mt-2"
        disabled={isLoading || !prompt.trim()}
      >
        Generate Video
      </button>
    </div>
  );
};

export default ImageToVideoPanel;
