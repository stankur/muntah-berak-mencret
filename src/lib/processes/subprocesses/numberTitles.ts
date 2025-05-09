import type { TitleNumberingSummarizationResult } from '$lib/processes/implementations/title_numbering_summarization';
import summarizeBlocks from '$lib/processes/subprocesses/summarizeBlocks';

/**
 * Numbers titles sequentially while preserving original content
 */
export default async function numberTitles(content: string): Promise<TitleNumberingSummarizationResult> {
  console.log(`[numberTitles] Starting process on content of length: ${content.length}`);

  // Get the block summarization result
  const blockSummarizationResult = await summarizeBlocks(content);
  
  // Add numbering to titles
  let titleCount = 0;
  const numberedElements = blockSummarizationResult.elements.map(element => {
    if (element.type === 'title') {
      titleCount++;
      return {
        ...element,
        numberedContent: `T${titleCount}: ${element.content}`
      };
    }
    return element;
  });
  
  console.log(`[numberTitles] Process complete. Numbered ${titleCount} titles`);
  
  return {
    elements: numberedElements,
    originalBlocks: blockSummarizationResult.originalBlocks
  };
}
