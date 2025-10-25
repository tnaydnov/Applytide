import Head from 'next/head';
import { useState } from 'react';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function ContactPage() {
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  return (
    <>
      <Head>
        <title>Contact Us - Applytide</title>
        <meta name="description" content="Get in touch with the Applytide team" />
      </Head>

      <PageContainer size="md">
        <PageHeader 
          title="Contact Us" 
          subtitle="We're here to help"
        />

        <div className="prose prose-invert max-w-none">
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* General Inquiries */}
            <div className="glass-card p-6 border border-white/10 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white m-0">General Inquiries</h3>
              </div>
              <p className="text-slate-300 mb-3">
                Questions about our service, features, or how to use Applytide?
              </p>
              <a 
                href="mailto:contact@applytide.com" 
                className="text-blue-400 hover:text-blue-300 font-medium no-underline"
              >
                contact@applytide.com
              </a>
              <p className="text-sm text-slate-400 mt-2 mb-0">Response time: 24-48 hours</p>
            </div>

            {/* Privacy & Data Protection */}
            <div className="glass-card p-6 border border-white/10 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white m-0">Privacy & Data</h3>
              </div>
              <p className="text-slate-300 mb-3">
                GDPR requests, data export, account deletion, or privacy concerns.
              </p>
              <a 
                href="mailto:privacy@applytide.com" 
                className="text-purple-400 hover:text-purple-300 font-medium no-underline"
              >
                privacy@applytide.com
              </a>
              <p className="text-sm text-slate-400 mt-2 mb-0">Response time: 30-45 days (legal requirement)</p>
            </div>

            {/* Security Issues */}
            <div className="glass-card p-6 border border-white/10 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white m-0">Security Issues</h3>
              </div>
              <p className="text-slate-300 mb-3">
                Found a security vulnerability? We appreciate responsible disclosure.
              </p>
              <a 
                href="mailto:security@applytide.com" 
                className="text-red-400 hover:text-red-300 font-medium no-underline"
              >
                security@applytide.com
              </a>
              <p className="text-sm text-slate-400 mt-2 mb-0">Response time: 72 hours</p>
            </div>

            {/* Support */}
            <div className="glass-card p-6 border border-white/10 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white m-0">Technical Support</h3>
              </div>
              <p className="text-slate-300 mb-3">
                Having trouble with the app? Need help with a feature?
              </p>
              <a 
                href="mailto:contact@applytide.com" 
                className="text-green-400 hover:text-green-300 font-medium no-underline"
              >
                contact@applytide.com
              </a>
              <p className="text-sm text-slate-400 mt-2 mb-0">Response time: 24-48 hours</p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="glass-card p-8 border border-white/10 rounded-lg">
            <h2 className="text-2xl font-bold text-white mt-0 mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How do I delete my account?</h3>
                <p className="text-slate-300 mb-0">
                  Go to Profile → Security tab → Click "Delete Account" in the Danger Zone section. 
                  Your account and all data will be permanently deleted within 30 days.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How do I export my data?</h3>
                <p className="text-slate-300 mb-0">
                  Go to Profile → Security tab → Click "Download Data" in the Privacy & Data section. 
                  You'll receive a JSON file with all your information.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Is my data secure?</h3>
                <p className="text-slate-300 mb-0">
                  Yes! We use industry-standard encryption (TLS 1.3), comprehensive security headers, 
                  and follow OWASP best practices. See our <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a> for details.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Do you sell my data?</h3>
                <p className="text-slate-300 mb-0">
                  Absolutely not. We never sell, rent, or share your personal information with third parties. 
                  We don't use your data for advertising or marketing purposes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What browsers do you support?</h3>
                <p className="text-slate-300 mb-0">
                  Our Chrome extension works with Chrome, Brave, Edge, and other Chromium-based browsers. 
                  The web app works on all modern browsers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How do I report a bug?</h3>
                <p className="text-slate-300 mb-0">
                  Use the feedback button (bottom-right corner) or email us at contact@applytide.com 
                  with details about the issue and steps to reproduce it.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Additional Resources</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <a 
                href="/privacy" 
                className="glass-card p-4 border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors no-underline"
              >
                <h4 className="text-white font-semibold mb-2">Privacy Policy</h4>
                <p className="text-slate-400 text-sm mb-0">How we collect, use, and protect your data</p>
              </a>
              
              <a 
                href="/terms" 
                className="glass-card p-4 border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors no-underline"
              >
                <h4 className="text-white font-semibold mb-2">Terms of Service</h4>
                <p className="text-slate-400 text-sm mb-0">Rules and guidelines for using Applytide</p>
              </a>
              
              <a 
                href="/cookie-policy" 
                className="glass-card p-4 border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors no-underline"
              >
                <h4 className="text-white font-semibold mb-2">Cookie Policy</h4>
                <p className="text-slate-400 text-sm mb-0">Information about cookies we use</p>
              </a>
            </div>
          </div>

        </div>
      </PageContainer>
    </>
  );
}
