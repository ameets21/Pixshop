/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { ReferenceSettings } from "../components/ReferencePanel";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

const getBrushSizeDescription = (size: number): string => {
    if (size <= 20) return 'very small';
    if (size <= 40) return 'small';
    if (size <= 70) return 'medium';
    if (size <= 100) return 'large';
    return 'very large';
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @param brushSize The radius of the edit area in pixels.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number },
    brushSize: number
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot, `with brush size: ${brushSize}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const sizeDescription = getBrushSizeDescription(brushSize);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request. Create a unique and creative variation for this edit.
User Request: "${userPrompt}"
Edit Location: Focus on a ${sizeDescription} area centered at pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates multiple variations of an edited image.
 */
export const generateEditedImageVariations = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number },
    brushSize: number,
    numVariations: number = 4,
): Promise<string[]> => {
    const promises = Array.from({ length: numVariations }, () => generateEditedImage(originalImage, userPrompt, hotspot, brushSize));
    return Promise.all(promises);
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style. Create a unique and creative variation of this filter.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates multiple variations of a filtered image.
 */
export const generateFilteredImageVariations = async (
    originalImage: File,
    filterPrompt: string,
    numVariations: number = 4,
): Promise<string[]> => {
    const promises = Array.from({ length: numVariations }, () => generateFilteredImage(originalImage, filterPrompt));
    return Promise.all(promises);
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request. Create a unique and creative variation of this adjustment.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates multiple variations of an adjusted image.
 */
export const generateAdjustedImageVariations = async (
    originalImage: File,
    adjustmentPrompt: string,
    numVariations: number = 4,
): Promise<string[]> => {
    const promises = Array.from({ length: numVariations }, () => generateAdjustedImage(originalImage, adjustmentPrompt));
    return Promise.all(promises);
}

/**
 * Generates an edited image using a reference image and various settings.
 * @param originalImage The source image file to be edited.
 * @param settings An object containing the reference image and editing parameters.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateReferencedImage = async (
    originalImage: File,
    settings: ReferenceSettings,
): Promise<string> => {
    console.log(`Starting reference image generation with settings:`, settings);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const referenceImagePart = await fileToPart(settings.referenceImage);

    const prompt = `You are an expert photo editor AI. Your task is to edit the 'source image' (the first image) using the 'reference image' (the second image) according to the user's instructions. Create a unique and creative variation of this edit.

User Request: "${settings.prompt || 'Apply the specified style transfer settings based on the parameters below.'}"

Editing Parameters:
- Style Influence: ${Math.round(settings.styleInfluence * 100)}% (This is the percentage of artistic style from the reference image that should be applied to the source image).
- Color Transfer: ${Math.round(settings.colorTransfer * 100)}% (This is the percentage of the color palette from the reference image that should be applied to the source image).
- Blend Mode: ${settings.blendMode} (Use this logic when combining elements. 'Standard' is a standard application, while others like 'Luminosity' or 'Overlay' create more dramatic effects).
- Negative Prompt: Avoid generating the following attributes: "${settings.negativePrompt || 'None'}".

Guidelines:
- The final image must retain the core subject and composition of the source image.
- The edit must be realistic and blend seamlessly.
- You must always return an image.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending source image, reference image, and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, referenceImagePart, textPart] },
    });
    console.log('Received response from model for reference image edit.', response);
    
    return handleApiResponse(response, 'reference');
};

/**
 * Generates an image of a character based on multiple reference images.
 * @param referenceImages An array of image files showing the character.
 * @param userPrompt The text prompt describing the desired scene.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateConsistentCharacter = async (
    referenceImages: File[],
    userPrompt: string,
): Promise<string> => {
    console.log(`Starting consistent character generation with ${referenceImages.length} images.`);
    if (referenceImages.length < 2) {
        throw new Error("Consistent character generation requires at least 2 reference images.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const imageParts = await Promise.all(referenceImages.map(file => fileToPart(file)));

    const prompt = `You are an expert character concept artist AI. Your task is to generate a new image featuring a character based on multiple reference images provided. It is crucial that you maintain consistency in the character's appearance, clothing, and overall style as depicted across ALL reference images.

The reference images show the same character from different angles or in different poses. Use them to build a complete understanding of the character.

User Request for the new scene: "${userPrompt}"

Guidelines:
- The generated character MUST look like the character in the reference images.
- Pay close attention to details like facial features, hair style, and attire.
- The new image should place the character in the scene described by the user request.
- Create a unique and creative variation for this generation.

Output: Return ONLY the final generated image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending images and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, textPart] },
    });
    console.log('Received response from model for character generation.', response);
    
    return handleApiResponse(response, 'character');
};

/**
 * Generates multiple variations of a consistent character image.
 */
export const generateConsistentCharacterVariations = async (
    referenceImages: File[],
    userPrompt: string,
    numVariations: number = 4,
): Promise<string[]> => {
    const promises = Array.from({ length: numVariations }, () => generateConsistentCharacter(referenceImages, userPrompt));
    return Promise.all(promises);
};


/**
 * Generates a video from an image using generative AI.
 * @param originalImage The source image file.
 * @param prompt The text prompt describing the desired motion.
 * @returns A promise that resolves to the video Blob.
 */
export const generateVideoFromImage = async (
    originalImage: File,
    prompt: string,
): Promise<Blob> => {
    console.log(`Starting video generation: ${prompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const { inlineData } = await fileToPart(originalImage);

    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
            imageBytes: inlineData.data,
            mimeType: inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1
        }
    });
    
    console.log('Video generation operation started:', operation);

    while (!operation.done) {
        console.log('Waiting for video generation to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
        console.log('Current operation status:', operation);
    }

    if (operation.error) {
        console.error('Video generation failed:', operation.error);
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!downloadLink) {
        console.error('No download link found in the operation response.', operation);
        throw new Error('Video generation completed, but no download link was provided.');
    }

    console.log('Fetching video from:', downloadLink);
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    
    if (!response.ok) {
        throw new Error(`Failed to download the generated video. Status: ${response.status}`);
    }

    const videoBlob = await response.blob();
    console.log('Video downloaded successfully.');
    return videoBlob;
};