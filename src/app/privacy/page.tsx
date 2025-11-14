import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | GrindProof",
  description: "GrindProof Privacy Policy - Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-6"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-zinc-400">Last Updated: November 14, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <div className="prose prose-invert prose-zinc max-w-none">
            {/* Table of Contents */}
            <nav className="mb-8 p-4 bg-zinc-900/50 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-sm">
                <li><a href="#introduction" className="text-blue-400 hover:text-blue-300">1. Introduction</a></li>
                <li><a href="#information-we-collect" className="text-blue-400 hover:text-blue-300">2. Information We Collect</a></li>
                <li><a href="#how-we-use" className="text-blue-400 hover:text-blue-300">3. How We Use Your Information</a></li>
                <li><a href="#data-storage" className="text-blue-400 hover:text-blue-300">4. Data Storage and Security</a></li>
                <li><a href="#third-party" className="text-blue-400 hover:text-blue-300">5. Third-Party Services</a></li>
                <li><a href="#your-rights" className="text-blue-400 hover:text-blue-300">6. Your Rights</a></li>
                <li><a href="#cookies" className="text-blue-400 hover:text-blue-300">7. Cookies and Local Storage</a></li>
                <li><a href="#children" className="text-blue-400 hover:text-blue-300">8. Children's Privacy</a></li>
                <li><a href="#changes" className="text-blue-400 hover:text-blue-300">9. Changes to This Policy</a></li>
                <li><a href="#contact" className="text-blue-400 hover:text-blue-300">10. Contact Us</a></li>
              </ul>
            </nav>

            {/* Introduction */}
            <section id="introduction" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="text-zinc-300 mb-4">
                Welcome to GrindProof ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our productivity tracking application.
              </p>
              <p className="text-zinc-300">
                By using GrindProof, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
              </p>
            </section>

            {/* Information We Collect */}
            <section id="information-we-collect" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">2.1 Information You Provide</h3>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Email address, name, and password when you create an account</li>
                <li><strong>Profile Information:</strong> Optional profile picture and display name</li>
                <li><strong>Task and Goal Data:</strong> Tasks, goals, routines, notes, and related productivity data you create</li>
                <li><strong>Communication Data:</strong> Information you provide when contacting us for support</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">2.2 Information Collected Automatically</h3>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li><strong>Usage Data:</strong> Information about how you interact with our service, including features used and actions taken</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring website addresses</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">2.3 Information from Third-Party Integrations</h3>
              <ul className="text-zinc-300 space-y-2">
                <li><strong>GitHub Integration:</strong> When you connect your GitHub account, we collect your GitHub username, repository information, commit activity, and pull request data to track your development work</li>
                <li><strong>Google Calendar Integration:</strong> When you connect Google Calendar, we access your calendar events, event attendance status, and event details to help track your time and commitments</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section id="how-we-use" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-zinc-300 mb-4">We use the information we collect to:</p>
              <ul className="text-zinc-300 space-y-2">
                <li>• Provide, maintain, and improve our services</li>
                <li>• Create and manage your account</li>
                <li>• Track your productivity metrics and generate insights</li>
                <li>• Integrate with third-party services you authorize (GitHub, Google Calendar)</li>
                <li>• Send you service-related notifications and updates</li>
                <li>• Respond to your comments, questions, and support requests</li>
                <li>• Monitor and analyze usage patterns and trends</li>
                <li>• Detect, prevent, and address technical issues and security threats</li>
                <li>• Comply with legal obligations and enforce our Terms of Use</li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section id="data-storage" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Storage and Security</h2>
              <p className="text-zinc-300 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li>• Encryption of data in transit using SSL/TLS</li>
                <li>• Encryption of sensitive data at rest</li>
                <li>• Regular security assessments and updates</li>
                <li>• Access controls and authentication mechanisms</li>
                <li>• Secure data centers with physical security measures</li>
              </ul>
              <p className="text-zinc-300 mb-4">
                Your data is stored using Supabase, a secure database platform that complies with industry-standard security practices. We retain your data for as long as your account is active or as needed to provide you services.
              </p>
              <p className="text-zinc-300">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            {/* Third-Party Services */}
            <section id="third-party" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
              <p className="text-zinc-300 mb-4">
                GrindProof uses the following third-party services to provide and improve our application:
              </p>
              
              <h3 className="text-xl font-semibold text-white mb-3">5.1 Supabase</h3>
              <p className="text-zinc-300 mb-4">
                We use Supabase for database hosting, authentication, and data storage. Supabase has its own privacy policy governing the use of your information. Learn more at <a href="https://supabase.com/privacy" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a>
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">5.2 GitHub</h3>
              <p className="text-zinc-300 mb-4">
                When you connect your GitHub account, we access your GitHub data through their API. GitHub's privacy policy applies to data collected through their service. Learn more at <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">5.3 Google Calendar</h3>
              <p className="text-zinc-300 mb-4">
                When you connect Google Calendar, we access your calendar data through Google's API. Google's privacy policy applies to data collected through their service. Learn more at <a href="https://policies.google.com/privacy" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>
              </p>

              <p className="text-zinc-300">
                We do not sell, trade, or rent your personal information to third parties. We may share aggregated, anonymized data that does not identify you personally for analytics and service improvement purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section id="your-rights" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
              <p className="text-zinc-300 mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              
              <h3 className="text-xl font-semibold text-white mb-3">6.1 General Rights</h3>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">6.2 GDPR Rights (European Users)</h3>
              <p className="text-zinc-300 mb-4">
                If you are located in the European Economic Area, you have additional rights under the General Data Protection Regulation (GDPR), including the right to object to processing, restrict processing, and lodge a complaint with a supervisory authority.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">6.3 CCPA Rights (California Users)</h3>
              <p className="text-zinc-300 mb-4">
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, to delete personal information, and to opt-out of the sale of personal information (note: we do not sell your information).
              </p>

              <p className="text-zinc-300">
                To exercise any of these rights, please contact us at <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a>. We will respond to your request within 30 days.
              </p>
            </section>

            {/* Cookies and Local Storage */}
            <section id="cookies" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">7. Cookies and Local Storage</h2>
              <p className="text-zinc-300 mb-4">
                GrindProof uses cookies and browser local storage to enhance your experience:
              </p>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
                <li><strong>Session Storage:</strong> Stores your authentication state and preferences</li>
                <li><strong>Local Storage:</strong> Caches application data for offline functionality and improved performance</li>
                <li><strong>Service Worker:</strong> Enables Progressive Web App (PWA) features including offline access</li>
              </ul>
              <p className="text-zinc-300">
                Most web browsers automatically accept cookies, but you can modify your browser settings to decline cookies. However, this may prevent you from taking full advantage of our service.
              </p>
            </section>

            {/* Children's Privacy */}
            <section id="children" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">8. Children's Privacy</h2>
              <p className="text-zinc-300 mb-4">
                GrindProof is intended for users who are at least 13 years old. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a>.
              </p>
              <p className="text-zinc-300">
                If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to delete that information from our servers.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section id="changes" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
              <p className="text-zinc-300 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by:
              </p>
              <ul className="text-zinc-300 mb-4 space-y-2">
                <li>• Posting the new Privacy Policy on this page</li>
                <li>• Updating the "Last Updated" date at the top of this policy</li>
                <li>• Sending you an email notification (for significant changes)</li>
              </ul>
              <p className="text-zinc-300">
                Your continued use of GrindProof after any changes indicates your acceptance of the updated Privacy Policy. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            {/* Contact Us */}
            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
              <p className="text-zinc-300 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <p className="text-zinc-300 mb-2"><strong>Email:</strong> <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a></p>
                <p className="text-zinc-300"><strong>Service:</strong> GrindProof</p>
              </div>
              <p className="text-zinc-300 mt-4">
                We will respond to your inquiry as promptly as possible, typically within 48 hours.
              </p>
            </section>

            {/* Additional Information */}
            <section className="mt-12 pt-8 border-t border-zinc-700">
              <p className="text-zinc-400 text-sm">
                This Privacy Policy is provided in accordance with applicable privacy laws and regulations, including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and Children's Online Privacy Protection Act (COPPA).
              </p>
            </section>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/terms"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Terms of Use →
          </Link>
        </div>
      </div>
    </div>
  );
}

