'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { DexcomSettings } from '@/components/dexcom-settings';
import { MyFitnessPalIntegration } from '@/components/settings/myfitnesspal-integration';
import { GmailConnectionCard } from '@/components/settings/gmail-connection-card';
import { Shield, Activity, Mail, Utensils, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface IntegrationRowProps {
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  enabled?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}

function IntegrationRow({
  title,
  category,
  description,
  icon,
  enabled = false,
  onToggle,
  children,
}: IntegrationRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden'>
      <div className='p-6 flex items-center gap-4'>
        {/* Icon */}
        <div className='w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0'>
          {icon}
        </div>
        
        {/* Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h3 className='text-lg font-semibold text-white'>{title}</h3>
            <span className='px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded'>
              {category}
            </span>
            {enabled && (
              <span className='px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-medium'>
                Connected
              </span>
            )}
          </div>
          <p className='text-sm text-gray-400'>{description}</p>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-3 flex-shrink-0'>
          {onToggle && (
            <div className='flex items-center gap-2'>
              {enabled && (
                <span className='text-sm font-medium text-white'>Enabled</span>
              )}
              <button
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
          
          {children && (
            <button
              onClick={() => setExpanded(!expanded)}
              className='px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2'
            >
              View More
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && children && (
        <div className='px-6 pb-6 border-t border-gray-800'>
          <div className='pt-6'>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function CgmIntegrations() {
  const { user } = useAuth();
  const [dexcomEnabled, setDexcomEnabled] = useState(false);
  const [mfpEnabled, setMfpEnabled] = useState(false);
  const [gmailEnabled, setGmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load connection statuses
  useEffect(() => {
    const loadStatuses = async () => {
      if (!user?.id) return;
      
      try {
        const supabase = await import('@/lib/supabase-client').then(m => m.createClient());
        
        // Check Dexcom
        const { data: dexcomData } = await (supabase as any)
          .from('dexcom_tokens')
          .select('id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        setDexcomEnabled(!!dexcomData);

        // Check MyFitnessPal
        const { data: mfpData } = await fetch('/api/myfitnesspal/status').then(r => r.json());
        setMfpEnabled(mfpData?.connected || false);

        // Check Gmail
        const { data: gmailData } = await fetch('/api/gmail/status').then(r => r.json());
        setGmailEnabled(gmailData?.connected || false);
      } catch (error) {
        console.error('Error loading integration statuses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatuses();
  }, [user?.id]);

  const handleDexcomToggle = async () => {
    if (dexcomEnabled) {
      // Disconnect
      if (confirm('Are you sure you want to disconnect Dexcom? This will stop syncing glucose data.')) {
        try {
          const supabase = await import('@/lib/supabase-client').then(m => m.createClient());
          await (supabase as any)
            .from('dexcom_tokens')
            .update({ is_active: false })
            .eq('user_id', user?.id);
          setDexcomEnabled(false);
        } catch (error) {
          console.error('Error disconnecting Dexcom:', error);
        }
      }
    } else {
      // Connect - handled by DexcomSettings component
      setDexcomEnabled(true);
    }
  };

  const handleMfpToggle = async () => {
    if (mfpEnabled) {
      // Disconnect
      if (confirm('Are you sure you want to disconnect MyFitnessPal? This will stop syncing nutrition data.')) {
        try {
          await fetch('/api/myfitnesspal/disconnect', { method: 'POST' });
          setMfpEnabled(false);
        } catch (error) {
          console.error('Error disconnecting MyFitnessPal:', error);
        }
      }
    } else {
      // Connect - handled by MyFitnessPalIntegration component
      setMfpEnabled(true);
    }
  };

  const handleGmailToggle = async () => {
    if (gmailEnabled) {
      // Disconnect
      if (confirm('Are you sure you want to disconnect Gmail? This will stop tracking sensor orders.')) {
        try {
          await fetch('/api/gmail/disconnect', { method: 'DELETE' });
          setGmailEnabled(false);
        } catch (error) {
          console.error('Error disconnecting Gmail:', error);
        }
      }
    } else {
      // Connect - handled by GmailConnectionCard component
      setGmailEnabled(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center'>
          <Shield className='w-6 h-6 text-gray-400' />
        </div>
        <div>
          <h2 className='text-2xl font-bold text-white'>Third-Party Integrations</h2>
          <p className='text-gray-400 text-sm'>Manage and configure connections to external services and platforms</p>
        </div>
      </div>

      {/* Integration Rows */}
      <div className='space-y-4'>
        {/* Dexcom */}
        <IntegrationRow
          title='Dexcom'
          category='CGM'
          description='Connect your Dexcom account to sync glucose readings and track sensor changes.'
          icon={<Activity className='w-6 h-6 text-blue-400' />}
          enabled={dexcomEnabled}
          onToggle={handleDexcomToggle}
        >
          <DexcomSettings user={user} />
        </IntegrationRow>

        {/* MyFitnessPal */}
        <IntegrationRow
          title='MyFitnessPal'
          category='Nutrition'
          description='Link your MyFitnessPal account to sync food logs and nutrition data.'
          icon={<Utensils className='w-6 h-6 text-green-400' />}
          enabled={mfpEnabled}
          onToggle={handleMfpToggle}
        >
          <MyFitnessPalIntegration />
        </IntegrationRow>

        {/* Gmail */}
        <IntegrationRow
          title='Gmail'
          category='Email'
          description='Integrate your Gmail account to automatically track sensor orders and shipments.'
          icon={<Mail className='w-6 h-6 text-red-400' />}
          enabled={gmailEnabled}
          onToggle={handleGmailToggle}
        >
          <GmailConnectionCard />
        </IntegrationRow>
      </div>

      {/* Security Notice */}
      <div className='bg-gray-900/50 border border-gray-800 rounded-xl p-6'>
        <div className='flex items-start gap-3'>
          <Shield className='w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5' />
          <div>
            <h3 className='text-white font-semibold mb-2'>Integration Security</h3>
            <p className='text-gray-400 text-sm leading-relaxed'>
              Ensure you trust the applications you connect. Review and manage third-party access to your account regularly. 
              You can revoke access at any time by disabling the integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
