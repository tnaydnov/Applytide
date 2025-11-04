import Head from 'next/head';
import { useState } from 'react';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function Privacy() {
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  return (
    <>
      <Head>
        <title>Privacy Policy - Applytide</title>
        <meta name="description" content="Applytide's privacy policy explains how we collect, use, and protect your information." />
        <meta name="robots" content="noindex" />
      </Head>

      <PageContainer size="md">
        <PageHeader title="Privacy Policy" />
        <div className="prose prose-invert max-w-none">
          <p className="text-slate-300">Last Updated: {currentDate}</p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Controller & Contact Information</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">The data controller responsible for your personal information is:</p>
            <ul className="list-none space-y-2">
              <li><strong>Service:</strong> Applytide (Individual Developer)</li>
              <li><strong>Email:</strong> <a href="mailto:privacy@applytide.com" className="text-blue-400 hover:text-blue-300">privacy@applytide.com</a></li>
              <li><strong>Contact:</strong> <a href="mailto:contact@applytide.com" className="text-blue-400 hover:text-blue-300">contact@applytide.com</a></li>
              <li><strong>Security Contact:</strong> <a href="mailto:security@applytide.com" className="text-blue-400 hover:text-blue-300">security@applytide.com</a></li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Legal Bases for Processing</h2>
          <p className="text-slate-300 mb-4">We process your personal data under the following legal bases:</p>
          <ul className="list-disc pl-6 space-y-2 text-slate-300">
            <li><strong>Contract:</strong> To provide the Service and core features you've requested</li>
            <li><strong>Consent:</strong> For optional analytics, cookies, marketing, and Google integrations</li>
            <li><strong>Legitimate interests:</strong> For service safety, fraud prevention, and improvement</li>
            <li><strong>Legal obligations:</strong> When required by applicable law</li>
          </ul>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Information We Collect</h2>
          <p className="text-slate-300 mb-4">When you use our Chrome extension and website, we may collect the following types of information:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-300">
            <li><strong>Authentication Information</strong>: When you create an account or log in, we collect your email address, password (securely hashed), and optional profile information.</li>
            <li><strong>Job Application Data</strong>: Information about job listings you save, including job titles, descriptions, requirements, company information, and application status.</li>
            <li><strong>Extension Data</strong>: We only process content on pages where you actively use the extension to extract job details. We do not collect your general browsing history.</li>
            <li><strong>Website Content</strong>: Job descriptions and related content from job boards that you choose to extract using our extension.</li>
            <li><strong>Documents</strong>: Resumes, cover letters, and other documents you upload to your account.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Google Integrations & User Data</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">Applytide integrates with Google services in two ways, and we strictly comply with Google's Limited Use requirements and the Google API Services User Data Policy.</p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Google Sign-In (OAuth)</h3>
            <p className="mb-2">When you sign in with Google, we access:</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li><strong>Email address</strong>: Used to identify your account and send notifications</li>
              <li><strong>Profile information</strong>: Your name and profile picture for account personalization</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Google Calendar Integration (Optional)</h3>
            <p className="mb-2">When you connect Google Calendar, we access:</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li><strong>Calendar events scope</strong>: Limited to reading your existing events and creating new reminder events</li>
              <li><strong>Event creation</strong>: We only create events when you explicitly request reminders</li>
              <li><strong>Event reading</strong>: We read events only to display them in your dashboard and avoid duplicates</li>
            </ul>

            <p className="mb-4"><strong>Our Google API Data Commitments:</strong></p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>We access <strong>only the minimum data required</strong> for the specific features you request</li>
              <li>We <strong>do not sell, rent, or share</strong> your Google user data with any third parties</li>
              <li>We <strong>do not use Google data for advertising</strong> or marketing purposes</li>
              <li>Human access to your Google data is <strong>restricted to debugging, security incidents, or legal requirements</strong></li>
              <li>You can <strong>revoke access anytime</strong> via your Google Account → Security → Third-party apps</li>
              <li>Your Google data is <strong>encrypted in transit and at rest</strong></li>
            </ul>

            <p className="mb-4">You may disconnect Google services from your Applytide account at any time through your account settings or by revoking access directly in your Google Account.</p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Chrome Extension Data Collection</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">Our Chrome extension helps you extract job information from job boards. Here's exactly what it does:</p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">What We Access</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Active tab content</strong>: Only when you click the extension button to extract job data</li>
              <li><strong>Job listing information</strong>: Company names, job titles, descriptions, and requirements visible on the page</li>
              <li><strong>Page URL</strong>: To identify the job listing source and provide application links</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">What We DON'T Access</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Browsing history</strong>: We do not track or monitor your general web browsing</li>
              <li><strong>Personal data from other websites</strong>: We only process job-related content you specifically extract</li>
              <li><strong>Password or form data</strong>: The extension never accesses login credentials or personal form inputs</li>
              <li><strong>Background tracking</strong>: The extension only operates when you actively use it</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Extension Permissions Explained</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>activeTab</strong>: Required to read job content from the current tab when you click the extension</li>
              <li><strong>scripting</strong>: Allows the extension to extract job details from supported job boards</li>
              <li><strong>tabs</strong>: Detects the current URL to determine if automatic extraction is supported</li>
              <li><strong>alarms</strong>: Maintains your login session by periodically refreshing authentication tokens</li>
              <li><strong>windows</strong>: Opens authentication popup windows for Google sign-in</li>
              <li><strong>Host permissions</strong>: Grants access to job board websites only when you activate the extension</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Data Handling</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>All extracted job data is sent directly to your Applytide account via secure HTTPS connection</li>
              <li>No job data is stored locally in the extension beyond the current session</li>
              <li>Your authentication token is encrypted and stored securely in browser storage</li>
              <li>The extension does not communicate with any third-party services</li>
              <li>No analytics or tracking is performed by the extension itself</li>
            </ul>

            <p className="mb-4">All extracted job data is stored securely according to this privacy policy and can be deleted at any time from your account settings.</p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-slate-300 mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-300">
            <li>Provide our job application tracking and management services</li>
            <li>Extract job details from websites you visit when you activate our extension</li>
            <li>Save job listings to your Applytide account</li>
            <li>Help you track and manage your job applications</li>
            <li>Improve and optimize our services</li>
            <li>Communicate with you about your account and our services</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Information Sharing & Processors</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with the following categories of processors:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Hosting providers:</strong> For secure data storage and service delivery</li>
              <li><strong>Email delivery services:</strong> For transactional emails and notifications</li>
              <li><strong>Analytics providers:</strong> For service improvement (with your consent)</li>
              <li><strong>Error logging services:</strong> For debugging and service reliability</li>
            </ul>
            <p className="mt-4">All processors operate under strict confidentiality agreements. For a current list of subprocessors, please contact us.</p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">International Transfers</h2>
          <p className="text-slate-300 mb-4">
            Where applicable, we use the EU Standard Contractual Clauses (and UK Addendum) for international transfers of personal data. We conduct transfer impact assessments to ensure appropriate safeguards are in place.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Security</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">We implement comprehensive security measures including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit and at rest</li>
              <li>Least-privilege access controls</li>
              <li>Regular security audits and access reviews</li>
              <li>Audit logging of system access</li>
            </ul>
            <p className="mt-4">For security vulnerabilities, please contact <a href="mailto:security@applytide.com" className="text-blue-400 hover:text-blue-300">security@applytide.com</a> with coordinated disclosure.</p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Retention</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">We retain your data for the following periods:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> For the life of the account + 30 days after deletion (backup lag)</li>
              <li><strong>Documents (resumes/cover letters):</strong> Until you delete them or 24 months of inactivity</li>
              <li><strong>Server logs:</strong> 30-90 days for security and debugging</li>
              <li><strong>Calendar tokens:</strong> Until you disconnect integration or delete account</li>
              <li><strong>Application tracking data:</strong> Until account deletion or upon your request</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Automated Decision-Making & AI</h2>
          <p className="text-slate-300 mb-4">
            We may use AI for features like resume optimization and job matching. These outputs are suggestions only and do not produce legal or hiring decisions. You can opt out of AI features at any time. We do not train AI models on your resumes or cover letters unless you explicitly opt in.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Do Not Sell/Share (California Privacy Rights)</h2>
          <p className="text-slate-300 mb-4">
            We do not sell personal information. We do not "share" personal information for cross-context behavioral advertising as defined under the California Privacy Rights Act.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Your Rights & How to Exercise Them</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access to your personal data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your data</li>
              <li>Restriction of processing</li>
              <li>Data portability</li>
              <li>Objection to processing</li>
            </ul>
            <p className="mt-4">
              <strong>To exercise your rights:</strong> Contact us at <a href="mailto:privacy@applytide.com" className="text-blue-400 hover:text-blue-300">privacy@applytide.com</a>
              or use the in-app account settings. We will respond within 30-45 days.
            </p>
            <p className="mt-4">
              You have the right to lodge a complaint with a supervisory authority in the EU/UK if you believe your data protection rights have been violated.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Children's Privacy</h2>
          <p className="text-slate-300 mb-4">Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13.</p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-slate-300 mb-4">We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on our website or through other communication channels.</p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Contact Us</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">If you have any questions or concerns about our privacy policy or data practices, please contact us:</p>
            <ul className="list-none space-y-2">
              <li><strong>Privacy:</strong> <a href="mailto:privacy@applytide.com" className="text-blue-400 hover:text-blue-300">privacy@applytide.com</a></li>
              <li><strong>Security:</strong> <a href="mailto:security@applytide.com" className="text-blue-400 hover:text-blue-300">security@applytide.com</a></li>
              <li><strong>General:</strong> <a href="mailto:contact@applytide.com" className="text-blue-400 hover:text-blue-300">contact@applytide.com</a></li>
            </ul>
            <p className="mt-4 text-sm text-slate-400">Note: As an individual developer project, all privacy inquiries should be sent to the email addresses above.</p>
          </div>

          <p className="text-slate-400 italic mt-10">This privacy policy was last updated on {currentDate}.</p>
        </div>
      </PageContainer>
    </>
  );
}
