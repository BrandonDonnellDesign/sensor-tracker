#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript/TSX files that import from @/lib/supabase
const files = glob.sync('**/*.{ts,tsx}', {
  cwd: process.cwd(),
  ignore: ['node_modules/**', '.next/**', 'scripts/**']
});

let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already using supabase-client
  if (content.includes("from '@/lib/supabase-client'")) {
    return;
  }
  
  // Check if it imports from @/lib/supabase
  if (content.includes("from '@/lib/supabase'")) {
    console.log(`Updating ${file}...`);
    
    // Replace the import
    content = content.replace(
      /import\s*{\s*supabase\s*}\s*from\s*'@\/lib\/supabase';?/g,
      "import { createClient } from '@/lib/supabase-client';"
    );
    
    // Add createClient() calls where supabase is used
    // This is a simple approach - might need manual review for complex cases
    const lines = content.split('\n');
    const updatedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If line uses supabase and doesn't already have createClient
      if (line.includes('supabase.') && !line.includes('createClient()') && !line.includes('const supabase =')) {
        // Add createClient before the line
        const indent = line.match(/^\s*/)[0];
        updatedLines.push(`${indent}const supabase = createClient();`);
      }
      
      updatedLines.push(line);
    }
    
    content = updatedLines.join('\n');
    
    fs.writeFileSync(filePath, content);
    updatedCount++;
  }
});

console.log(`Updated ${updatedCount} files to use SSR-compatible Supabase client.`);
console.log('Note: Some files may need manual review for complex usage patterns.');