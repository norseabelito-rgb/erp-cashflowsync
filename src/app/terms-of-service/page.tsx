"use client";

export default function TermsOfServicePage() {
  const lastUpdated = "January 6, 2025";
  const effectiveDate = "January 6, 2025";
  const companyName = "Aquaterra Mobili SRL";
  const appName = "Aquaterra ERP";
  const contactEmail = "legal@aquaterramobili.ro";
  const supportEmail = "support@aquaterramobili.ro";
  const websiteUrl = "https://erp.aquaterramobili.ro";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-2">Last Updated: {lastUpdated}</p>
          <p className="text-gray-500 mb-8">Effective Date: {effectiveDate}</p>

          <div className="prose prose-gray max-w-none">
            {/* Agreement to Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you 
                (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and {companyName} (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) 
                governing your access to and use of {appName} (the &quot;Service&quot;), including any associated 
                websites, applications, APIs, and related services.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>BY ACCESSING OR USING THE SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS.</strong> If 
                you do not agree to all of these Terms, you are prohibited from using the Service and 
                must discontinue use immediately.
              </p>
              <p className="text-gray-700">
                If you are accepting these Terms on behalf of a company, organization, or other legal 
                entity, you represent and warrant that you have the authority to bind such entity to 
                these Terms, and &quot;you&quot; and &quot;your&quot; shall refer to such entity.
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                {appName} is an enterprise resource planning (ERP) platform that provides:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Order management and processing</li>
                <li>Inventory and product management</li>
                <li>Multi-channel e-commerce integration (Shopify, Trendyol, etc.)</li>
                <li>Advertising account management (Meta, TikTok, Google)</li>
                <li>Invoicing and financial management</li>
                <li>Shipping and logistics integration</li>
                <li>Reporting and analytics</li>
              </ul>
              <p className="text-gray-700">
                The Service integrates with various third-party platforms and services. Your use of 
                those third-party services is subject to their respective terms and conditions.
              </p>
            </section>

            {/* Account Registration */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration and Security</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">3.1 Account Creation</h3>
              <p className="text-gray-700 mb-4">
                To use the Service, you must create an account. When registering, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                <li>Have the legal authority to enter into these Terms</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">3.2 Account Security</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Immediately notifying us of any unauthorized access or security breach</li>
                <li>Ensuring that your account is used only by authorized personnel</li>
              </ul>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate accounts that we reasonably believe 
                have been compromised or are being used in violation of these Terms.
              </p>
            </section>

            {/* Acceptable Use */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">4.1 Permitted Use</h3>
              <p className="text-gray-700 mb-4">
                You may use the Service only for lawful business purposes and in accordance with 
                these Terms. You agree to use the Service in compliance with all applicable laws, 
                regulations, and third-party agreements.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws, regulations, or third-party rights</li>
                <li>Transmit any malware, viruses, or harmful code</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Copy, modify, or create derivative works of the Service</li>
                <li>Use automated means to access the Service without authorization</li>
                <li>Resell, sublicense, or redistribute the Service without permission</li>
                <li>Use the Service to send spam or unsolicited communications</li>
                <li>Collect personal information without proper consent</li>
                <li>Engage in any activity that could harm our reputation or business</li>
                <li>Use the Service to discriminate against any individual or group</li>
                <li>Process data in violation of applicable privacy laws</li>
              </ul>
            </section>

            {/* Third-Party Integrations */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Integrations</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">5.1 Platform Integrations</h3>
              <p className="text-gray-700 mb-4">
                The Service integrates with third-party platforms including but not limited to 
                Meta (Facebook/Instagram), TikTok, Google, Shopify, and various courier services. 
                When you connect these platforms:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>You authorize us to access your account data on those platforms</li>
                <li>You agree to comply with the terms of service of each connected platform</li>
                <li>You are responsible for maintaining valid credentials and permissions</li>
                <li>You understand that platform availability is subject to third-party control</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">5.2 Meta (Facebook/Instagram) Integration</h3>
              <p className="text-gray-700 mb-4">
                By connecting your Meta advertising accounts, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Comply with <a href="https://www.facebook.com/policies/ads/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Meta&apos;s Advertising Policies</a></li>
                <li>Comply with <a href="https://developers.facebook.com/terms/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Meta Platform Terms</a></li>
                <li>Use advertising data only for authorized purposes</li>
                <li>Not engage in prohibited advertising practices</li>
                <li>Respect user privacy and data protection requirements</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">5.3 TikTok Integration</h3>
              <p className="text-gray-700 mb-4">
                By connecting your TikTok advertising accounts, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Comply with <a href="https://www.tiktok.com/legal/tik-tok-developer-terms-of-service" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">TikTok Developer Terms of Service</a></li>
                <li>Comply with TikTok&apos;s advertising policies and guidelines</li>
                <li>Use the integration only for authorized business purposes</li>
                <li>Maintain proper security measures for access credentials</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">5.4 Google Integration</h3>
              <p className="text-gray-700 mb-4">
                By connecting Google services, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Comply with <a href="https://developers.google.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google APIs Terms of Service</a></li>
                <li>Comply with <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a></li>
                <li>Use Google user data only as permitted by these policies</li>
                <li>Not misuse or abuse Google services or APIs</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">5.5 E-commerce Platform Integration</h3>
              <p className="text-gray-700 mb-4">
                When connecting e-commerce platforms (Shopify, Trendyol, etc.), you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Comply with each platform&apos;s terms of service and policies</li>
                <li>Ensure accurate product and inventory information</li>
                <li>Handle customer data in accordance with privacy laws</li>
                <li>Fulfill orders in compliance with applicable regulations</li>
              </ul>

              <div className="bg-status-warning/10 border-l-4 border-status-warning p-4 mb-4">
                <p className="text-gray-700">
                  <strong>Important:</strong> We are not responsible for the availability, accuracy, 
                  or functionality of third-party services. Changes to third-party APIs or policies 
                  may affect Service functionality without prior notice.
                </p>
              </div>
            </section>

            {/* User Content and Data */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. User Content and Data</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">6.1 Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of all data, content, and information you submit to the 
                Service (&quot;User Content&quot;). By using the Service, you grant us a limited, 
                non-exclusive license to use, process, and store your User Content solely to 
                provide and improve the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.2 Your Responsibilities</h3>
              <p className="text-gray-700 mb-4">You are solely responsible for:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>The accuracy and legality of your User Content</li>
                <li>Obtaining necessary consents for processing customer data</li>
                <li>Complying with applicable data protection laws (GDPR, CCPA, etc.)</li>
                <li>Maintaining appropriate backups of your data</li>
                <li>Ensuring your use does not infringe third-party rights</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.3 Data Processing</h3>
              <p className="text-gray-700 mb-4">
                Where we process personal data on your behalf, we act as a data processor. 
                Our data processing activities are governed by our{" "}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property Rights</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">7.1 Our Intellectual Property</h3>
              <p className="text-gray-700 mb-4">
                The Service, including its original content, features, functionality, software, 
                design, logos, and trademarks, is owned by {companyName} and is protected by 
                international copyright, trademark, patent, trade secret, and other intellectual 
                property laws.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">7.2 Limited License</h3>
              <p className="text-gray-700 mb-4">
                Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, 
                revocable license to access and use the Service for your internal business purposes. 
                This license does not include the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Modify, copy, or create derivative works</li>
                <li>Sell, resell, or commercially exploit the Service</li>
                <li>Remove any proprietary notices or labels</li>
                <li>Use any data mining or similar data gathering methods</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">7.3 Feedback</h3>
              <p className="text-gray-700">
                Any feedback, suggestions, or ideas you provide about the Service may be used by 
                us without any obligation to compensate you or maintain confidentiality.
              </p>
            </section>

            {/* Payment Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Payment Terms</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">8.1 Fees and Billing</h3>
              <p className="text-gray-700 mb-4">
                Certain features of the Service may require payment. By subscribing to paid features:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>You agree to pay all applicable fees as described in our pricing</li>
                <li>Fees are billed in advance on a recurring basis (monthly or annually)</li>
                <li>All fees are non-refundable unless otherwise stated</li>
                <li>We may change fees upon 30 days&apos; notice</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">8.2 Taxes</h3>
              <p className="text-gray-700 mb-4">
                All fees are exclusive of applicable taxes (VAT, sales tax, etc.), which you are 
                responsible for paying. We will add applicable taxes to your invoices where required.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">8.3 Payment Failure</h3>
              <p className="text-gray-700">
                If payment fails, we may suspend or terminate your access to the Service. We will 
                attempt to notify you before taking such action.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 mb-4">
                  <strong>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES 
                  OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED 
                  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND 
                  NON-INFRINGEMENT.</strong>
                </p>
                <p className="text-gray-700">
                  We do not warrant that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>The results obtained from the Service will be accurate or reliable</li>
                  <li>Any errors in the Service will be corrected</li>
                  <li>The Service will meet your specific requirements</li>
                </ul>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 mb-4">
                  <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL {companyName.toUpperCase()}, 
                  ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR 
                  ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
                  WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE 
                  LOSSES, RESULTING FROM:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                  <li>Your access to or use of or inability to access or use the Service</li>
                  <li>Any conduct or content of any third party on the Service</li>
                  <li>Any content obtained from the Service</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                  <li>Errors, mistakes, or inaccuracies in the Service</li>
                  <li>Third-party platform changes, outages, or API modifications</li>
                </ul>
                <p className="text-gray-700">
                  <strong>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE 
                  (12) MONTHS PRECEDING THE CLAIM.</strong>
                </p>
              </div>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to defend, indemnify, and hold harmless {companyName}, its affiliates, 
                licensors, and service providers, and its and their respective officers, directors, 
                employees, contractors, agents, licensors, suppliers, successors, and assigns from 
                and against any claims, liabilities, damages, judgments, awards, losses, costs, 
                expenses, or fees (including reasonable attorneys&apos; fees) arising out of or relating to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Your violation of these Terms</li>
                <li>Your use of the Service</li>
                <li>Your User Content</li>
                <li>Your violation of any third-party rights</li>
                <li>Your violation of applicable laws or regulations</li>
              </ul>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">12.1 Termination by You</h3>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time by contacting us at {supportEmail}. 
                Upon termination, your right to use the Service will immediately cease.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">12.2 Termination by Us</h3>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your access immediately, without prior notice or 
                liability, for any reason, including if you breach these Terms. We may also 
                terminate or suspend the Service at any time with reasonable notice.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">12.3 Effect of Termination</h3>
              <p className="text-gray-700 mb-4">
                Upon termination:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Your license to use the Service will terminate</li>
                <li>You must cease all use of the Service</li>
                <li>We may delete your account and User Content (subject to legal retention requirements)</li>
                <li>Provisions that by their nature should survive will survive termination</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">12.4 Data Export</h3>
              <p className="text-gray-700">
                You may request an export of your data before termination. We will provide your 
                data in a commonly used format within a reasonable timeframe.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law and Dispute Resolution</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">13.1 Governing Law</h3>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of 
                Romania, without regard to its conflict of law provisions. The application of 
                the United Nations Convention on Contracts for the International Sale of Goods 
                is expressly excluded.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">13.2 Dispute Resolution</h3>
              <p className="text-gray-700 mb-4">
                Any dispute arising out of or relating to these Terms shall be resolved as follows:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Informal Resolution:</strong> We will first attempt to resolve any dispute informally by contacting each other.</li>
                <li><strong>Mediation:</strong> If informal resolution fails, the parties agree to attempt mediation before proceeding to litigation.</li>
                <li><strong>Jurisdiction:</strong> Any legal action shall be brought exclusively in the competent courts of Romania.</li>
              </ul>
            </section>

            {/* Changes to Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. When we make changes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>We will update the &quot;Last Updated&quot; date</li>
                <li>We will notify you via email or through the Service</li>
                <li>Material changes will become effective 30 days after notice</li>
                <li>Your continued use after changes constitutes acceptance</li>
              </ul>
              <p className="text-gray-700">
                If you do not agree to the modified Terms, you must stop using the Service and 
                terminate your account.
              </p>
            </section>

            {/* General Provisions */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. General Provisions</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">15.1 Entire Agreement</h3>
              <p className="text-gray-700 mb-4">
                These Terms, together with our Privacy Policy and any other agreements expressly 
                incorporated by reference, constitute the entire agreement between you and us 
                regarding the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">15.2 Severability</h3>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is held to be invalid or unenforceable, such 
                provision shall be modified to the minimum extent necessary, and the remaining 
                provisions shall continue in full force and effect.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">15.3 Waiver</h3>
              <p className="text-gray-700 mb-4">
                Our failure to enforce any right or provision of these Terms will not be 
                considered a waiver of those rights.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">15.4 Assignment</h3>
              <p className="text-gray-700 mb-4">
                You may not assign or transfer these Terms without our prior written consent. 
                We may assign our rights and obligations without restriction.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">15.5 Force Majeure</h3>
              <p className="text-gray-700 mb-4">
                Neither party shall be liable for any failure or delay in performance due to 
                circumstances beyond their reasonable control, including natural disasters, 
                war, terrorism, riots, embargoes, acts of civil or military authorities, 
                fire, floods, accidents, pandemic, strikes, or shortages of transportation, 
                facilities, fuel, energy, labor, or materials.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">15.6 No Third-Party Beneficiaries</h3>
              <p className="text-gray-700">
                These Terms do not create any third-party beneficiary rights.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>{companyName}</strong><br />
                  Legal Department<br />
                  Email: <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">{contactEmail}</a><br />
                  Support: <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:underline">{supportEmail}</a><br />
                  Website: <a href={websiteUrl} className="text-blue-600 hover:underline">{websiteUrl}</a>
                </p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">17. Acknowledgment</h2>
              <p className="text-gray-700">
                BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, 
                UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE 
                TERMS OF SERVICE, YOU ARE NOT AUTHORIZED TO USE THE SERVICE.
              </p>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
