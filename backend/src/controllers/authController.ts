import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.register({ email, password });
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  }
  
  /**
   * Login user
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.login({ email, password });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }
  
  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }
      
      const result = await AuthService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  }
  
  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      const user = await AuthService.getProfile(req.user.userId);
      
      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile'
      });
    }
  }
  
  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      const { email } = req.body;
      const user = await AuthService.updateProfile(req.user.userId, { email });
      
      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile'
      });
    }
  }
  
  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }
      
      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password'
      });
    }
  }
  
  /**
   * Delete user account
   */
  static async deleteAccount(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      await AuthService.deleteAccount(req.user.userId);
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete account'
      });
    }
  }
  
  /**
   * Logout (client-side token invalidation)
   */
  static async logout(req: Request, res: Response) {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // by removing the tokens from storage
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}