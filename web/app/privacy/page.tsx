export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-slate-300 mb-8">
              Last updated: November 4, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-slate-300 mb-4">
                We collect information you provide directly to us, such as when you create an account, log glucose readings, food intake, or insulin doses. This includes:
              </p>
              <ul className="text-slate-300 mb-4 list-disc list-inside">
                <li>Account information (email, name)</li>
                <li>Health data (glucose readings, food logs, insulin doses)</li>
                <li>Device information (CGM sensor details)</li>
                <li>Usage data (how you interact with the app)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-300 mb-4">
                We use your information to:
              </p>
              <ul className="text-slate-300 mb-4 list-disc list-inside">
                <li>Provide and maintain the CGM Tracker service</li>
                <li>Sync data from your connected devices (like Dexcom)</li>
                <li>Generate insights and analytics about your glucose patterns</li>
                <li>Send you notifications and updates about your health data</li>
                <li>Improve our services and develop new features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
              <p className="text-slate-300 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted both in transit and at rest.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Third-Party Integrations</h2>
              <p className="text-slate-300 mb-4">
                When you connect third-party services (like Dexcom), we access only the data necessary to provide our services. We do not share your data with these services beyond what's required for the integration to function.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-slate-300 mb-4">
                We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-slate-300 mb-4">
                You have the right to:
              </p>
              <ul className="text-slate-300 mb-4 list-disc list-inside">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
              <p className="text-slate-300 mb-4">
                If you have any questions about this Privacy Policy, please contact us through the app's support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}