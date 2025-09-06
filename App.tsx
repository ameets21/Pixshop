/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import JSZip from 'jszip';
import { 
  generateEditedImageVariations,
  generateFilteredImageVariations,
  generateAdjustedImageVariations,
  generateVideoFromImage, 
  generateReferencedImageVariations,
  generateConsistentCharacterVariations,
  generateFilteredImage,
  generateAdjustedImage
} from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import ImageToVideoPanel from './components/ImageToVideoPanel';
import ReferencePanel, { type ReferenceSettings } from './components/ReferencePanel';
import CharacterPanel from './components/CharacterPanel';
import BatchThumbnailTray from './components/BatchThumbnailTray';
import VariationSelector from './components/VariationSelector';
import VideoExtendPanel from './components/VideoExtendPanel';
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to extract the last frame of a video
const extractLastFrame = (videoBlob: Blob): Promise<File> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return reject(new Error('Canvas context not available'));
        
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';

        const revokeUrl = () => URL.revokeObjectURL(video.src);

        video.onloadedmetadata = () => {
            // Seek to a point near the end. Seeking to the exact end can be unreliable.
            video.currentTime = video.duration > 0.1 ? video.duration - 0.1 : 0;
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(new File([blob], 'last-frame.png', { type: 'image/png' }));
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
                revokeUrl();
            }, 'image/png');
        };

        video.onerror = () => {
            reject(new Error('Failed to load video for frame extraction.'));
            revokeUrl();
        };
        
        video.src = URL.createObjectURL(videoBlob);
    });
};

type Tab = 'retouch' | 'adjust' | 'filters' | 'crop' | 'video' | 'reference' | 'character';
type BatchImage = { original: File; edited: File; };

