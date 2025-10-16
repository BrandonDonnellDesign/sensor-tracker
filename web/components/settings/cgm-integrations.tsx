'use client';

'use client';

import { Settings, Zap, Activity } from 'lucide-react';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

function IntegrationCard({
  title,
  description,
  icon,
  features,
}: IntegrationCardProps) {
  return (
    <div className='bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6'>
      {/* Header with Icon */}
      <div className='text-center mb-6'>
        <div className='relative inline-flex items-center justify-center mb-4'>
          <div className='w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center'>
            {icon}
          </div>
          <div className='absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center'>
            <Zap className='w-2.5 h-2.5 text-white' />
          </div>
        </div>

        <h3 className='text-xl font-bold text-gray-900 dark:text-slate-100 mb-3'>
          {title}
        </h3>

        <div className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mb-4'>
          <Zap className='w-3 h-3 mr-1' />
          Coming Soon
        </div>
      </div>

      {/* Description */}
      <div className='text-center mb-6'>
        <p className='text-gray-600 dark:text-slate-400 text-sm leading-relaxed'>
          {description}
        </p>
      </div>

      {/* Features */}
      <div className='space-y-2'>
        {features.map((feature, index) => (
          <div
            key={index}
            className='flex items-center text-gray-600 dark:text-slate-400 text-sm'>
            <div className='w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0'></div>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CgmIntegrations() {
  return (
    <div className='space-y-8'>
      {/* Main Header */}
      <div className='text-center'>
        <div className='relative inline-flex items-center justify-center mb-6'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center'>
            <Settings className='w-8 h-8 text-gray-400 dark:text-slate-500' />
          </div>
          <div className='absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center'>
            <Zap className='w-3 h-3 text-white' />
          </div>
        </div>

        <h2 className='text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4'>
          CGM Integrations
        </h2>

        <p className='text-gray-600 dark:text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto mb-8'>
          Automatic sensor data sync from your CGM devices is currently in
          development. These features will allow you to automatically import
          sensor information, eliminating manual entry.
        </p>
      </div>

      {/* Integration Cards */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <IntegrationCard
          title='Dexcom Integration'
          description='Connect your Dexcom account for automatic glucose data synchronization and real-time monitoring.'
          icon={<Activity className='w-6 h-6 text-blue-500' />}
          features={[
            'Automatic sensor detection',
            'Real-time sync with Dexcom',
            'Device status monitoring',
            'Historical data import',
          ]}
        />

        <IntegrationCard
          title='Freestyle Libre Integration'
          description='Sync your Freestyle Libre data automatically for seamless glucose monitoring and tracking.'
          icon={<Activity className='w-6 h-6 text-green-500' />}
          features={[
            'LibreView data sync',
            'Sensor change detection',
            'Trend analysis integration',
            'Multi-device support',
          ]}
        />
      </div>

      {/* Footer */}
      <div className='text-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2'>
          Coming Soon
        </h3>
        <p className='text-sm text-gray-500 dark:text-slate-500'>
          Stay tuned for updates in future releases. These integrations will
          make managing your diabetes data effortless.
        </p>
      </div>
    </div>
  );
}
