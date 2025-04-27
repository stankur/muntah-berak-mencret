import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { resultsDir } from '$lib/config';

/**
 * API endpoint to save process results
 * Creates a folder with the format <process_name>_<date_time> and saves results as JSON files
 */
export async function POST({ request }) {
  const { processName, results } = await request.json();
  
  if (!processName || !results || !Array.isArray(results)) {
    return json({ success: false, error: 'Process name and results array are required' }, { status: 400 });
  }

  try {
    // Create a folder name with process name and date/time
    const now = new Date();
    const dateTimeStr = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');
    
    const folderName = `${processName}_${dateTimeStr}`;
    const folderPath = path.join(resultsDir, folderName);
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Create the process results folder
    fs.mkdirSync(folderPath, { recursive: true });
    
    // Save each result as a JSON file
    for (const result of results) {
      if (!result.title) {
        console.warn('Result missing title, skipping:', result);
        continue;
      }
      
      // Sanitize the title for safe filename usage
      const sanitizedTitle = result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      if (sanitizedTitle.length === 0) {
        console.warn('Invalid title after sanitization, skipping:', result.title);
        continue;
      }
      
      // Save file with simplified structure
      const filePath = path.join(folderPath, `${sanitizedTitle}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        title: result.title,
        content: result.content
      }, null, 2));
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Error saving results:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
