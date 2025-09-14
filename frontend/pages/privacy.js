import Head from 'next/head';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Privacy() {
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  return (
    <Layout>
      <Head>
        <title>Privacy Policy - ApplyTide</title>
        <meta name="description" content="ApplyTide's privacy policy explains how we collect, use, and protect your information." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 pb-2 border-b">Privacy Policy</h1>
        <p className="text-gray-600 mb-6">Last Updated: {currentDate}</p>
        
        <p className="mb-6">Welcome to ApplyTide. We are committed to protecting your privacy and providing you with a safe experience when using our services.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
        <p className="mb-4">When you use our Chrome extension and website, we may collect the following types of information:</p>
        
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Authentication Information</strong>: When you create an account or log in, we collect your email address, password (securely hashed), and optional profile information.</li>
          <li><strong>Job Application Data</strong>: Information about job listings you save, including job titles, descriptions, requirements, company information, and application status.</li>
          <li><strong>Web Browsing Data</strong>: Information about job pages you visit when you use our extension to extract job details.</li>
          <li><strong>Website Content</strong>: Job descriptions and related content from job boards that you choose to extract using our extension.</li>
          <li><strong>Documents</strong>: Resumes, cover letters, and other documents you upload to your account.</li>
        </ul>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">We use the information we collect to:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Provide our job application tracking and management services</li>
          <li>Extract job details from websites you visit when you activate our extension</li>
          <li>Save job listings to your ApplyTide account</li>
          <li>Help you track and manage your job applications</li>
          <li>Improve and optimize our services</li>
          <li>Communicate with you about your account and our services</li>
        </ul>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">3. Information Sharing</h2>
        <p className="mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties. Your data is only used to provide and improve our services. We may share information in the following limited circumstances:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>With service providers who help us operate our platform, under strict confidentiality agreements</li>
          <li>If required by law or to respond to legal processes</li>
          <li>To protect our rights, privacy, safety or property</li>
        </ul>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
        <p className="mb-6">We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure, so we cannot guarantee absolute security.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">5. Your Rights</h2>
        <p className="mb-4">Depending on your location, you may have certain rights regarding your personal data, including:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Access to your personal data</li>
          <li>Correction of inaccurate data</li>
          <li>Deletion of your data</li>
          <li>Restriction of processing</li>
          <li>Data portability</li>
          <li>Objection to processing</li>
        </ul>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">6. Data Retention</h2>
        <p className="mb-6">We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy. You can request deletion of your account and associated data at any time.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">7. Children's Privacy</h2>
        <p className="mb-6">Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">8. Changes to This Privacy Policy</h2>
        <p className="mb-6">We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on our website or through other communication channels.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">9. Contact Us</h2>
        <p className="mb-4">If you have any questions or concerns about our privacy policy or data practices, please contact us at:</p>
        <p className="mb-6">Email: privacy@applytide.com</p>
        
          <p className="text-gray-600 italic mt-10">This privacy policy was last updated on {currentDate}.</p>
        </div>
      </Layout>
    )};