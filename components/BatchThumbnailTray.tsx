/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useState } from 'react';

interface ThumbnailProps {
  file: File;
  isActive: boolean;
  onClick: () => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ file, isActive, onClick }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    if (!objectUrl) return null;

    return (
        <button 
            onClick={onClick}
            className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${isActive ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:border-gray-500'}`}
            aria-label={`Select image ${file.name}`}
            aria-current={isActive}
        >
            <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />
        </button>
    );
};

interface BatchThumbnailTrayProps {
  images: { original: File; edited: File }[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const BatchThumbnailTray: React.FC<BatchThumbnailTrayProps> = ({ images, activeIndex, onSelect }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 animate-fade-in backdrop-blur-sm">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {images.map((image, index) => (
                <Thumbnail 
                    key={`${image.original.name}-${index}`}
                    file={image.edited} // Show the edited version
                    isActive={index === activeIndex}
                    onClick={() => onSelect(index)}
                />
            ))}
        </div>
    </div>
  );
};

export default BatchThumbnailTray;