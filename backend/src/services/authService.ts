import { User } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthConfig } from '../config/auth';

export interface RegisterUserData {
  email: string;
  password: string;
}

export interface LoginUserData {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterUserData): Promise<AuthTokens> {
    const { email, password } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Hash password
    const passwordHash = await AuthConfig.hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      }
    });
    
    // Generate tokens
    const tokens = AuthConfig.generateTokenPair({
      userId: user.id,
      email: user.email,
    });
    
    // Update last sync time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSyncAt: new Date() }
    });
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return {
      ...tokens,
      user: userWithoutPassword
    };
  }
  
  /**
   * Login user
   */
  static async login(loginData: LoginUserData): Promise<AuthTokens> {
    const { email, password } = loginData;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await AuthConfig.verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }
    
    // Generate tokens
    const tokens = AuthConfig.generateTokenPair({
      userId: user.id,
      email: user.email,
    });
    
    // Update last sync time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSyncAt: new Date() }
    });
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return {
      ...tokens,
      user: userWithoutPassword
    };
  }
  
  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = AuthConfig.verifyRefreshToken(refreshToken);
      
      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate new access token
      const accessToken = AuthConfig.generateAccessToken({
        userId: user.id,
        email: user.email,
      });
      
      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string, 
    updateData: { email?: string }
  ): Promise<Omit<User, 'passwordHash'>> {
    // If email is being updated, check if it's already taken
    if (updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: userId }
        }
      });
      
      if (existingUser) {
        throw new Error('Email is already taken');
      }
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Change password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isValidPassword = await AuthConfig.verifyPassword(currentPassword, user.passwordHash);
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const newPasswordHash = await AuthConfig.hashPassword(newPassword);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });
  }
  
  /**
   * Delete user account
   */
  static async deleteAccount(userId: string): Promise<void> {
    // This will cascade delete all sensors and photos due to foreign key constraints
    await prisma.user.delete({
      where: { id: userId }
    });
  }
}