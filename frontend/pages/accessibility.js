import Head from 'next/head';
import { useState } from 'react';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function AccessibilityStatement() {
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  return (
    <>
      <Head>
        <title>Accessibility Statement - Applytide</title>
        <meta name="description" content="Applytide's commitment to accessibility" />
      </Head>

      <PageContainer size="md">
        <PageHeader 
          title="Accessibility Statement" 
          subtitle="Our commitment to an inclusive experience"
        />

        <div className="prose prose-invert max-w-none">
          <p className="text-slate-300">Last updated: {currentDate}</p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Our Commitment</h2>
          <p className="text-slate-300 mb-4">
            Applytide is committed to ensuring digital accessibility for people with disabilities. We are continually 
            improving the user experience for everyone and applying the relevant accessibility standards.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Standards</h2>
          <p className="text-slate-300 mb-4">
            We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines 
            explain how to make web content more accessible for people with disabilities and more usable for everyone.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Accessibility Features</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">Our website includes the following accessibility features:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Keyboard Navigation:</strong> All interactive elements can be accessed via keyboard</li>
              <li><strong>Screen Reader Support:</strong> ARIA labels and semantic HTML for assistive technologies</li>
              <li><strong>Clear Focus Indicators:</strong> Visible indicators when navigating with keyboard</li>
              <li><strong>Readable Fonts:</strong> Clear, legible typography throughout the application</li>
              <li><strong>Responsive Design:</strong> Works on various screen sizes and devices</li>
              <li><strong>Alt Text:</strong> Descriptive alternative text for images</li>
              <li><strong>Color Contrast:</strong> Sufficient contrast ratios for text and interactive elements</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Known Limitations</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">We are aware of the following accessibility limitations and are working to address them:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Some complex interactive components may not be fully keyboard accessible</li>
              <li>PDF documents uploaded by users may not be accessible</li>
              <li>Some dynamic content updates may not be announced to screen readers</li>
              <li>Color contrast in some dashboard visualizations may not meet AA standards</li>
            </ul>
            <p className="mt-4">
              We are actively working to improve these areas in future updates.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Third-Party Content</h2>
          <p className="text-slate-300 mb-4">
            Our Chrome extension extracts content from third-party job boards. We cannot guarantee the accessibility 
            of content from these external sources, but we strive to present it in an accessible format within our application.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Assistive Technologies</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">Applytide is designed to be compatible with the following assistive technologies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Screen readers: NVDA, JAWS, VoiceOver</li>
              <li>Speech recognition software</li>
              <li>Keyboard navigation tools</li>
              <li>Browser zoom and text resizing</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Testing & Evaluation</h2>
          <p className="text-slate-300 mb-4">
            We regularly test our application using:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
            <li>Automated accessibility testing tools (Lighthouse, axe DevTools)</li>
            <li>Manual keyboard navigation testing</li>
            <li>Screen reader testing (NVDA, VoiceOver)</li>
            <li>User feedback from people with disabilities</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Feedback & Contact</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">
              We welcome your feedback on the accessibility of Applytide. If you encounter accessibility barriers, please let us know:
            </p>
            <ul className="list-none space-y-2">
              <li><strong>Email:</strong> <a href="mailto:contact@applytide.com" className="text-blue-400 hover:text-blue-300">contact@applytide.com</a></li>
              <li><strong>Subject Line:</strong> Please include "Accessibility" in your subject line</li>
              <li><strong>Response Time:</strong> We aim to respond within 5 business days</li>
            </ul>
            <p className="mt-4">
              Please provide the following information in your message:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>The page or feature you're having trouble with</li>
              <li>The assistive technology you're using (if applicable)</li>
              <li>A description of the problem</li>
              <li>Your suggestions for improvement (optional)</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Technical Specifications</h2>
          <p className="text-slate-300 mb-4">
            Applytide relies on the following technologies for accessibility:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
            <li>HTML5 semantic elements</li>
            <li>WAI-ARIA (Accessible Rich Internet Applications)</li>
            <li>CSS for visual presentation</li>
            <li>JavaScript for interactive functionality</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Continuous Improvement</h2>
          <p className="text-slate-300 mb-4">
            Accessibility is an ongoing effort. We are committed to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
            <li>Regularly auditing our application for accessibility issues</li>
            <li>Fixing identified problems in a timely manner</li>
            <li>Incorporating accessibility into our design and development process</li>
            <li>Providing accessibility training for our team</li>
            <li>Consulting with users with disabilities</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Legal Requirements</h2>
          <p className="text-slate-300 mb-4">
            While Applytide is not legally required to comply with accessibility standards in all jurisdictions, 
            we believe digital accessibility is a fundamental right and we strive to meet or exceed relevant 
            standards including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
            <li>Americans with Disabilities Act (ADA) - United States</li>
            <li>Section 508 of the Rehabilitation Act - United States</li>
            <li>European Accessibility Act - European Union</li>
            <li>Equality Act 2010 - United Kingdom</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Assessment History</h2>
          <div className="text-slate-300 mb-4">
            <p className="mb-4">
              <strong>Last Assessment:</strong> {currentDate}
            </p>
            <p className="mb-4">
              <strong>Assessment Method:</strong> Self-evaluation using automated tools and manual testing
            </p>
            <p className="mb-4">
              <strong>Current Conformance Level:</strong> Partially Conformant (working towards WCAG 2.1 Level AA)
            </p>
            <p>
              We plan to conduct a formal third-party accessibility audit in the future to ensure full compliance.
            </p>
          </div>

          <p className="text-slate-400 italic mt-10">
            This accessibility statement was created on {currentDate} and will be reviewed and updated regularly.
          </p>
        </div>
      </PageContainer>
    </>
  );
}
