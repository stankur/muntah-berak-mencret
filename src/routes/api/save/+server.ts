import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { persistenceDir } from '$lib/config';

export async function POST({ request }) {
  const { title, content } = await request.json();
  
  if (!title || !content) {
    return json({ success: false, error: 'Title and content are required' }, { status: 400 });
  }

  try {
    // Sanitize the title for safe filename usage
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (sanitizedTitle.length === 0) {
      return json({ success: false, error: 'Invalid title after sanitization' }, { status: 400 });
    }
    
    // Create persistence directory if it doesn't exist
    if (!fs.existsSync(persistenceDir)) {
      fs.mkdirSync(persistenceDir, { recursive: true });
    }
    
    // Save file
    const filePath = path.join(persistenceDir, `${sanitizedTitle}.md`);
    fs.writeFileSync(filePath, content);
    
    return json({ 
      success: true, 
      filePath,
      message: `File saved to ${filePath}`
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
