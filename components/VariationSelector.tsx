/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';

interface VariationSelectorProps {
  images: File[];
  onSelect: (image: File) => void;
  onCancel: () => void;
}

const ImagePreview: React.FC<{ file: File; onSelect: () => void; }> = ({ file, onSelect }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!objectUrl) {
        return (
            <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                <Spinner />
            </div>
        )
    };

    return (
        <button 
            onClick={onSelect}
            className="group w-full aspect-square bg-black rounded-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
        >
            <img src={objectUrl} alt="Variation" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                <span className="text-white font-bold text-lg">Select this version</span>
            </div>
        </button>
    );
};


const VariationSelector: React.FC<VariationSelectorProps> = ({ images, onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 p-4">
            <h2 className="text-3xl font-bold text-gray-100">Choose Your Favorite Variation</h2>
            <p className="text-gray-400 -mt-4">The AI has generated four options. Click one to apply it.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {images.map((image, index) => (
                    <ImagePreview 
                        key={index}
                        file={image}
                        onSelect={() => onSelect(image)}
                    />
                ))}
            </div>

            <button
              onClick={onCancel}
              className="mt-6 bg-gray-700/80 border border-gray-600 text-gray-200 font-semibold py-3 px-8 rounded-lg transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
        </div>
    </div>
  );
};

export default VariationSelector;
