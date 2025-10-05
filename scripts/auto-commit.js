#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.error('Error getting staged files:', error.message);
    return [];
  }
}

// Function to detect commit type based on files and patterns
function detectCommitType(files) {
  const fileList = files.join(' ');
  
  // Package updates
  if (files.some(f => f.includes('package.json') || f.includes('package-lock.json') || f.includes('yarn.lock'))) {
    return 'upgrade';
  }
  
  // Test files
  if (files.some(f => f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__'))) {
    return 'test';
  }
  
  // Documentation
  if (files.some(f => f.endsWith('.md') || f.includes('README') || f.includes('CHANGELOG'))) {
    return 'docs';
  }
  
  // Configuration files
  if (files.some(f => f.includes('.config.') || f.includes('.env') || f.includes('tsconfig') || f.includes('eslint'))) {
    return 'config';
  }
  
  // Database related
  if (files.some(f => f.includes('schema.prisma') || f.includes('migrations'))) {
    return 'feat';
  }
  
  // Try to detect from git diff content
  try {
    const diff = execSync('git diff --cached', { encoding: 'utf8' });
    if (diff.includes('fix') || diff.includes('bug') || diff.includes('error')) {
      return 'fix';
    }
  } catch (error) {
    // Ignore diff errors
  }
  
  return 'feat';
}

// Function to detect scope based on file paths
function detectScope(files) {
  // Check for specific directories
  if (files.some(f => f.startsWith('web/'))) return 'web';
  if (files.some(f => f.startsWith('mobile/'))) return 'mobile';
  if (files.some(f => f.startsWith('backend/'))) return 'backend';
  if (files.some(f => f.startsWith('shared/'))) return 'shared';
  
  // Check for specific patterns
  if (files.some(f => f.includes('schema.prisma') || f.includes('migrations'))) return 'database';
  if (files.some(f => f.includes('auth'))) return 'auth';
  if (files.some(f => f.includes('sensor'))) return 'sensors';
  if (files.some(f => f.includes('package.json'))) return 'deps';
  if (files.some(f => f.includes('.config.') || f.includes('tsconfig'))) return 'config';
  if (files.some(f => f.includes('component') || f.includes('ui'))) return 'ui';
  if (files.some(f => f.includes('api') || f.includes('route'))) return 'api';
  if (files.some(f => f.includes('test') || f.includes('spec'))) return 'tests';
  
  return 'general';
}

// Function to generate description based on type and scope
function generateDescription(type, scope, files) {
  const fileCount = files.length;
  
  switch (type) {
    case 'feat':
      if (scope === 'ui' || files.some(f => f.includes('component'))) {
        return 'add new component functionality';
      } else if (scope === 'api' || files.some(f => f.includes('api') || f.includes('route'))) {
        return 'implement new api endpoint';
      } else if (scope === 'auth') {
        return 'enhance authentication features';
      } else if (scope === 'sensors') {
        return 'add sensor management features';
      } else {
        return 'implement new feature';
      }
    
    case 'fix':
      return scope === 'general' ? 'resolve functionality issues' : `fix ${scope} implementation`;
    
    case 'upgrade':
      return fileCount > 5 ? 'update multiple dependencies' : 'update dependencies to latest versions';
    
    case 'test':
      return scope === 'general' ? 'add test coverage' : `add ${scope} test coverage`;
    
    case 'docs':
      return scope === 'general' ? 'update documentation' : `update ${scope} documentation`;
    
    case 'config':
      return 'update configuration settings';
    
    case 'refactor':
      return scope === 'general' ? 'improve code structure' : `refactor ${scope} implementation`;
    
    case 'style':
      return 'improve code formatting and style';
    
    case 'perf':
      return scope === 'general' ? 'optimize performance' : `improve ${scope} performance`;
    
    case 'chore':
      return 'update build process and tooling';
    
    default:
      return scope === 'general' ? 'update implementation' : `update ${scope} implementation`;
  }
}

// Function to prompt user for input
function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Main function
async function main() {
  console.log('🤖 Auto Commit Message Generator\n');
  
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.error('❌ No staged files found. Please stage your changes first with: git add <files>');
    process.exit(1);
  }
  
  console.log(`📁 Staged files (${stagedFiles.length}):`);
  stagedFiles.slice(0, 10).forEach(file => console.log(`   ${file}`));
  if (stagedFiles.length > 10) {
    console.log(`   ... and ${stagedFiles.length - 10} more files`);
  }
  console.log('');
  
  const type = detectCommitType(stagedFiles);
  const scope = detectScope(stagedFiles);
  const description = generateDescription(type, scope, stagedFiles);
  
  const commitMessage = `${type}(${scope}): ${description}`;
  
  console.log('✨ Generated commit message:');
  console.log(`   ${commitMessage}\n`);
  
  const choice = await prompt('Use this message? (y/n/e for edit): ');
  
  switch (choice.toLowerCase()) {
    case 'y':
    case 'yes':
      try {
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
        console.log('\n✅ Commit successful!');
      } catch (error) {
        console.error('❌ Commit failed:', error.message);
        process.exit(1);
      }
      break;
    
    case 'e':
    case 'edit':
      const customMessage = await prompt('Enter your custom commit message: ');
      if (customMessage) {
        try {
          execSync(`git commit -m "${customMessage}"`, { stdio: 'inherit' });
          console.log('\n✅ Commit successful!');
        } catch (error) {
          console.error('❌ Commit failed:', error.message);
          process.exit(1);
        }
      } else {
        console.log('❌ Commit cancelled - no message provided.');
      }
      break;
    
    default:
      console.log('❌ Commit cancelled.');
      process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}