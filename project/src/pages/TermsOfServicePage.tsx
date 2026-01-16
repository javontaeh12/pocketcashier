import { ChevronLeft } from 'lucide-react';

export function TermsOfServicePage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 font-semibold"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="prose prose-sm sm:prose max-w-none">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600 text-sm mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Pocket Cashier ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on Pocket Cashier for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on Pocket Cashier</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Violating any applicable laws or regulations related to the access to or use of Pocket Cashier</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              The materials on Pocket Cashier are provided "as is". Pocket Cashier makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Limitations</h2>
            <p className="text-gray-700 mb-4">
              In no event shall Pocket Cashier or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Pocket Cashier, even if Pocket Cashier or an authorized representative has been notified of the possibility of such damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Accuracy of Materials</h2>
            <p className="text-gray-700 mb-4">
              The materials appearing on Pocket Cashier could include technical, typographical, or photographic errors. Pocket Cashier does not warrant that any of the materials on the website are accurate, complete, or current. Pocket Cashier may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Links</h2>
            <p className="text-gray-700 mb-4">
              Pocket Cashier has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Pocket Cashier of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Modifications</h2>
            <p className="text-gray-700 mb-4">
              Pocket Cashier may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              When you create an account, you agree to provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your password and account information. You agree to accept responsibility for all activities that occur under your account. You must notify us of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Payment Terms</h2>
            <p className="text-gray-700 mb-4">
              When you make a purchase through Pocket Cashier, you agree to pay the advertised price for the goods or services. We reserve the right to refuse any order and to discontinue making available the Service or any product at any time, in our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Intellectual Property Rights</h2>
            <p className="text-gray-700 mb-4">
              All content included on this site, such as text, graphics, logos, images, as well as the compilation thereof, and any software used on this site, is the property of Pocket Cashier or its content suppliers and is protected by international copyright laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              Under no circumstances shall Pocket Cashier, its suppliers, or other related parties be liable for any damages or losses that may arise from the use of Pocket Cashier or reliance on any information provided by the website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us through the support section of our website or via the contact information provided in our Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
