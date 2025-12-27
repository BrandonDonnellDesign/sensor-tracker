'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase-client';
import { dateTimeFormatter } from '@/utils/date-formatter';
import { Profile } from '@/types/profile';
import type { Session, User, AuthError } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create the SSR-compatible Supabase client
  const supabase = createClient();

  // Load user profile and set it in the date formatter
  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        dateTimeFormatter.setProfile(profile as Profile);
      }
    } catch (error) {
      // Silently handle profile loading errors
    }
  };

  // Record login activity for gamification using new streak system (DISABLED)
  const recordLoginActivity = async (userId: string) => {
    // Disabled to prevent RLS errors since we have correct streak in database
    return;
  };

  useEffect(() => {
    const session = supabase.auth.getSession();
    session.then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      
      // Load profile for date formatting and record login activity
      if (currentUser?.id) {
        loadUserProfile(currentUser.id);
        
        // Record login activity for existing session (user returning to app)
        // Only record once per session to avoid spam
        const lastLoginRecorded = sessionStorage.getItem('login_recorded_today');
        const today = new Date().toDateString();
        
        if (lastLoginRecorded !== today) {
          recordLoginActivity(currentUser.id);
          sessionStorage.setItem('login_recorded_today', today);
        }
      } else {
        dateTimeFormatter.setProfile(null);
      }
      
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Load profile for date formatting and record login activity
      if (currentUser?.id) {
        loadUserProfile(currentUser.id);
        
        // Record login activity for gamification (only on sign in events)
        if (event === 'SIGNED_IN') {
          recordLoginActivity(currentUser.id);
          sessionStorage.setItem('login_recorded_today', new Date().toDateString());
        }
      } else {
        dateTimeFormatter.setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    
    // Record login activity
    if (data.user?.id) {
      await recordLoginActivity(data.user.id);
      sessionStorage.setItem('login_recorded_today', new Date().toDateString());
    }
    
    return { user: data.user, session: data.session, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    setUser(data.user);
    return { user: data.user, session: data.session, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    dateTimeFormatter.setProfile(null);
  };

  const signInWithGoogle = async () => {
    // Get the current site URL, ensuring it works correctly in production
    const getRedirectUrl = () => {
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        
        // If we're on localhost, always use localhost for redirects in development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return origin; // Always use localhost for development
        }
        
        // Use the actual origin for production
        return origin;
      }
      
      // Fallback for server-side or when window is not available
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
      }
      return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    };

    const redirectUrl = getRedirectUrl();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}/dashboard`
      }
    });
    return { user: null, session: null, error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
