/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';
import { UploadIcon } from './icons';

export interface ReferenceSettings {
  referenceImage: File;
  prompt: string;
  styleInfluence: number;
  colorTransfer: number; // Changed from boolean to number
  blendMode: string;
  negativePrompt: string;
}

interface ReferencePanelProps {
  onApplyReference: (settings: ReferenceSettings) => void;
  isLoading: boolean;
}

const ReferencePanel: React.FC<ReferencePanelProps> = ({ onApplyReference, isLoading }) => {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [styleInfluence, setStyleInfluence] = useState(0.75);
  const [colorTransfer, setColorTransfer] = useState(0.75); // Changed to number
  const [blendMode, setBlendMode] = useState('Standard');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const referenceImageUrl = useMemo(() => {
    if (referenceImage) {
      return URL.createObjectURL(referenceImage);
    }
    return null;
  }, [referenceImage]);
  
  useEffect(() => {
    return () => {
      if (referenceImageUrl) {
        URL.revokeObjectURL(referenceImageUrl);
      }
    };
  }, [referenceImageUrl]);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      setReferenceImage(files[0]);
    }
  };

  const handleApply = () => {
    if (referenceImage) {
      onApplyReference({
        referenceImage,
        prompt,
        styleInfluence,
        colorTransfer,
        blendMode,
        negativePrompt,
      });
    }
  };

  const blendModes = ['Standard', 'Luminosity', 'Overlay'];

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="text-center mb-2">
        <h3 className="text-xl font-semibold text-gray-200">Apply Style from Reference</h3>
        <p className="text-sm text-gray-400">Upload an image and use the controls below to fine-tune the style transfer.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          <label 
            htmlFor="reference-upload"
            className={`w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingOver ? 'border-blue-400 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-900/70'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              handleFileChange(e.dataTransfer.files);
            }}
          >
              {referenceImageUrl ? (
                  <img src={referenceImageUrl} alt="Reference Preview" className="w-full h-full object-cover rounded-lg" />
              ) : (
                  <div className="text-center text-gray-400 p-4 pointer-events-none">
                      <UploadIcon className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                      <span className="font-semibold text-gray-300">Click to upload or drag & drop</span>
                      <p className="text-xs mt-1">PNG, JPG, WEBP</p>
                  </div>
              )}
          </label>
          <input id="reference-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} disabled={isLoading} />
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: Guide the AI (e.g., 'the painterly texture')"
            className="w-full bg-gray-900/70 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 text-base"
            disabled={isLoading}
          />
          
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Negative prompt (e.g., 'avoid the blurry background')"
            className="w-full bg-gray-900/70 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 text-base"
            disabled={isLoading}
          />

          <button
            onClick={handleApply}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-500/40 hover:bg-blue-500 active:scale-95 text-base disabled:from-blue-800 disabled:to-blue-700 disabled:bg-blue-800 disabled:shadow-none disabled:cursor-not-allowed"
            disabled={isLoading || !referenceImage}
          >
            Generate Variations
          </button>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Style Influence */}
          <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="style-influence" className="text-sm font-medium text-gray-300">Style Influence</label>
                <span className="text-sm font-mono text-gray-300 bg-gray-900/50 px-2 py-0.5 rounded">{Math.round(styleInfluence * 100)}%</span>
            </div>
            <input id="style-influence" type="range" min="0" max="1" step="0.05" value={styleInfluence} onChange={e => setStyleInfluence(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={isLoading} />
          </div>

          {/* Color Transfer */}
          <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="color-transfer" className="text-sm font-medium text-gray-300">Color Transfer</label>
                <span className="text-sm font-mono text-gray-300 bg-gray-900/50 px-2 py-0.5 rounded">{Math.round(colorTransfer * 100)}%</span>
            </div>
            <input id="color-transfer" type="range" min="0" max="1" step="0.05" value={colorTransfer} onChange={e => setColorTransfer(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={isLoading} />
          </div>

          {/* Blend Mode */}
          <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">Blend Mode</label>
             <div className="grid grid-cols-3 gap-2">
                {blendModes.map(mode => (
                    <button key={mode} onClick={() => setBlendMode(mode)} disabled={isLoading} className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${blendMode === mode ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'}`}>
                        {mode}
                    </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferencePanel;