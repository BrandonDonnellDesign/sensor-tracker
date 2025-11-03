import EmailTestSuite from '@/components/admin/email-test-suite';

export default function EmailTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <EmailTestSuite />
      </div>
    </div>
  );
}