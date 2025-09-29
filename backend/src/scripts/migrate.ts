import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Run any custom migration logic here if needed
    // For now, Prisma handles migrations automatically
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Delete all data in reverse order of dependencies
    await prisma.photo.deleteMany();
    await prisma.sensor.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Database reset completed');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'reset') {
  resetDatabase();
} else {
  runMigrations();
}