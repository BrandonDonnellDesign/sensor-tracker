#!/usr/bin/env node

/**
 * Generate a secure encryption key for the application
 * This key is used to encrypt sensitive data like API tokens
 */

import crypto from 'crypto';

// Generate a random 32-byte (256-bit) key
const key = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated Encryption Key:\n');
console.log(key);
console.log('\n📋 Add this to your .env.local file:\n');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\n⚠️  IMPORTANT: Keep this key secret and never commit it to version control!\n');
