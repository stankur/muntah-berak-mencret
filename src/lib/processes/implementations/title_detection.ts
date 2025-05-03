import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import detectTitles from '$lib/processes/subprocesses/detectTitles';
import TitleDetectionRenderer from '$lib/processes/renderers/TitleDetectionRenderer.svelte';

export interface TitleConfidence {
  lines: number[];
  reason: string;
}

export interface TitleDetectionResult {
  blocks: string[];
  highConfidence: TitleConfidence;
  moderateConfidence: TitleConfidence;
}

export const titleDetectionProcess: AsyncProcess<TitleDetectionResult> = {
  id: 'title-detection', 
  name: 'Title Detection Process',
  description: 'Identifies potential titles in content with confidence levels',
  process: detectTitles,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: TitleDetectionRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(titleDetectionProcess);
