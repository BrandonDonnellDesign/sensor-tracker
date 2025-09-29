import { PrismaClient } from '@prisma/client';
import { AuthConfig } from '../config/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Create test user
    const testUserEmail = 'test@example.com';
    const testUserPassword = 'TestPassword123!';
    
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testUserEmail }
    });
    
    if (existingUser) {
      console.log('ℹ️  Test user already exists, skipping creation');
      return;
    }
    
    // Create test user
    const passwordHash = await AuthConfig.hashPassword(testUserPassword);
    
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash,
      }
    });
    
    console.log(`✅ Created test user: ${testUserEmail}`);
    
    // Create sample sensors
    const sampleSensors = [
      {
        serialNumber: 'SN123456789',
        lotNumber: 'LOT001',
        dateAdded: new Date('2024-01-15'),
        isProblematic: false,
      },
      {
        serialNumber: 'SN987654321',
        lotNumber: 'LOT002',
        dateAdded: new Date('2024-01-20'),
        isProblematic: true,
        issueNotes: 'Sensor failed after 3 days, adhesive came loose',
      },
      {
        serialNumber: 'SN456789123',
        lotNumber: 'LOT001',
        dateAdded: new Date('2024-01-25'),
        isProblematic: false,
      }
    ];
    
    for (const sensorData of sampleSensors) {
      await prisma.sensor.create({
        data: {
          ...sensorData,
          userId: testUser.id,
        }
      });
    }
    
    console.log(`✅ Created ${sampleSensors.length} sample sensors`);
    console.log('🎉 Database seeding completed successfully');
    console.log(`📧 Test user credentials: ${testUserEmail} / ${testUserPassword}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();