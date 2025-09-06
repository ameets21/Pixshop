/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { DownloadIcon } from './icons';

interface VariationSelectorProps {
  images: File[];
  onSelect: (image: File) => void;
  onCancel: () => void;
}

const Thumbnail: React.FC<{ file: File; onSelect: () => void; isActive: boolean; }> = ({ file, onSelect, isActive }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    if (!objectUrl) {
        return <div className="w-full aspect-square bg-gray-800 rounded-lg animate-pulse"></div>;
    }

    return (
        <button
            onClick={onSelect}
            className={`w-full aspect-square bg-black rounded-lg overflow-hidden transition-all duration-200 ease-in-out focus:outline-none ${isActive ? 'ring-4 ring-offset-2 ring-offset-gray-900 ring-blue-500 scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
            aria-label="Select this variation"
            aria-current={isActive}
        >
            <img src={objectUrl} alt="Variation Thumbnail" className="w-full h-full object-cover" />
        </button>
    );
};


const VariationSelector: React.FC<VariationSelectorProps> = ({ images, onSelect, onCancel }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  
  const activeImageFile = images[selectedIndex];

  useEffect(() => {
      if (activeImageFile) {
          const url = URL.createObjectURL(activeImageFile);
          setActiveImageUrl(url);
          return () => URL.revokeObjectURL(url);
      }
  }, [activeImageFile]);

  const handleDownload = () => {
      if (!activeImageFile) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(activeImageFile);
      link.download = `pixshop-variation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in p-4">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-100">Choose Your Favorite Variation</h2>
                <p className="text-gray-400 mt-1">Click a thumbnail to preview, then select or download.</p>
            </div>
            
            <div className="w-full max-w-xl aspect-square relative bg-black/30 rounded-lg shadow-2xl flex items-center justify-center">
              {activeImageUrl ? (
                <img src={activeImageUrl} alt="Selected variation" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Spinner />
              )}
            </div>
            
            <div className="w-full max-w-xl grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                    <Thumbnail 
                        key={index}
                        file={image}
                        onSelect={() => setSelectedIndex(index)}
                        isActive={index === selectedIndex}
                    />
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={onCancel}
                className="bg-gray-700/80 border border-gray-600 text-gray-200 font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 bg-indigo-600/80 border border-indigo-500 text-gray-100 font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-indigo-600"
              >
                <DownloadIcon className="w-5 h-5" />
                Download
              </button>
               <button
                onClick={() => onSelect(activeImageFile)}
                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
              >
                Select this version
              </button>
            </div>
        </div>
    </div>
  );
};

export default VariationSelector;