interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-6 text-gray-700">
          <section>
            <h3 className="text-xl font-semibold mb-2">1. Introduction</h3>
            <p>
              Pocket Cashier ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">2. Information We Collect</h3>
            <p className="mb-2">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information (email, password, business name)</li>
              <li>Business details (address, phone, social media links)</li>
              <li>Payment and order information</li>
              <li>Calendar and booking information</li>
              <li>Any other information you voluntarily provide</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">3. How We Use Your Information</h3>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your inquiries and requests</li>
              <li>Improve and optimize our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">4. Data Security</h3>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">5. Third-Party Services</h3>
            <p>
              We may use third-party services including Google Calendar, Square Payments, and MailerLite. These services may collect, use, and share information according to their own privacy policies. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">6. Cookies and Tracking</h3>
            <p>
              We use cookies and similar tracking technologies to enhance your user experience and analyze site traffic. You can control cookie settings through your browser.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">7. Your Rights</h3>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">8. Data Retention</h3>
            <p>
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">9. Children's Privacy</h3>
            <p>
              Our services are not intended for individuals under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">10. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy periodically. We will notify you of any significant changes by posting the new policy on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">11. Contact Us</h3>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us through your admin portal or email the support address provided in your account.
            </p>
          </section>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Last updated: January 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
