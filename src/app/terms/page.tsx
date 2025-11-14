import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | GrindProof",
  description: "GrindProof Terms of Use - Read our terms and conditions for using the service.",
};

export default function TermsOfUsePage() {
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
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Use</h1>
          <p className="text-zinc-400">Last Updated: November 14, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <div className="prose prose-invert prose-zinc max-w-none">
            {/* Table of Contents */}
            <nav className="mb-8 p-4 bg-zinc-900/50 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-sm">
                <li><a href="#acceptance" className="text-blue-400 hover:text-blue-300">1. Acceptance of Terms</a></li>
                <li><a href="#description" className="text-blue-400 hover:text-blue-300">2. Description of Service</a></li>
                <li><a href="#eligibility" className="text-blue-400 hover:text-blue-300">3. Eligibility</a></li>
                <li><a href="#account" className="text-blue-400 hover:text-blue-300">4. Account Registration and Security</a></li>
                <li><a href="#acceptable-use" className="text-blue-400 hover:text-blue-300">5. Acceptable Use Policy</a></li>
                <li><a href="#user-content" className="text-blue-400 hover:text-blue-300">6. User Content</a></li>
                <li><a href="#intellectual-property" className="text-blue-400 hover:text-blue-300">7. Intellectual Property Rights</a></li>
                <li><a href="#third-party" className="text-blue-400 hover:text-blue-300">8. Third-Party Integrations</a></li>
                <li><a href="#termination" className="text-blue-400 hover:text-blue-300">9. Termination</a></li>
                <li><a href="#disclaimers" className="text-blue-400 hover:text-blue-300">10. Disclaimers</a></li>
                <li><a href="#limitation" className="text-blue-400 hover:text-blue-300">11. Limitation of Liability</a></li>
                <li><a href="#indemnification" className="text-blue-400 hover:text-blue-300">12. Indemnification</a></li>
                <li><a href="#modifications" className="text-blue-400 hover:text-blue-300">13. Modifications to Service</a></li>
                <li><a href="#governing-law" className="text-blue-400 hover:text-blue-300">14. Governing Law</a></li>
                <li><a href="#dispute-resolution" className="text-blue-400 hover:text-blue-300">15. Dispute Resolution</a></li>
                <li><a href="#general" className="text-blue-400 hover:text-blue-300">16. General Provisions</a></li>
                <li><a href="#contact" className="text-blue-400 hover:text-blue-300">17. Contact Information</a></li>
              </ul>
            </nav>

            {/* Acceptance of Terms */}
            <section id="acceptance" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-zinc-300 mb-4">
                Welcome to GrindProof. By accessing or using our productivity tracking application ("Service"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-zinc-300 mb-4">
                These Terms constitute a legally binding agreement between you and GrindProof ("Company," "we," "us," or "our"). By creating an account, accessing our website, or using our Service in any way, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
              </p>
              <p className="text-zinc-300">
                We reserve the right to modify these Terms at any time. Your continued use of the Service after changes are posted constitutes your acceptance of the modified Terms.
              </p>
            </section>

            {/* Description of Service */}
            <section id="description" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <p className="text-zinc-300 mb-4">
                GrindProof is a productivity tracking and accountability platform that helps users:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Track daily tasks, goals, and routines</li>
                <li>• Integrate with GitHub to monitor development activity</li>
                <li>• Integrate with Google Calendar to track time and commitments</li>
                <li>• Generate productivity insights and reports</li>
                <li>• Access the service as a Progressive Web App (PWA)</li>
              </ul>
              <p className="text-zinc-300">
                The Service is provided on an "as is" and "as available" basis. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.
              </p>
            </section>

            {/* Eligibility */}
            <section id="eligibility" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">3. Eligibility</h2>
              <p className="text-zinc-300 mb-4">
                To use GrindProof, you must:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Be at least 13 years of age</li>
                <li>• Have the legal capacity to enter into binding contracts</li>
                <li>• Not be prohibited from using the Service under applicable laws</li>
                <li>• Provide accurate and complete registration information</li>
              </ul>
              <p className="text-zinc-300">
                If you are under 18 years of age, you represent that you have obtained parental or guardian consent to use the Service. We reserve the right to request proof of age or parental consent at any time.
              </p>
            </section>

            {/* Account Registration and Security */}
            <section id="account" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">4. Account Registration and Security</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">4.1 Account Creation</h3>
              <p className="text-zinc-300 mb-4">
                To access certain features of the Service, you must create an account. You agree to:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Provide accurate, current, and complete information during registration</li>
                <li>• Maintain and promptly update your account information</li>
                <li>• Maintain the security of your password and account</li>
                <li>• Accept responsibility for all activities that occur under your account</li>
                <li>• Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">4.2 Account Security</h3>
              <p className="text-zinc-300 mb-4">
                You are solely responsible for maintaining the confidentiality of your account credentials. We are not liable for any loss or damage arising from your failure to protect your account information. You agree to:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Use a strong, unique password</li>
                <li>• Not share your account credentials with others</li>
                <li>• Not use another person's account without permission</li>
                <li>• Immediately notify us of any security breaches</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">4.3 Account Restrictions</h3>
              <p className="text-zinc-300">
                You may only create one account per person. Creating multiple accounts or using automated means to create accounts is prohibited and may result in immediate termination of all accounts.
              </p>
            </section>

            {/* Acceptable Use Policy */}
            <section id="acceptable-use" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">5. Acceptable Use Policy</h2>
              <p className="text-zinc-300 mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Violate any applicable laws, regulations, or third-party rights</li>
                <li>• Use the Service for any illegal, harmful, or fraudulent purpose</li>
                <li>• Attempt to gain unauthorized access to any portion of the Service</li>
                <li>• Interfere with or disrupt the Service or servers</li>
                <li>• Use any automated system to access the Service without our permission</li>
                <li>• Reverse engineer, decompile, or disassemble any aspect of the Service</li>
                <li>• Upload or transmit viruses, malware, or malicious code</li>
                <li>• Harass, abuse, or harm other users</li>
                <li>• Impersonate any person or entity</li>
                <li>• Collect or harvest user information without consent</li>
                <li>• Use the Service to spam, phish, or engage in similar activities</li>
                <li>• Circumvent any security features or access controls</li>
              </ul>
              <p className="text-zinc-300">
                Violation of this Acceptable Use Policy may result in immediate termination of your account and legal action if applicable.
              </p>
            </section>

            {/* User Content */}
            <section id="user-content" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">6. User Content</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">6.1 Your Content</h3>
              <p className="text-zinc-300 mb-4">
                "User Content" means any data, text, information, or materials you submit, upload, or create while using the Service, including tasks, goals, notes, and integration data.
              </p>
              <p className="text-zinc-300 mb-4">
                You retain all ownership rights to your User Content. By submitting User Content to the Service, you grant us a limited, worldwide, non-exclusive, royalty-free license to use, store, reproduce, and display your User Content solely for the purpose of operating and improving the Service.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">6.2 Content Responsibility</h3>
              <p className="text-zinc-300 mb-4">
                You are solely responsible for your User Content and the consequences of posting or publishing it. You represent and warrant that:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• You own or have the necessary rights to your User Content</li>
                <li>• Your User Content does not violate any third-party rights</li>
                <li>• Your User Content does not violate any applicable laws</li>
                <li>• Your User Content does not contain viruses or malicious code</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">6.3 Content Removal</h3>
              <p className="text-zinc-300">
                We reserve the right (but not the obligation) to remove or refuse to post any User Content for any reason, including Content that violates these Terms. We may also access, preserve, and disclose User Content if required by law or if we believe such action is necessary to comply with legal obligations.
              </p>
            </section>

            {/* Intellectual Property Rights */}
            <section id="intellectual-property" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">7.1 Service Ownership</h3>
              <p className="text-zinc-300 mb-4">
                The Service, including its design, code, graphics, user interface, and all content (excluding User Content), is owned by GrindProof and protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">7.2 Limited License</h3>
              <p className="text-zinc-300 mb-4">
                Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal, non-commercial use. This license does not include:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Any right to resell or commercial use of the Service</li>
                <li>• Any right to copy, modify, or create derivative works</li>
                <li>• Any right to download or extract portions of the Service (except as expressly permitted)</li>
                <li>• Any right to use data mining, robots, or similar tools</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">7.3 Trademarks</h3>
              <p className="text-zinc-300">
                "GrindProof" and related logos are trademarks of GrindProof. You may not use these trademarks without our prior written permission.
              </p>
            </section>

            {/* Third-Party Integrations */}
            <section id="third-party" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">8. Third-Party Integrations</h2>
              <p className="text-zinc-300 mb-4">
                GrindProof integrates with third-party services including GitHub and Google Calendar. Your use of these integrations is subject to:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• The terms and policies of the respective third-party service</li>
                <li>• Your explicit authorization to access your data on those platforms</li>
                <li>• Our right to discontinue integrations at any time</li>
              </ul>
              <p className="text-zinc-300 mb-4">
                We are not responsible for the availability, performance, or content of third-party services. Any disputes regarding third-party services should be resolved directly with those service providers.
              </p>
              <p className="text-zinc-300">
                You may disconnect third-party integrations at any time through your account settings. Disconnecting an integration will remove our access to that service but may not immediately delete previously synced data.
              </p>
            </section>

            {/* Termination */}
            <section id="termination" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">9. Termination</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">9.1 Termination by You</h3>
              <p className="text-zinc-300 mb-4">
                You may terminate your account at any time by contacting us at <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a> or through your account settings. Upon termination, your right to access the Service will immediately cease.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">9.2 Termination by Us</h3>
              <p className="text-zinc-300 mb-4">
                We reserve the right to suspend or terminate your account and access to the Service at any time, with or without cause, with or without notice, for any reason including:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Violation of these Terms</li>
                <li>• Fraudulent, abusive, or illegal activity</li>
                <li>• Extended periods of inactivity</li>
                <li>• Requests by law enforcement or government agencies</li>
                <li>• Technical or security issues</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">9.3 Effect of Termination</h3>
              <p className="text-zinc-300">
                Upon termination, all licenses granted to you will immediately terminate, and you must cease all use of the Service. We may, but are not obligated to, delete your User Content. Sections of these Terms that by their nature should survive termination will survive, including but not limited to: ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            {/* Disclaimers */}
            <section id="disclaimers" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">10. Disclaimers</h2>
              <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg mb-4">
                <p className="text-zinc-300 font-semibold mb-2">IMPORTANT LEGAL NOTICE</p>
                <p className="text-zinc-300 text-sm">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
                </p>
              </div>
              <p className="text-zinc-300 mb-4">
                TO THE FULLEST EXTENT PERMITTED BY LAW, GRINDPROOF DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• IMPLIED WARRANTIES OF MERCHANTABILITY</li>
                <li>• IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>• WARRANTIES OF NON-INFRINGEMENT</li>
                <li>• WARRANTIES REGARDING AVAILABILITY, RELIABILITY, OR ACCURACY</li>
                <li>• WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE</li>
                <li>• WARRANTIES THAT DEFECTS WILL BE CORRECTED</li>
                <li>• WARRANTIES REGARDING THIRD-PARTY INTEGRATIONS</li>
              </ul>
              <p className="text-zinc-300 mb-4">
                We do not guarantee that:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• The Service will meet your specific requirements</li>
                <li>• The Service will be available at all times</li>
                <li>• Data transmitted through the Service will be completely secure</li>
                <li>• The results obtained from using the Service will be accurate or reliable</li>
                <li>• Any errors in the Service will be corrected</li>
              </ul>
              <p className="text-zinc-300">
                You acknowledge that your use of the Service is at your sole risk. Any material downloaded or obtained through the Service is done at your own discretion and risk, and you are solely responsible for any damage to your device or loss of data.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section id="limitation" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">11. Limitation of Liability</h2>
              <div className="bg-red-900/20 border border-red-700/50 p-4 rounded-lg mb-4">
                <p className="text-zinc-300 font-semibold mb-2">LIMITATION OF LIABILITY</p>
                <p className="text-zinc-300 text-sm">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRINDPROOF SHALL NOT BE LIABLE FOR ANY DAMAGES.
                </p>
              </div>
              <p className="text-zinc-300 mb-4">
                IN NO EVENT SHALL GRINDPROOF, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                <li>• LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
                <li>• BUSINESS INTERRUPTION</li>
                <li>• LOSS OF GOODWILL OR REPUTATION</li>
                <li>• DAMAGES ARISING FROM YOUR USE OR INABILITY TO USE THE SERVICE</li>
                <li>• DAMAGES ARISING FROM THIRD-PARTY INTEGRATIONS</li>
                <li>• DAMAGES ARISING FROM UNAUTHORIZED ACCESS TO YOUR DATA</li>
                <li>• DAMAGES ARISING FROM ERRORS, MISTAKES, OR INACCURACIES</li>
              </ul>
              <p className="text-zinc-300 mb-4">
                THIS LIMITATION APPLIES WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="text-zinc-300">
                IN JURISDICTIONS THAT DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW. IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY, OR $100, WHICHEVER IS GREATER.
              </p>
            </section>

            {/* Indemnification */}
            <section id="indemnification" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">12. Indemnification</h2>
              <p className="text-zinc-300 mb-4">
                You agree to defend, indemnify, and hold harmless GrindProof, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including attorney's fees) arising from:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Your use of or access to the Service</li>
                <li>• Your violation of these Terms</li>
                <li>• Your violation of any third-party rights</li>
                <li>• Your User Content</li>
                <li>• Your violation of any applicable laws or regulations</li>
                <li>• Any unauthorized use of your account</li>
              </ul>
              <p className="text-zinc-300">
                We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, in which case you agree to cooperate with our defense of such claim.
              </p>
            </section>

            {/* Modifications to Service */}
            <section id="modifications" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">13. Modifications to Service</h2>
              <p className="text-zinc-300 mb-4">
                We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice, for any reason. This includes:
              </p>
              <ul className="text-zinc-300 space-y-2 mb-4">
                <li>• Adding or removing features</li>
                <li>• Changing pricing or fee structures (if applicable)</li>
                <li>• Imposing limits on certain features</li>
                <li>• Discontinuing third-party integrations</li>
              </ul>
              <p className="text-zinc-300">
                We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service. We will make reasonable efforts to notify users of significant changes.
              </p>
            </section>

            {/* Governing Law */}
            <section id="governing-law" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">14. Governing Law</h2>
              <p className="text-zinc-300 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-zinc-300">
                For users located in the European Union, nothing in these Terms affects your rights as a consumer under applicable EU law.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section id="dispute-resolution" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">15. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">15.1 Informal Resolution</h3>
              <p className="text-zinc-300 mb-4">
                Before filing a formal dispute, you agree to first contact us at <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a> to attempt to resolve the issue informally. We will make good faith efforts to resolve disputes amicably.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">15.2 Binding Arbitration</h3>
              <p className="text-zinc-300 mb-4">
                If informal resolution fails, any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with applicable arbitration rules, rather than in court.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">15.3 Class Action Waiver</h3>
              <p className="text-zinc-300">
                TO THE EXTENT PERMITTED BY LAW, YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
              </p>
            </section>

            {/* General Provisions */}
            <section id="general" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">16. General Provisions</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">16.1 Entire Agreement</h3>
              <p className="text-zinc-300 mb-4">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and GrindProof regarding the Service and supersede all prior agreements and understandings.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">16.2 Severability</h3>
              <p className="text-zinc-300 mb-4">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">16.3 Waiver</h3>
              <p className="text-zinc-300 mb-4">
                Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">16.4 Assignment</h3>
              <p className="text-zinc-300 mb-4">
                You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may freely assign these Terms without restriction.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">16.5 No Agency</h3>
              <p className="text-zinc-300">
                No agency, partnership, joint venture, or employment relationship is created as a result of these Terms, and you do not have any authority to bind us in any respect.
              </p>
            </section>

            {/* Contact Information */}
            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">17. Contact Information</h2>
              <p className="text-zinc-300 mb-4">
                If you have any questions about these Terms of Use, please contact us:
              </p>
              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <p className="text-zinc-300 mb-2"><strong>Email:</strong> <a href="mailto:support@grindproof.com" className="text-blue-400 hover:text-blue-300">support@grindproof.com</a></p>
                <p className="text-zinc-300"><strong>Service:</strong> GrindProof</p>
              </div>
              <p className="text-zinc-300 mt-4">
                We will respond to your inquiry within a reasonable timeframe, typically within 48 hours.
              </p>
            </section>

            {/* Acknowledgment */}
            <section className="mt-12 pt-8 border-t border-zinc-700">
              <div className="bg-blue-900/20 border border-blue-700/50 p-4 rounded-lg">
                <p className="text-zinc-300 font-semibold mb-2">Acknowledgment</p>
                <p className="text-zinc-300 text-sm">
                  BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF USE AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE THE SERVICE.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <Link
            href="/privacy"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Privacy Policy
          </Link>
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Back to Home →
          </Link>
        </div>
      </div>
    </div>
  );
}

