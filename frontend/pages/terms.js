import { useState } from 'react';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function TermsOfService() {
    const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }));

    return (
        <PageContainer size="md">
            <PageHeader
                title="Terms of Service"
                subtitle={`Last updated: ${currentDate}`}
            />

            <div className="prose prose-invert max-w-none">

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Definitions</h2>
                <div className="text-slate-300 mb-4">
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>"Applytide"</strong> or <strong>"we"</strong> refers to the company providing the Service</li>
                        <li><strong>"Service"</strong> refers to our job application tracking platform, website, and Chrome extension</li>
                        <li><strong>"User Content"</strong> refers to resumes, cover letters, notes, and other content you upload</li>
                        <li><strong>"Extension"</strong> refers to our Chrome browser extension for job extraction</li>
                        <li><strong>"Third-party Sites"</strong> refers to job boards and career websites you visit</li>
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Eligibility & Account Authority</h2>
                <p className="text-slate-300 mb-4">
                    You must be at least 13 years old to use our Service. If you are creating an account on behalf of a company or organization, you represent that you have the authority to bind that entity to these terms.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Chrome Extension & Third-Party Sites</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">Our Chrome Extension is designed to help you extract and organize job information from various job boards. By using the Extension, you acknowledge and agree that:</p>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Extension Functionality</h3>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                        <li>The Extension only operates when you actively use it to extract job details from web pages</li>
                        <li>It processes publicly available job listing content visible on the current page</li>
                        <li>You are responsible for ensuring you have the right to access and extract information from the websites you visit</li>
                        <li>The Extension does not modify third-party websites or interfere with their normal operation</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Third-Party Compliance</h3>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                        <li>We are not affiliated with any third-party job boards or websites</li>
                        <li>You must comply with the terms of service of any third-party sites you visit</li>
                        <li>We are not responsible for the content, accuracy, or availability of third-party sites</li>
                        <li>Any disputes with third-party sites are solely between you and those sites</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Extension Updates & Compatibility</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>We may update the Extension to improve functionality or maintain compatibility</li>
                        <li>You agree to install reasonable updates when available</li>
                        <li>We do not guarantee compatibility with all websites or browser versions</li>
                        <li>Some job boards may implement measures that affect the Extension's functionality</li>
                    </ul>
                </div>
                <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. User Accounts</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">When creating an account, you agree to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Provide accurate and complete information</li>
                        <li>Keep your login credentials secure</li>
                        <li>Accept responsibility for all activities under your account</li>
                        <li>Notify us immediately of any unauthorized use</li>
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Google Services Integration</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">Applytide offers optional integration with Google services. By connecting your Google account, you acknowledge and agree that:</p>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Google Sign-In</h3>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                        <li>You authorize us to access your basic Google profile information (name, email, profile picture)</li>
                        <li>You can disconnect Google Sign-In at any time through your account settings</li>
                        <li>Your Google account credentials are handled by Google's secure authentication system</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Google Calendar Integration</h3>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                        <li>You grant us permission to read existing calendar events and create new reminder events on your behalf</li>
                        <li>Calendar access is used solely to provide reminder and scheduling features you request</li>
                        <li>You can revoke calendar access through your Google Account security settings at any time</li>
                        <li>We comply with Google's API Services User Data Policy and Limited Use requirements</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">Google Services Disclaimer</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Applytide is not affiliated with or endorsed by Google LLC</li>
                        <li>Google services are subject to Google's own terms of service and privacy policies</li>
                        <li>We are not responsible for changes to Google's APIs or services that may affect functionality</li>
                        <li>You acknowledge that Google may independently suspend or terminate their services</li>
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. User Content & License</h2>
                <p className="text-slate-300 mb-4">
                    You retain ownership of content you upload to Applytide. You grant us a non-exclusive, revocable, worldwide license to host, store, process, and display your content solely to provide and improve the Services you use. We do not claim any ownership rights in your content.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Intellectual Property & Copyright</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">
                        Applytide respects intellectual property rights. If you believe content on our service infringes your copyright, please review our <a href="/copyright-policy" className="text-blue-400 hover:text-blue-300">Copyright (DMCA) Policy</a> for the proper procedure to report infringement.
                    </p>
                    <p className="mb-4">
                        <strong>Designated Copyright Agent:</strong> <a href="mailto:copyright@applytide.com" className="text-blue-400 hover:text-blue-300">copyright@applytide.com</a>
                    </p>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Acceptable Use</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">You agree not to use the Service to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Upload or share malicious software or harmful content</li>
                        <li>Violate any applicable laws or regulations</li>
                        <li>Infringe on intellectual property rights</li>
                        <li>Harass, abuse, or harm others</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Privacy & Cookies</h2>
                <p className="text-slate-300 mb-4">
                    Your privacy is important to us. Please review our <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a> and <a href="/cookie-policy" className="text-blue-400 hover:text-blue-300">Cookie Policy</a> to understand how we collect, use, and protect your information.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Premium Features & Billing</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">Premium subscriptions include:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Advanced analytics and insights</li>
                        <li>Unlimited application tracking</li>
                        <li>AI-powered resume optimization</li>
                        <li>Priority customer support</li>
                    </ul>
                    <div className="mt-4 space-y-2">
                        <p><strong>Billing:</strong> Premium subscriptions are billed in advance and automatically renew unless cancelled.</p>
                        <p><strong>Cancellation:</strong> You may cancel at any time through your account settings. Cancellation takes effect at the end of your current billing period.</p>
                        <p><strong>Refunds:</strong> Subscriptions are generally non-refundable except as required by law or our refund policy.</p>
                        <p><strong>Price Changes:</strong> We will notify you at least 30 days before any price increases.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. AI & Beta Features</h2>
                <p className="text-slate-300 mb-4">
                    For beta or AI features, outputs may be inaccurate and should not be relied upon for legal or hiring decisions. AI features are provided as suggestions only.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Service Availability & Changes</h2>
                <p className="text-slate-300 mb-4">
                    We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice for significant changes and offer data export tools before any service sunset.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">12. Indemnification</h2>
                <p className="text-slate-300 mb-4">
                    You agree to indemnify and hold us harmless from claims arising from your use of the Service, your content, or your violation of these terms or applicable law.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">13. Limitation of Liability</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">
                        Applytide is provided "as is" without warranties of any kind. Our total liability is limited to the greater of US$100 or the amounts you paid to Applytide for the Services in the 12 months before the event giving rise to liability.
                    </p>
                    <p className="mb-4">
                        We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service, except where prohibited by law.
                    </p>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">14. Export Controls & Sanctions</h2>
                <p className="text-slate-300 mb-4">
                    You represent that you are not located in a restricted country or on any government denied parties list, and you will comply with all applicable export control and sanctions laws.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">15. Termination</h2>
                <p className="text-slate-300 mb-4">
                    We may terminate or suspend your account at any time for violations of these terms. Upon termination,
                    your right to use the Service will cease immediately. You may terminate your account at any time through your account settings.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">16. Dispute Resolution & Arbitration</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">
                        Any disputes arising from these terms will be resolved through binding arbitration under the Federal Arbitration Act, except for small claims court matters under $10,000.
                    </p>
                    <p className="mb-4">
                        <strong>Class Action Waiver:</strong> You agree to resolve disputes individually and waive any right to participate in class action lawsuits.
                    </p>
                    <p className="mb-4">
                        <strong>Opt-out:</strong> You may opt out of arbitration by emailing <a href="mailto:legal@applytide.com" className="text-blue-400 hover:text-blue-300">legal@applytide.com</a> within 30 days of account creation.
                    </p>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">17. Changes to Terms</h2>
                <p className="text-slate-300 mb-4">
                    We reserve the right to modify these terms at any time. We will notify users of any significant changes via email or service notification. Your continued use of the Service constitutes acceptance of the modified terms.
                </p>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">18. Governing Law & Miscellaneous</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">These terms shall be governed by applicable laws. If any provision is found unenforceable, the remaining terms will continue in effect.</p>
                    <p className="mb-4">We may assign these terms; you may not assign them without our consent. These terms constitute the entire agreement between us.</p>
                </div>

                <h2 className="text-2xl font-bold text-white mt-8 mb-4">19. Contact Information</h2>
                <div className="text-slate-300 mb-4">
                    <p className="mb-4">If you have any questions about these Terms of Service, please contact us:</p>
                    <ul className="list-none space-y-2">
                        <li><strong>General:</strong> <a href="mailto:contact@applytide.com" className="text-blue-400 hover:text-blue-300">contact@applytide.com</a></li>
                        <li><strong>Legal:</strong> <a href="mailto:legal@applytide.com" className="text-blue-400 hover:text-blue-300">legal@applytide.com</a></li>
                        <li><strong>Support:</strong> <a href="mailto:support@applytide.com" className="text-blue-400 hover:text-blue-300">support@applytide.com</a></li>
                        <li><strong>Copyright:</strong> <a href="mailto:copyright@applytide.com" className="text-blue-400 hover:text-blue-300">copyright@applytide.com</a></li>
                    </ul>
                    <p className="mt-4 text-sm text-slate-400">Note: As an individual developer project, formal written notices can be sent to the email addresses above.</p>
                </div>

            </div>
        </PageContainer>
    );
}