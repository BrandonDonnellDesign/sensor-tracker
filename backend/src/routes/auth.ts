import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} from '../middleware/validation';

const router = Router();

// Public routes
router.post('/register', 
  validateRegistration, 
  handleValidationErrors, 
  AuthController.register
);

router.post('/login', 
  validateLogin, 
  handleValidationErrors, 
  AuthController.login
);

router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);

router.put('/profile', 
  authenticateToken, 
  AuthController.updateProfile
);

router.post('/change-password', 
  authenticateToken, 
  AuthController.changePassword
);

router.post('/logout', authenticateToken, AuthController.logout);

router.delete('/account', authenticateToken, AuthController.deleteAccount);

export default router;