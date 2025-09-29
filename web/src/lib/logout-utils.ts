import { supabase } from './supabase';

// Utility function to force logout from browser console
export const forceLogout = async () => {
  try {
    console.log('Attempting to sign out...');
    await supabase.auth.signOut();
    console.log('Signed out successfully');
    
    // Clear any local storage items
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Redirect to login
    window.location.href = '/auth/login';
  } catch (error) {
    console.error('Error during logout:', error);
    // Force redirect even if logout fails
    window.location.href = '/auth/login';
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).forceLogout = forceLogout;
}