/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { UploadIcon } from './icons';

export interface ReferenceSettings {
  referenceImage: File;
  prompt: string;
  styleInfluence: number;
  colorTransfer: boolean;
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
  const [styleInfluence, setStyleInfluence] = useState(0.7);
  const [colorTransfer, setColorTransfer] = useState(true);
  const [blendMode, setBlendMode] = useState('Normal');
  const [negativePrompt, setNegativePrompt] = useState('');

  const referenceImageUrl = useMemo(() => {
    if (referenceImage) {
      const url = URL.createObjectURL(referenceImage);
      // Clean up the URL when the component unmounts or the image changes
      return () => URL.revokeObjectURL(url);
    }
    return null;
  }, [referenceImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const handleApply = () => {
    if (referenceImage && prompt.trim()) {
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

  const imageUrl = referenceImage ? URL.createObjectURL(referenceImage) : null;

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Apply Style from Reference Image</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
            <label htmlFor="reference-upload" className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${referenceImage ? 'border-gray-600 hover:border-blue-500' : 'bg-white/5 border-gray-600 hover:bg-white/10 hover:border-gray-500'}`}>
                {imageUrl ? (
                    <img src={imageUrl} alt="Reference" className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <div className="text-center text-gray-400 p-4">
                        <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                        <span className="font-semibold">Upload Reference</span>
                        <p className="text-xs">Click or drag & drop</p>
                    </div>
                )}
            </label>
            <input id="reference-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
        </div>
        <div className="md:col-span-2">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to apply from the reference image (e.g., 'Match the painterly style and warm color palette')."
                className="w-full h-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 text-base min-h-[120px]"
                disabled={isLoading}
            />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
        {/* Style Influence */}
        <div>
            <label htmlFor="style-influence" className="block text-sm font-medium text-gray-300 mb-1">Style Influence: <span className="font-bold text-blue-400">{Math.round(styleInfluence * 100)}%</span></label>
            <input id="style-influence" type="range" min="0" max="1" step="0.05" value={styleInfluence} onChange={e => setStyleInfluence(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" disabled={isLoading} />
        </div>
        
        {/* Color Transfer */}
        <div className="flex items-center justify-between">
            <label htmlFor="color-transfer" className="text-sm font-medium text-gray-300">Color Transfer</label>
            <button role="switch" aria-checked={colorTransfer} onClick={() => setColorTransfer(!colorTransfer)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${colorTransfer ? 'bg-blue-600' : 'bg-gray-600'}`} disabled={isLoading}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${colorTransfer ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>

        {/* Blend Mode */}
        <div>
            <label htmlFor="blend-mode" className="block text-sm font-medium text-gray-300 mb-1">Blend Mode</label>
            <select id="blend-mode" value={blendMode} onChange={e => setBlendMode(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" disabled={isLoading}>
                <option>Normal</option>
                <option>Overlay</option>
                <option>Screen</option>
                <option>Multiply</option>
                <option>Hard Light</option>
            </select>
        </div>

        {/* Negative Prompt */}
        <div>
            <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300 mb-1">Negative Prompt</label>
            <input id="negative-prompt" type="text" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="e.g., 'blurry, deformed, text'" className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" disabled={isLoading} />
        </div>
      </div>

      <button
        onClick={handleApply}
        className="w-full mt-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        disabled={isLoading || !prompt.trim() || !referenceImage}
      >
        Apply with Reference
      </button>
    </div>
  );
};

export default ReferencePanel;
