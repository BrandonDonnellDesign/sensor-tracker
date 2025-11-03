#!/usr/bin/env node

/**
 * Performance Budget Monitor
 * 
 * Checks if the current build exceeds performance budgets
 * Run this in CI/CD to prevent performance regressions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budgets (in KB)
const PERFORMANCE_BUDGETS = {
  // JavaScript bundles
  totalJS: 2000, // 2MB total JS
  mainBundle: 250, // 250KB for main bundle
  vendorBundle: 500, // 500KB for vendor libraries
  
  // Individual chunks
  maxChunkSize: 200, // 200KB per chunk
  
  // Images and assets
  totalAssets: 5000, // 5MB total assets
  
  // Critical metrics
  firstLoadJS: 300, // 300KB for first load
};

const ALERT_THRESHOLDS = {
  warning: 0.8, // 80% of budget
  error: 1.0,   // 100% of budget
};

function analyzeBundle() {
  const buildPath = path.join(__dirname, '../.next');
  
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Build not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('📊 Performance Budget Analysis\n');

  // Analyze JavaScript bundles
  const staticPath = path.join(buildPath, 'static');
  let totalJSSize = 0;
  let violations = [];
  let warnings = [];

  if (fs.existsSync(staticPath)) {
    const chunksPath = path.join(staticPath, 'chunks');
    
    if (fs.existsSync(chunksPath)) {
      const chunks = fs.readdirSync(chunksPath)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(chunksPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
          totalJSSize += sizeKB;
          
          return { name: file, size: sizeKB };
        })
        .sort((a, b) => b.size - a.size);

      // Check individual chunk sizes
      chunks.forEach(chunk => {
        const percentage = (chunk.size / PERFORMANCE_BUDGETS.maxChunkSize) * 100;
        
        if (chunk.size > PERFORMANCE_BUDGETS.maxChunkSize) {
          violations.push({
            type: 'Chunk Size',
            item: chunk.name,
            current: `${chunk.size}KB`,
            budget: `${PERFORMANCE_BUDGETS.maxChunkSize}KB`,
            percentage: percentage.toFixed(1)
          });
        } else if (percentage > ALERT_THRESHOLDS.warning * 100) {
          warnings.push({
            type: 'Chunk Size',
            item: chunk.name,
            current: `${chunk.size}KB`,
            budget: `${PERFORMANCE_BUDGETS.maxChunkSize}KB`,
            percentage: percentage.toFixed(1)
          });
        }
      });

      // Check total JS size
      const totalPercentage = (totalJSSize / PERFORMANCE_BUDGETS.totalJS) * 100;
      
      if (totalJSSize > PERFORMANCE_BUDGETS.totalJS) {
        violations.push({
          type: 'Total JS',
          item: 'All JavaScript',
          current: `${totalJSSize.toFixed(2)}KB`,
          budget: `${PERFORMANCE_BUDGETS.totalJS}KB`,
          percentage: totalPercentage.toFixed(1)
        });
      } else if (totalPercentage > ALERT_THRESHOLDS.warning * 100) {
        warnings.push({
          type: 'Total JS',
          item: 'All JavaScript',
          current: `${totalJSSize.toFixed(2)}KB`,
          budget: `${PERFORMANCE_BUDGETS.totalJS}KB`,
          percentage: totalPercentage.toFixed(1)
        });
      }

      // Display results
      console.log('📦 Bundle Analysis:');
      console.log(`   Total JS Size: ${totalJSSize.toFixed(2)}KB (${totalPercentage.toFixed(1)}% of budget)`);
      console.log(`   Largest Chunks:`);
      
      chunks.slice(0, 5).forEach(chunk => {
        const status = chunk.size > PERFORMANCE_BUDGETS.maxChunkSize ? '❌' : 
                      chunk.size > PERFORMANCE_BUDGETS.maxChunkSize * ALERT_THRESHOLDS.warning ? '⚠️' : '✅';
        console.log(`     ${status} ${chunk.name}: ${chunk.size}KB`);
      });
    }
  }

  console.log('\n');

  // Display warnings
  if (warnings.length > 0) {
    console.log('⚠️  Performance Warnings:');
    warnings.forEach(warning => {
      console.log(`   ${warning.type}: ${warning.item}`);
      console.log(`   Current: ${warning.current} | Budget: ${warning.budget} | Usage: ${warning.percentage}%`);
    });
    console.log('');
  }

  // Display violations
  if (violations.length > 0) {
    console.log('❌ Performance Budget Violations:');
    violations.forEach(violation => {
      console.log(`   ${violation.type}: ${violation.item}`);
      console.log(`   Current: ${violation.current} | Budget: ${violation.budget} | Exceeded by: ${(parseFloat(violation.percentage) - 100).toFixed(1)}%`);
    });
    console.log('');
    
    console.log('💡 Recommendations:');
    console.log('   1. Use dynamic imports for large components');
    console.log('   2. Analyze bundle with `npm run analyze`');
    console.log('   3. Remove unused dependencies');
    console.log('   4. Optimize images and assets');
    console.log('   5. Consider code splitting strategies');
    
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('⚠️  Some bundles are approaching budget limits. Monitor closely.');
    process.exit(0);
  }

  console.log('✅ All performance budgets are within limits!');
  console.log('🎉 Great job maintaining optimal bundle sizes!');
}

// Run the analysis
analyzeBundle();