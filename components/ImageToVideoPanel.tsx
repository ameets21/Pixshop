/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ImageToVideoPanelProps {
  onGenerateVideo: (prompt: string, options: { style: string; speed: string; duration: number; }) => void;
  isLoading: boolean;
  videoResult: { url: string; blob: Blob } | null;
  onStartExtend: () => void;
  onShowVideo: () => void;
}

const ImageToVideoPanel: React.FC<ImageToVideoPanelProps> = ({ onGenerateVideo, isLoading, videoResult, onStartExtend, onShowVideo }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('smooth');
  const [speed, setSpeed] = useState('normal');
  const [duration, setDuration] = useState(4);

  const presets = [
    'A gentle breeze causes the leaves on the trees to sway softly.',
    'A cinematic, slow zoom-in on the main subject.',
    'The clouds in the sky move slowly from left to right.',
    'Subtle steam rises from the coffee cup.',
  ];

  const styles = ['smooth', 'fast', 'slow', 'bouncy'];
  const speeds = ['slow', 'normal', 'fast'];

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerateVideo(prompt, { style, speed, duration });
    }
  };

  if (videoResult) {
    return (
      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
        <h3 className="text-lg font-semibold text-gray-300">Continue Your Video</h3>
        <p className="text-sm text-gray-400 -mt-2">You have a previously generated video. You can review it or create a follow-up scene.</p>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            onClick={onShowVideo}
            disabled={isLoading}
            className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors hover:bg-gray-500 disabled:opacity-50"
          >
            Review Full Video
          </button>
          <button
            onClick={onStartExtend}
            disabled={isLoading}
            className="bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-lg disabled:opacity-50"
          >
            Create Follow-up
          </button>
        </div>
      </div>
    );
  }

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
      
      {/* New Animation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Animation Style</label>
            <div className="grid grid-cols-2 gap-2">
                {styles.map(s => (
                    <button
                        key={s}
                        onClick={() => setStyle(s)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors capitalize disabled:opacity-50 ${style === s ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Animation Speed</label>
            <div className="grid grid-cols-3 gap-2">
                {speeds.map(s => (
                    <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors capitalize disabled:opacity-50 ${speed === s ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex justify-between items-center mb-1">
            <label htmlFor="duration" className="text-sm font-medium text-gray-300">Duration</label>
            <span className="text-sm font-mono text-gray-300 bg-gray-900/50 px-2 py-0.5 rounded">{duration}s</span>
        </div>
        <input
            id="duration"
            type="range"
            min="2"
            max="8"
            step="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            disabled={isLoading}
        />
      </div>


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
