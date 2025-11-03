'use client';

import { ApiKeyManager } from '@/components/api/api-key-manager';
import { ResponsiveHeader } from '@/components/navigation/responsive-header';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';

export default function ApiSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <ResponsiveHeader 
        title="API Settings"
        subtitle="Manage your API keys and access"
        showSearch={false}
      />
      
      <main className="container mx-auto px-4 py-6 pb-20 lg:pb-6">
        <div className="max-w-6xl mx-auto">
          <ApiKeyManager />
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}