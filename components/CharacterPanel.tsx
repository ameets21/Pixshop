/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';
import { UploadIcon, XCircleIcon } from './icons';

interface CharacterPanelProps {
  baseImage: File;
  onGenerateCharacter: (images: File[], prompt: string) => void;
  isLoading: boolean;
}

const Thumbnail: React.FC<{ file: File; onRemove?: () => void }> = ({ file, onRemove }) => {
    const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
    useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

    return (
        <div className="relative w-full aspect-square bg-gray-900/50 rounded-lg overflow-hidden group">
            <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="absolute top-1 right-1 text-white/70 hover:text-white"
                        aria-label="Remove image"
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            {onRemove ? <p className="absolute bottom-0 w-full text-center bg-black/60 text-white text-xs py-0.5">Additional</p> : <p className="absolute bottom-0 w-full text-center bg-black/60 text-white text-xs py-0.5">Base</p>}
        </div>
    );
};

const CharacterPanel: React.FC<CharacterPanelProps> = ({ baseImage, onGenerateCharacter, isLoading }) => {
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const totalImages = [baseImage, ...additionalImages];

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      setAdditionalImages(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleGenerate = () => {
    if (totalImages.length >= 2 && prompt.trim()) {
      onGenerateCharacter(totalImages, prompt);
    }
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="text-center mb-2">
        <h3 className="text-xl font-semibold text-gray-200">Consistent Character Generation</h3>
        <p className="text-sm text-gray-400">Add one or more images of the same character from different angles for the best results.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Thumbnail file={baseImage} />
        {additionalImages.map((file, index) => (
            <Thumbnail key={index} file={file} onRemove={() => removeImage(index)} />
        ))}
        <label
            htmlFor="character-image-upload"
            className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingOver ? 'border-blue-400 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-900/70'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                handleFileChange(e.dataTransfer.files);
            }}
        >
            <div className="text-center text-gray-400 p-2 pointer-events-none">
                <UploadIcon className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <span className="font-semibold text-gray-300 text-sm">Add Image(s)</span>
            </div>
            <input id="character-image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} multiple disabled={isLoading} />
        </label>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'standing on a beach at sunset'"
            className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
            disabled={isLoading}
        />
        <button
            onClick={handleGenerate}
            disabled={isLoading || totalImages.length < 2 || !prompt.trim()}
            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
            Generate Variations
        </button>
      </div>
      {totalImages.length < 2 && <p className="text-xs text-center text-yellow-400 animate-fade-in">Please add at least one more image to generate.</p>}
    </div>
  );
};

export default CharacterPanel;