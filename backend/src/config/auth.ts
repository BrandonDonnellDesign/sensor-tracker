import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export class AuthConfig {
  private static readonly SALT_ROUNDS = 12;
  
  static get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }
  
  static get jwtRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    return secret;
  }
  
  static get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '15m';
  }
  
  static get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }
  
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  
  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  /**
   * Generate an access token
   */
  static generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: 'access' as const };
    const options: SignOptions = { expiresIn: this.jwtExpiresIn as any };
    return jwt.sign(tokenPayload, this.jwtSecret, options);
  }
  
  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: 'refresh' as const };
    const options: SignOptions = { expiresIn: this.jwtRefreshExpiresIn as any };
    return jwt.sign(tokenPayload, this.jwtRefreshSecret, options);
  }
  
  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
  
  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret) as JwtPayload;
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<JwtPayload, 'type'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}