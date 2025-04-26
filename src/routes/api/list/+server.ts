import { json } from '@sveltejs/kit';
import fs from 'fs';
import { persistenceDir } from '$lib/config';

export async function GET() {
  try {
    // Create persistence directory if it doesn't exist
    if (!fs.existsSync(persistenceDir)) {
      fs.mkdirSync(persistenceDir, { recursive: true });
      return json({ titles: [] });
    }
    
    // Read all files in the persistence directory and extract just the titles
    const titles = fs.readdirSync(persistenceDir)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace(/\.md$/, ''));
    
    return json({ titles });
  } catch (error) {
    console.error('Error listing files:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
