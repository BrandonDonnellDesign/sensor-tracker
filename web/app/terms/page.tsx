export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-slate-300 mb-8">
              Last updated: November 4, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-300 mb-4">
                By accessing and using CGM Tracker, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Medical Disclaimer</h2>
              <p className="text-slate-300 mb-4">
                CGM Tracker is a tool for tracking and analyzing glucose data. It is not intended to replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Data Privacy</h2>
              <p className="text-slate-300 mb-4">
                Your health data is private and secure. We use industry-standard encryption and security measures to protect your information. We do not sell or share your personal health information with third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
              <p className="text-slate-300 mb-4">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Service Availability</h2>
              <p className="text-slate-300 mb-4">
                We strive to maintain high availability but cannot guarantee uninterrupted service. We reserve the right to modify or discontinue the service with reasonable notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Contact Information</h2>
              <p className="text-slate-300 mb-4">
                If you have any questions about these Terms of Service, please contact us through the app's support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}