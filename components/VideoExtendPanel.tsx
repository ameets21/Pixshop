/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';

interface VideoExtendPanelProps {
  lastFrame: File;
  onGenerate: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const VideoExtendPanel: React.FC<VideoExtendPanelProps> = ({ lastFrame, onGenerate, onCancel, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const presets = [
    'Continue the action smoothly.',
    'The camera pans to the right.',
    'A new character enters the scene from the left.',
    'The scene slowly fades to black.',
  ];

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const frameUrl = useMemo(() => {
    return URL.createObjectURL(lastFrame);
  }, [lastFrame]);

  useEffect(() => {
    // Cleanup object URL when component unmounts or file changes
    return () => URL.revokeObjectURL(frameUrl);
  }, [frameUrl]);

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-300">Create Follow-up Video</h3>
        <p className="text-sm text-gray-400">Describe what happens next, starting from the last frame of your previous video.</p>
      </div>
      
      <div className="flex justify-center my-4">
        <div className="w-48 h-auto rounded-lg overflow-hidden shadow-lg border-2 border-gray-600">
            <img src={frameUrl} alt="Last frame of previous video" className="w-full h-full object-cover" />
            <p className="text-xs text-center bg-gray-900/50 py-1 text-gray-300">Starting Frame</p>
        </div>
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
        placeholder="e.g., 'The cat looks up and winks.'"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base min-h-[80px]"
        disabled={isLoading}
      />
      
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
         <button
            onClick={onCancel}
            className="w-full bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors hover:bg-gray-500 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
        <button
          onClick={handleGenerate}
          className="w-full bg-gradient-to-br from-teal-600 to-cyan-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !prompt.trim()}
        >
          Generate Video
        </button>
      </div>
    </div>
  );
};

export default VideoExtendPanel;
