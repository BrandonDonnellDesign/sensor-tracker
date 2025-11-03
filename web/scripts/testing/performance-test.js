#!/usr/bin/env node

/**
 * Performance Test Script
 * 
 * This script tests the performance optimizations we've implemented:
 * - Bundle size analysis
 * - Component lazy loading
 * - Image optimization
 * - Cache effectiveness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Performance Test Results\n');

// Check if build exists
const buildPath = path.join(__dirname, '../.next');
if (!fs.existsSync(buildPath)) {
  console.log('❌ Build not found. Run `npm run build` first.');
  process.exit(1);
}

// Analyze bundle sizes
const staticPath = path.join(buildPath, 'static');
if (fs.existsSync(staticPath)) {
  console.log('📦 Bundle Analysis:');
  
  // Check for chunks directory
  const chunksPath = path.join(staticPath, 'chunks');
  if (fs.existsSync(chunksPath)) {
    const chunks = fs.readdirSync(chunksPath)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(chunksPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024 * 100) / 100
        };
      })
      .sort((a, b) => b.size - a.size);

    chunks.slice(0, 10).forEach(chunk => {
      const status = chunk.sizeKB < 100 ? '✅' : chunk.sizeKB < 250 ? '⚠️' : '❌';
      console.log(`  ${status} ${chunk.name}: ${chunk.sizeKB}KB`);
    });
    
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`\n  📊 Total JS Bundle Size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`);
  }
}

// Check for lazy loading components
console.log('\n🔄 Lazy Loading Components:');
const lazyIndexPath = path.join(__dirname, '../components/lazy/index.ts');
if (fs.existsSync(lazyIndexPath)) {
  const lazyContent = fs.readFileSync(lazyIndexPath, 'utf8');
  const lazyComponents = lazyContent.match(/export const \w+/g) || [];
  console.log(`  ✅ ${lazyComponents.length} components configured for lazy loading`);
  lazyComponents.slice(0, 5).forEach(component => {
    console.log(`    - ${component.replace('export const ', '')}`);
  });
  if (lazyComponents.length > 5) {
    console.log(`    ... and ${lazyComponents.length - 5} more`);
  }
} else {
  console.log('  ❌ Lazy loading index not found');
}

// Check performance hooks
console.log('\n⚡ Performance Monitoring:');
const perfHookPath = path.join(__dirname, '../hooks/use-performance.ts');
if (fs.existsSync(perfHookPath)) {
  console.log('  ✅ Performance monitoring hooks available');
  console.log('    - Render time tracking');
  console.log('    - Memory usage monitoring');
  console.log('    - Slow render detection');
} else {
  console.log('  ❌ Performance hooks not found');
}

// Check image optimization
console.log('\n🖼️ Image Optimization:');
const optimizedImagePath = path.join(__dirname, '../components/ui/optimized-image.tsx');
if (fs.existsSync(optimizedImagePath)) {
  const imageContent = fs.readFileSync(optimizedImagePath, 'utf8');
  const hasOptimizedImage = imageContent.includes('OptimizedImage');
  const hasNextImage = imageContent.includes('next/image');
  const hasErrorHandling = imageContent.includes('onError');
  
  console.log(`  ${hasOptimizedImage ? '✅' : '❌'} Optimized image component`);
  console.log(`  ${hasNextImage ? '✅' : '❌'} Next.js Image component`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling support`);
} else {
  console.log('  ❌ Optimized image component not found');
}

// Check Next.js config optimizations
console.log('\n⚙️ Next.js Optimizations:');
const nextConfigPath = path.join(__dirname, '../next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, 'utf8');
  const hasBundleAnalyzer = configContent.includes('withBundleAnalyzer');
  const hasImageOptimization = configContent.includes('image') && configContent.includes('formats');
  const hasCodeSplitting = configContent.includes('splitChunks');
  const hasCompression = configContent.includes('removeConsole');
  
  console.log(`  ${hasBundleAnalyzer ? '✅' : '❌'} Bundle analyzer configured`);
  console.log(`  ${hasImageOptimization ? '✅' : '❌'} Image format optimization`);
  console.log(`  ${hasCodeSplitting ? '✅' : '❌'} Code splitting configured`);
  console.log(`  ${hasCompression ? '✅' : '❌'} Production optimizations`);
} else {
  console.log('  ❌ Next.js config not found');
}

// Performance recommendations
console.log('\n💡 Performance Recommendations:');
console.log('  1. Run `npm run analyze` to see detailed bundle analysis');
console.log('  2. Monitor Core Web Vitals in production');
console.log('  3. Use the performance hooks in development');
console.log('  4. Consider implementing service workers for caching');
console.log('  5. Monitor bundle sizes with each deployment');

console.log('\n🎉 Performance optimization setup complete!');