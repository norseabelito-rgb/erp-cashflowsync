"use client";

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 6, 2025";
  const companyName = "Aquaterra Mobili SRL";
  const appName = "Aquaterra ERP";
  const contactEmail = "privacy@aquaterramobili.ro";
  const websiteUrl = "https://erp.aquaterramobili.ro";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last Updated: {lastUpdated}</p>

          <div className="prose prose-gray max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                {companyName} (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates {appName} (the &quot;Service&quot;), 
                an enterprise resource planning platform that integrates with third-party advertising and 
                e-commerce platforms including Meta (Facebook/Instagram), TikTok, Google, Shopify, and others.
              </p>
              <p className="text-gray-700 mb-4">
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you use our Service. This policy applies to all users of our Service, including 
                business users, employees, and any individuals whose data may be processed through our platform.
              </p>
              <p className="text-gray-700">
                <strong>By using our Service, you consent to the data practices described in this Privacy Policy.</strong> 
                If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
              </p>
            </section>

            {/* Data Controller Information */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data Controller Information</h2>
              <p className="text-gray-700 mb-4">
                For the purposes of the General Data Protection Regulation (GDPR), the California Consumer 
                Privacy Act (CCPA), and other applicable data protection laws, the data controller is:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  <strong>{companyName}</strong><br />
                  Email: {contactEmail}<br />
                  Website: {websiteUrl}
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">3.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password, company name, phone number, and business address when you create an account.</li>
                <li><strong>Business Data:</strong> Order information, product data, customer data, inventory records, and financial information you input into the Service.</li>
                <li><strong>Communication Data:</strong> Information you provide when contacting our support team or communicating through the Service.</li>
                <li><strong>Payment Information:</strong> Billing details and payment method information for subscription services.</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">3.2 Information Collected Through Third-Party Integrations</h3>
              <p className="text-gray-700 mb-4">
                When you connect third-party services to our platform, we may collect:
              </p>
              
              <h4 className="font-medium text-gray-800 mb-2">Meta (Facebook/Instagram) Integration:</h4>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Ad account information and identifiers</li>
                <li>Campaign, ad set, and ad performance data</li>
                <li>Advertising insights and analytics</li>
                <li>Page and business account information</li>
                <li>Access tokens for API authentication</li>
              </ul>

              <h4 className="font-medium text-gray-800 mb-2">TikTok Integration:</h4>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Advertiser account information</li>
                <li>Campaign performance metrics</li>
                <li>Ad creative information</li>
                <li>Authentication credentials and tokens</li>
              </ul>

              <h4 className="font-medium text-gray-800 mb-2">Google Integration:</h4>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Google Ads account data</li>
                <li>Campaign and advertising performance data</li>
                <li>Google Drive files (when authorized)</li>
                <li>OAuth authentication tokens</li>
              </ul>

              <h4 className="font-medium text-gray-800 mb-2">E-commerce Platform Integration (Shopify, Trendyol, etc.):</h4>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Store and shop information</li>
                <li>Product catalog data</li>
                <li>Order and transaction information</li>
                <li>Customer information (names, addresses, contact details)</li>
                <li>Inventory and fulfillment data</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">3.3 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Log Data:</strong> IP address, browser type, operating system, referring URLs, pages viewed, and access times.</li>
                <li><strong>Device Information:</strong> Device type, unique device identifiers, and mobile network information.</li>
                <li><strong>Usage Data:</strong> Features used, actions taken, and interaction patterns within the Service.</li>
                <li><strong>Cookies and Similar Technologies:</strong> Session cookies, authentication tokens, and preference data.</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect for the following purposes:</p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">4.1 Service Provision and Operation</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>To provide, maintain, and improve our Service</li>
                <li>To process transactions and manage your account</li>
                <li>To synchronize data between connected platforms</li>
                <li>To generate reports and analytics</li>
                <li>To manage advertising campaigns across platforms</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.2 Communication</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>To send service-related notifications and updates</li>
                <li>To respond to your inquiries and support requests</li>
                <li>To send promotional communications (with your consent)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.3 Security and Compliance</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>To protect against unauthorized access and fraud</li>
                <li>To comply with legal obligations</li>
                <li>To enforce our terms and policies</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.4 Analytics and Improvement</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>To analyze usage patterns and trends</li>
                <li>To improve and optimize the Service</li>
                <li>To develop new features and functionality</li>
              </ul>
            </section>

            {/* Legal Basis for Processing (GDPR) */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-700 mb-4">
                For users in the European Economic Area (EEA), United Kingdom, and other jurisdictions 
                where GDPR applies, we process your personal data based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Consent:</strong> Where you have given explicit consent for specific processing activities, such as connecting third-party advertising accounts.</li>
                <li><strong>Contract Performance:</strong> Where processing is necessary to fulfill our contractual obligations to you.</li>
                <li><strong>Legal Obligation:</strong> Where processing is required to comply with applicable laws and regulations.</li>
                <li><strong>Legitimate Interests:</strong> Where processing is necessary for our legitimate business interests, provided these do not override your fundamental rights.</li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">6.1 Third-Party Platform Providers</h3>
              <p className="text-gray-700 mb-4">
                When you connect your accounts, we share necessary data with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li><strong>Meta Platforms, Inc.</strong> - For Facebook and Instagram advertising integration</li>
                <li><strong>TikTok/ByteDance</strong> - For TikTok advertising integration</li>
                <li><strong>Google LLC</strong> - For Google Ads and Google Drive integration</li>
                <li><strong>Shopify Inc.</strong> - For e-commerce platform integration</li>
                <li><strong>Other connected platforms</strong> - As authorized by you</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We engage trusted third-party service providers to perform functions on our behalf, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Cloud hosting and infrastructure providers</li>
                <li>Payment processors</li>
                <li>Analytics providers</li>
                <li>Customer support tools</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information when required by law, regulation, legal process, 
                or governmental request, or when we believe disclosure is necessary to protect 
                our rights, your safety, or the safety of others.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.4 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may 
                be transferred as part of the transaction. We will notify you of any such change.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-gray-700">
                  <strong>We do not sell your personal information.</strong> We do not share your 
                  personal data with third parties for their direct marketing purposes without your explicit consent.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal data only for as long as necessary to fulfill the purposes 
                for which it was collected, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period thereafter for legal and business purposes.</li>
                <li><strong>Transaction Data:</strong> Retained for the period required by applicable tax and accounting laws (typically 7-10 years).</li>
                <li><strong>Advertising Data:</strong> Retained for up to 25 months for analytics purposes, unless you request earlier deletion.</li>
                <li><strong>Log Data:</strong> Typically retained for 12 months for security and troubleshooting purposes.</li>
              </ul>
              <p className="text-gray-700">
                When data is no longer needed, we securely delete or anonymize it in accordance 
                with our data retention policies and applicable legal requirements.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">8.1 Rights Under GDPR (EEA/UK Users)</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Right of Access:</strong> Request a copy of your personal data.</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data.</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;).</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of processing.</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent.</li>
                <li><strong>Right to Lodge a Complaint:</strong> File a complaint with a supervisory authority.</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">8.2 Rights Under CCPA (California Residents)</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Right to Know:</strong> Request disclosure of personal information collected, used, and shared.</li>
                <li><strong>Right to Delete:</strong> Request deletion of personal information.</li>
                <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal information (note: we do not sell personal information).</li>
                <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights.</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">8.3 Exercising Your Rights</h3>
              <p className="text-gray-700 mb-4">
                To exercise any of these rights, please contact us at <strong>{contactEmail}</strong>. 
                We will respond to your request within 30 days (or as required by applicable law). 
                We may need to verify your identity before processing your request.
              </p>
            </section>

            {/* International Data Transfers */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your 
                country of residence. These countries may have different data protection laws.
              </p>
              <p className="text-gray-700 mb-4">
                When we transfer personal data outside the EEA, we ensure appropriate safeguards 
                are in place, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Transfers to countries with adequate data protection (as recognized by the European Commission)</li>
                <li>Other legally approved transfer mechanisms</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your 
                personal data, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Encryption:</strong> Data encrypted in transit (TLS/SSL) and at rest</li>
                <li><strong>Access Controls:</strong> Role-based access control and authentication</li>
                <li><strong>Secure Infrastructure:</strong> Cloud hosting with security certifications</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                <li><strong>Employee Training:</strong> Data protection and security awareness programs</li>
                <li><strong>Incident Response:</strong> Procedures for detecting and responding to security incidents</li>
              </ul>
              <p className="text-gray-700">
                While we strive to protect your personal data, no method of transmission or 
                storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            {/* Cookies and Tracking Technologies */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Maintain your session and authentication status</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze usage patterns and improve the Service</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Types of Cookies We Use:</strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li><strong>Essential Cookies:</strong> Required for the Service to function properly</li>
                <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how the Service is used</li>
              </ul>
              <p className="text-gray-700">
                You can control cookies through your browser settings. Note that disabling 
                certain cookies may affect the functionality of the Service.
              </p>
            </section>

            {/* Third-Party Links and Services */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Third-Party Links and Services</h2>
              <p className="text-gray-700 mb-4">
                Our Service may contain links to third-party websites and services. We are not 
                responsible for the privacy practices of these third parties. We encourage you 
                to review their privacy policies before providing any personal information.
              </p>
              <p className="text-gray-700">
                For information about how our third-party partners handle your data, please refer to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                <li><a href="https://www.facebook.com/privacy/policy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Meta Privacy Policy</a></li>
                <li><a href="https://www.tiktok.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">TikTok Privacy Policy</a></li>
                <li><a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                <li><a href="https://www.shopify.com/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Shopify Privacy Policy</a></li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Children&apos;s Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our Service is not intended for use by children under the age of 16 (or the 
                applicable age of digital consent in your jurisdiction). We do not knowingly 
                collect personal information from children. If we become aware that we have 
                collected personal data from a child without parental consent, we will take 
                steps to delete that information.
              </p>
            </section>

            {/* Changes to This Privacy Policy */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our 
                practices, technologies, legal requirements, or other factors. When we make 
                material changes, we will:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Update the &quot;Last Updated&quot; date at the top of this policy</li>
                <li>Notify you via email or through the Service</li>
                <li>Obtain your consent where required by law</li>
              </ul>
              <p className="text-gray-700">
                We encourage you to review this Privacy Policy periodically to stay informed 
                about how we are protecting your information.
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy 
                or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>{companyName}</strong><br />
                  Data Protection Contact<br />
                  Email: <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">{contactEmail}</a><br />
                  Website: <a href={websiteUrl} className="text-blue-600 hover:underline">{websiteUrl}</a>
                </p>
              </div>
              <p className="text-gray-700 mt-4">
                We will respond to your inquiry within a reasonable timeframe, and no later 
                than required by applicable law.
              </p>
            </section>

            {/* Platform-Specific Disclosures */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Platform-Specific Disclosures</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">16.1 Meta Platform Integration</h3>
              <p className="text-gray-700 mb-4">
                When you connect your Meta (Facebook/Instagram) advertising accounts to our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>We access your advertising account data through Meta&apos;s Marketing API</li>
                <li>We use this data solely to provide advertising management and analytics features</li>
                <li>We comply with Meta&apos;s Platform Terms and Developer Policies</li>
                <li>You can disconnect your Meta account at any time through our Service settings</li>
                <li>Upon disconnection or account deletion, we will delete associated Meta data</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">16.2 TikTok Integration</h3>
              <p className="text-gray-700 mb-4">
                When you connect your TikTok advertising account to our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>We access your advertising data through TikTok&apos;s Marketing API</li>
                <li>We comply with TikTok&apos;s Developer Terms of Service</li>
                <li>Data is used solely for campaign management and reporting purposes</li>
                <li>You can revoke access at any time through our Service or TikTok settings</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">16.3 Google Integration</h3>
              <p className="text-gray-700 mb-4">
                When you connect Google services to our platform:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>We comply with Google API Services User Data Policy</li>
                <li>We limit data use to providing and improving our Service features</li>
                <li>We do not use Google user data for advertising purposes</li>
                <li>You can revoke access through Google Account settings at any time</li>
              </ul>
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
