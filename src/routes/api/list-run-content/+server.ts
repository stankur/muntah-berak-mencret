import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { resultsDir } from '$lib/config';

/**
 * API endpoint to list all content files in a specific process run
 * Takes a process run folder name as a query parameter
 * Returns a list of all JSON files in that folder
 */
export async function GET({ url }) {
  const folderName = url.searchParams.get('folder');
  
  if (!folderName) {
    return json({ success: false, error: 'Folder name is required' }, { status: 400 });
  }
  
  try {
    const folderPath = path.join(resultsDir, folderName);
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      return json({ success: false, error: 'Folder not found' }, { status: 404 });
    }
    
    // Get all JSON files in the folder
    const items = fs.readdirSync(folderPath);
    const contentFiles = items
      .filter(item => item.endsWith('.json'))
      .map(fileName => {
        // Extract title from filename (remove .json extension)
        const title = fileName.replace('.json', '');
        
        return {
          fileName,
          title
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
    
    return json({ success: true, contentFiles });
  } catch (error) {
    console.error('Error listing run content:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
