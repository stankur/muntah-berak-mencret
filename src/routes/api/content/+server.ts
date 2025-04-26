import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { persistenceDir } from '$lib/config';

export async function GET({ url }) {
  const title = url.searchParams.get('title');
  
  if (!title) {
    return json({ success: false, error: 'Title parameter is required' }, { status: 400 });
  }

  try {
    const filePath = path.join(persistenceDir, `${title}.md`);
    
    if (!fs.existsSync(filePath)) {
      return json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return json({ 
      success: true, 
      content
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
