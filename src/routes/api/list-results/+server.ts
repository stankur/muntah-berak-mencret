import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { resultsDir } from '$lib/config';

/**
 * API endpoint to list all process runs
 * Returns a list of all folders in the results directory
 */
export async function GET() {
  try {
    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      return json({ success: true, runs: [] });
    }
    
    // Get all folders in the results directory
    const items = fs.readdirSync(resultsDir);
    const runs = items
      .filter(item => fs.statSync(path.join(resultsDir, item)).isDirectory())
      .map(folderName => {
        // Extract process ID and date/time from folder name
        const parts = folderName.split('_');
        const processId = parts[0];
        const dateTimeParts = parts.slice(1);
        const dateTime = dateTimeParts.join('_').replace(/-/g, ':');
        
        return {
          folderName,
          processId,
          dateTime,
          displayName: `${processId} - ${dateTime}`
        };
      })
      .sort((a, b) => {
        // Sort by date/time in descending order (newest first)
        return b.dateTime.localeCompare(a.dateTime);
      });
    
    return json({ success: true, runs });
  } catch (error) {
    console.error('Error listing process runs:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
