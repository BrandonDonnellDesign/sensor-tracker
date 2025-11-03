#!/usr/bin/env node

/**
 * Simple migration validator
 * Checks for common SQL syntax issues in migration files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

function validateMigration(filePath, content) {
  const errors = [];
  const warnings = [];
  
  // Check for unterminated strings
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for unterminated single quotes in COMMENT statements
    if (line.includes('COMMENT ON') && line.includes("'")) {
      const singleQuotes = (line.match(/'/g) || []).length;
      if (singleQuotes % 2 !== 0) {
        errors.push(`Line ${lineNum}: Unterminated string in COMMENT statement`);
      }
    }
    
    // Check for common issues
    if (line.trim().endsWith("'") && !line.trim().endsWith("';")) {
      warnings.push(`Line ${lineNum}: String might be missing semicolon`);
    }
  });
  
  // Check for proper file ending
  if (!content.trim().endsWith(';')) {
    warnings.push('File does not end with semicolon');
  }
  
  return { errors, warnings };
}

function validateAllMigrations() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql') && file !== 'README.md')
      .sort();
    
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log('🔍 Validating Migration Files...\n');
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    files.forEach(file => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { errors, warnings } = validateMigration(filePath, content);
      
      console.log(`📄 ${file}`);
      
      if (errors.length === 0 && warnings.length === 0) {
        console.log('   ✅ No issues found');
      } else {
        if (errors.length > 0) {
          console.log('   ❌ Errors:');
          errors.forEach(error => console.log(`      ${error}`));
          totalErrors += errors.length;
        }
        
        if (warnings.length > 0) {
          console.log('   ⚠️  Warnings:');
          warnings.forEach(warning => console.log(`      ${warning}`));
          totalWarnings += warnings.length;
        }
      }
      
      console.log('');
    });
    
    console.log(`📊 Summary: ${files.length} files checked`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Warnings: ${totalWarnings}`);
    
    if (totalErrors === 0) {
      console.log('✅ All migrations are valid!');
    } else {
      console.log('❌ Please fix errors before applying migrations.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error validating migrations:', error.message);
    process.exit(1);
  }
}

// Run validation
validateAllMigrations();