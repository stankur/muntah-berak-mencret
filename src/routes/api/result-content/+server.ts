import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { resultsDir } from '$lib/config';

/**
 * API endpoint to get the content of a specific result file
 * Takes a process run folder name and a file name as query parameters
 * Returns the content from the specified result file
 */
export async function GET({ url }) {
  const folderName = url.searchParams.get('folder');
  const fileName = url.searchParams.get('file');
  
  if (!folderName) {
    return json({ success: false, error: 'Folder name is required' }, { status: 400 });
  }
  
  if (!fileName) {
    return json({ success: false, error: 'File name is required' }, { status: 400 });
  }
  
  try {
    const filePath = path.join(resultsDir, folderName, fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const resultData = JSON.parse(fileContent);
    
    return json({ 
      success: true, 
      result: resultData
    });
	} catch (error) {
		console.error('Error getting result content:', error);
		return json({ success: false, error: (error as Error).message }, { status: 500 });
	}
}
