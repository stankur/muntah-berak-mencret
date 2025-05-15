import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import generateImages from '$lib/processes/subprocesses/generateImages';
import ImageGenerationRenderer from '$lib/processes/renderers/ImageGenerationRenderer.svelte';
import type { 
  ImageGenerationResult 
} from '$lib/processes/subprocesses/generateImages';

/**
 * Image Generation Process - generates images for each section in the hierarchy
 * This process takes the output of the hierarchy summarization process and adds images
 * to each section based on the longSummary
 */
export const imageGenerationProcess: AsyncProcess<ImageGenerationResult> = {
  id: 'image-generation',
  name: 'Image Generation Process',
  description: 'Generates images for each section in the hierarchy based on the longSummary',
  process: generateImages,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: ImageGenerationRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(imageGenerationProcess);