const App: React.FC = () => {
  // Single image state
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Batch image state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // Common state
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('AI is working its magic...');
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  
  // Variation state
  const [variationImages, setVariationImages] = useState<File[] | null>(null);
  const [pendingAction, setPendingAction] = useState<((selectedImage: File) => void) | null>(null);

  // Video state
  const [videoResult, setVideoResult] = useState<{ url: string; blob: Blob } | null>(null);
  const [isExtendingVideo, setIsExtendingVideo] = useState(false);
  const [videoLastFrame, setVideoLastFrame] = useState<File | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = isBatchMode ? batchImages[activeIndex]?.edited : history[historyIndex];
  const originalImage = isBatchMode ? batchImages[activeIndex]?.original : history[0];

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    if (isBatchMode) {
        setBatchImages(prev => {
            const newBatch = [...prev];
            newBatch[activeIndex] = { ...newBatch[activeIndex], edited: newImageFile };
            return newBatch;
        });
    } else {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newImageFile);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [history, historyIndex, isBatchMode, activeIndex]);
  
  const handleSingleImageUpload = useCallback((file: File) => {
    setIsBatchMode(false);
    setBatchImages([]);
    setError(null);
    setVideoResult(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);
  
  const handleBatchUpload = useCallback((files: FileList) => {
    setIsBatchMode(true);
    setHistory([]);
    setHistoryIndex(-1);
    setError(null);
    setVideoResult(null);
    const newBatchImages = Array.from(files).map(file => ({ original: file, edited: file }));
    setBatchImages(newBatchImages);
    setActiveIndex(0);
    setActiveTab('adjust'); // Default to a batch-friendly tab
  }, []);

  const handleGenerateVariations = useCallback(async (generator: () => Promise<string[]>) => {
    if (!currentImage) return;
    setIsLoading(true);
    setLoadingMessage('Generating variations...');
    setError(null);
    try {
      const variationUrls = await generator();
      const variationFiles = variationUrls.map((url, i) => dataURLtoFile(url, `variation-${i}-${Date.now()}.png`));
      setVariationImages(variationFiles);
      setPendingAction(() => (selectedImage: File) => addImageToHistory(selectedImage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !editHotspot) return;
    handleGenerateVariations(() => generateEditedImageVariations(currentImage, prompt, editHotspot, 4));
  }, [currentImage, prompt, editHotspot, handleGenerateVariations]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    handleGenerateVariations(() => generateFilteredImageVariations(currentImage, filterPrompt, 4));
  }, [currentImage, handleGenerateVariations]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    handleGenerateVariations(() => generateAdjustedImageVariations(currentImage, adjustmentPrompt, 4));
  }, [currentImage, handleGenerateVariations]);
  
  const handleApplyReference = useCallback(async (settings: ReferenceSettings) => {
    handleGenerateVariations(() => generateReferencedImageVariations(currentImage, settings, 4));
  }, [currentImage, handleGenerateVariations]);
  
  const handleGenerateCharacter = useCallback(async (referenceImages: File[], characterPrompt: string) => {
    handleGenerateVariations(() => generateConsistentCharacterVariations(referenceImages, characterPrompt, 4));
  }, [handleGenerateVariations]);

  const handleVariationSelected = useCallback((selectedImage: File) => {
    if (pendingAction) {
      pendingAction(selectedImage);
    }
    setVariationImages(null);
    setPendingAction(null);
  }, [pendingAction]);

  const handleVariationCancel = useCallback(() => {
    setVariationImages(null);
    setPendingAction(null);
  }, []);

  const handleBatchApply = useCallback(async (prompt: string, type: 'filter' | 'adjustment') => {
    setIsLoading(true);
    setError(null);
    
    const operation = type === 'filter' ? generateFilteredImage : generateAdjustedImage;
    
    const newBatchImages = [...batchImages];
    for (let i = 0; i < newBatchImages.length; i++) {
        try {
            setLoadingMessage(`Applying to image ${i + 1} of ${batchImages.length}...`);
            const resultUrl = await operation(newBatchImages[i].original, prompt);
            const newFile = dataURLtoFile(resultUrl, `${type}-${i}-${Date.now()}.png`);
            newBatchImages[i] = { ...newBatchImages[i], edited: newFile };
            setBatchImages([...newBatchImages]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to apply to image ${i + 1}: ${message}. Batch operation stopped.`);
            setIsLoading(false);
            return;
        }
    }
    
    setLoadingMessage('Batch apply complete!');
    setTimeout(() => setIsLoading(false), 1000);
  }, [batchImages]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    
    addImageToHistory(dataURLtoFile(canvas.toDataURL('image/png'), `cropped-${Date.now()}.png`));

  }, [completedCrop, addImageToHistory]);

  const handleGenerateVideo = useCallback(async (videoPrompt: string, baseImage?: File) => {
    const imageToProcess = baseImage || currentImage;
    if (!imageToProcess) return;
    
    setIsLoading(true);
    setLoadingMessage('Generating video... This can take several minutes.');
    setError(null);
    // Exit any special UI states
    setIsExtendingVideo(false);
    setVideoLastFrame(null);
    
    try {
        const videoBlob = await generateVideoFromImage(imageToProcess, videoPrompt);
        setVideoResult({ url: URL.createObjectURL(videoBlob), blob: videoBlob });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [currentImage]);
  
  const handleBackToEditor = useCallback(() => {
    if (videoResult) {
      URL.revokeObjectURL(videoResult.url);
      setVideoResult(null);
    }
    setIsExtendingVideo(false);
    setVideoLastFrame(null);
  }, [videoResult]);

  const handleStartExtendVideo = useCallback(async () => {
    if (!videoResult) return;
    setIsLoading(true);
    setLoadingMessage('Preparing video for extension...');
    try {
      const frameFile = await extractLastFrame(videoResult.blob);
      setVideoLastFrame(frameFile);
      setIsExtendingVideo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extract frame from video.');
    } finally {
      setIsLoading(false);
    }
  }, [videoResult]);

  const resetState = useCallback(() => {
      setIsBatchMode(false);
      setBatchImages([]);
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      handleBackToEditor();
  }, [handleBackToEditor]);

  const handleDownload = useCallback(() => {
      if (videoResult) {
          const link = document.createElement('a');
          link.href = videoResult.url;
          link.download = `video-${Date.now()}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage, videoResult]);

  const handleDownloadZip = useCallback(async () => {
    if (batchImages.length === 0) return;

    setIsLoading(true);
    setLoadingMessage('Creating zip file...');
    try {
        const zip = new JSZip();
        batchImages.forEach((img, index) => {
            zip.file(`edited-${index}-${img.edited.name}`, img.edited);
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pixshop-batch-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create zip file.');
    } finally {
        setIsLoading(false);
    }
  }, [batchImages]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 1) {
        handleBatchUpload(files);
    } else if (files && files[0]) {
      handleSingleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDisplayHotspot({ x: offsetX, y: offsetY });
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    setEditHotspot({ x: Math.round(offsetX * (naturalWidth / clientWidth)), y: Math.round(offsetY * (naturalHeight / clientHeight)) });
  };
  
  const renderContent = () => {
    if (error) {
      return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 text-center animate-fade-in p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <h2 className="text-2xl font-bold text-red-400">An Error Occurred</h2>
          <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md">{error}</p>
          <button onClick={() => { setError(null); setIsLoading(false); }} className="mt-4 bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-red-500">
            Dismiss
          </button>
        </div>
      );
    }
    if (!currentImageUrl) return <StartScreen onFileSelect={handleFileSelect} />;

    if (variationImages) {
        return <VariationSelector images={variationImages} onSelect={handleVariationSelected} onCancel={handleVariationCancel} />;
    }
    
    if (isExtendingVideo && videoLastFrame) {
      return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <VideoExtendPanel 
            lastFrame={videoLastFrame}
            onGenerate={(prompt) => handleGenerateVideo(prompt, videoLastFrame)}
            onCancel={handleBackToEditor}
            isLoading={isLoading}
          />
        </div>
      );
    }

    if (videoResult) {
      return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-200">Video Generation Complete!</h2>
          <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
              <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                <Spinner />
                <p className="text-gray-300 text-center px-4">{loadingMessage}</p>
              </div>
            )}
            <video src={videoResult.url} controls autoPlay loop className="w-full h-auto object-contain max-h-[60vh] rounded-xl" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <button
              onClick={handleDownload}
              className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-lg disabled:opacity-50"
              disabled={isLoading}
            >
              Download Video
            </button>
            <button
              onClick={handleStartExtendVideo}
              className="bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-lg disabled:opacity-50"
              disabled={isLoading}
            >
              Create Follow-up Video
            </button>
            <button
              onClick={handleBackToEditor}
              className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors hover:bg-gray-500 disabled:opacity-50"
              disabled={isLoading}
            >
              Back to Editor
            </button>
          </div>
        </div>
      );
    }

    const availableTabs: Tab[] = isBatchMode ? ['adjust', 'filters'] : ['retouch', 'crop', 'adjust', 'filters', 'video', 'reference', 'character'];

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in"><Spinner /><p className="text-gray-300 text-center px-4">{loadingMessage}</p></div>}
            {activeTab === 'crop' && !isBatchMode ? ( <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect}><img ref={imgRef} src={currentImageUrl} alt="Crop" className="w-full h-auto object-contain max-h-[60vh] rounded-xl"/></ReactCrop> ) : ( <div className="relative"><img src={originalImageUrl} alt="Original" className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none" /><img ref={imgRef} src={currentImageUrl} alt="Current" onClick={handleImageClick} className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`} /></div> )}
            {displayHotspot && !isLoading && activeTab === 'retouch' && <div className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}><div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div></div>}
        </div>

        {isBatchMode && <BatchThumbnailTray images={batchImages} activeIndex={activeIndex} onSelect={setActiveIndex} />}
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {availableTabs.map(tab => ( <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${ activeTab === tab ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' : 'text-gray-300 hover:text-white hover:bg-white/10' }`}>{tab}</button>))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
              <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-center text-gray-300">Retouch Image</h3>
                <p className="text-sm text-gray-400 -mt-2 text-center">Click on the image to select a spot, then describe your edit.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'remove the person' or 'make the shirt blue'"
                        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim() || !editHotspot}
                        className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    >
                        Generate Variations
                    </button>
                </div>
                {editHotspot && <p className="text-xs text-center text-gray-400 animate-fade-in">Selected spot: ({editHotspot.x}, {editHotspot.y}). Ready to apply your edit.</p>}
              </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} isBatchMode={isBatchMode} onBatchApply={handleBatchApply} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} isBatchMode={isBatchMode} onBatchApply={handleBatchApply} />}
            {activeTab === 'video' && <ImageToVideoPanel onGenerateVideo={handleGenerateVideo} isLoading={isLoading} />}
            {activeTab === 'reference' && <ReferencePanel onApplyReference={handleApplyReference} isLoading={isLoading} />}
            {activeTab === 'character' && <CharacterPanel baseImage={currentImage} onGenerateCharacter={handleGenerateCharacter} isLoading={isLoading} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {!isBatchMode && (
              <>
                <button onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} disabled={!canUndo} className="flex items-center justify-center gap-2 bg-gray-700/80 border border-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-md transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5 mr-1" />Undo</button>
                <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} disabled={!canRedo} className="flex items-center justify-center gap-2 bg-gray-700/80 border border-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-md transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5 mr-1" />Redo</button>
                <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
              </>
            )}
             { (canUndo || isBatchMode) && <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} className="flex items-center justify-center gap-2 bg-gray-700/80 border border-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-md transition-colors hover:bg-gray-700 active:bg-gray-600"><EyeIcon className="w-5 h-5 mr-1" />Compare</button> }
             {!isBatchMode && canUndo && <button onClick={() => setHistoryIndex(0)} className="bg-red-800/80 border border-red-700 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors hover:bg-red-700/80">Reset</button>}
            
            <button onClick={resetState} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors hover:bg-gray-500">{isBatchMode ? 'Exit Batch Mode' : 'Upload New'}</button>

            <button onClick={isBatchMode ? handleDownloadZip : handleDownload} className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95">{isBatchMode ? 'Download All (.zip)' : 'Download Image'}</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;