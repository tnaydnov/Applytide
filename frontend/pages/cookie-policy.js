import Head from 'next/head';
import { useState } from 'react';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function CookiePolicy() {
    const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }));

    return (
        <>
            <Head>
                <title>Cookie Policy - Applytide</title>
                <meta name="description" content="Applytide's cookie policy explains how we use cookies and similar technologies." />
                <meta name="robots" content="noindex" />
            </Head>

            <PageContainer size="md">
                <PageHeader title="Cookie Policy" />
                <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300">Last updated: {currentDate}</p>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. What are Cookies?</h2>
                    <p className="text-slate-300 mb-4">
                        Cookies are small text files stored on your device when you visit a website. They are used to remember your preferences,
                        help you navigate between pages efficiently, and make your experience more enjoyable.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. How We Use Cookies</h2>
                    <p className="text-slate-300 mb-4">Applytide uses the following types of cookies and similar technologies:</p>

                    <h3 className="text-xl font-semibold text-white mt-6 mb-3">Strictly Necessary Cookies</h3>
                    <p className="text-slate-300 mb-4">These cookies are essential for the website to function and cannot be disabled:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-6">
                        <li><strong>access_token:</strong> Authenticates your login session (expires after 15 minutes)</li>
                        <li><strong>refresh_token:</strong> Allows automatic session renewal (expires after 7 days, or 30 days if "Remember Me" is checked)</li>
                        <li><strong>client_id:</strong> Identifies your browser for session management</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-white mt-6 mb-3">Functional Cookies</h3>
                    <p className="text-slate-300 mb-4">These enhance your experience by remembering your preferences:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-6">
                        <li><strong>recentSearches:</strong> Stored in your browser's local storage to show recent job searches in the quick search widget</li>
                        <li><strong>User preferences:</strong> Remember your dashboard settings and display preferences</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-white mt-6 mb-3">Security Features</h3>
                    <p className="text-slate-300 mb-4">All authentication cookies use security best practices:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-6">
                        <li><strong>HttpOnly:</strong> Cookies cannot be accessed by JavaScript, preventing XSS attacks</li>
                        <li><strong>Secure:</strong> Cookies are only sent over HTTPS in production</li>
                        <li><strong>SameSite:</strong> Set to "lax" to prevent cross-site request forgery</li>
                        <li><strong>Path restrictions:</strong> Refresh tokens are limited to /auth paths for additional security</li>
                    </ul>

                    <p className="text-slate-300 mb-4">
                        <strong>What we DON'T use:</strong> Applytide does not use analytics cookies, marketing cookies, or third-party tracking cookies.
                        We do not share cookie data with advertisers or external analytics services.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Your Choices</h2>
                    <p className="text-slate-300 mb-4">
                        <strong>Authentication Cookies:</strong> These are required for the application to function. If you disable them,
                        you will not be able to log in or use authenticated features of Applytide.
                    </p>
                    <p className="text-slate-300 mb-4">
                        <strong>Browser Controls:</strong> You can manage cookies through your browser settings:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
                        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                        <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                        <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                        <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
                    </ul>
                    <p className="text-slate-300 mb-4">
                        <strong>Local Storage:</strong> Recent job searches are stored locally in your browser and can be cleared
                        by clearing your browser's local storage or using your browser's developer tools.
                    </p>
                    <p className="text-slate-300 mb-4">
                        <strong>Session Management:</strong> You can view and revoke active sessions from your
                        <a href="/sessions" className="text-blue-400 hover:text-blue-300"> Account Sessions</a> page.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Cookie Retention</h2>
                    <p className="text-slate-300 mb-4">Our cookies have the following lifespans:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-300 mb-4">
                        <li><strong>Access Token:</strong> 15 minutes (automatically refreshed while you're active)</li>
                        <li><strong>Refresh Token:</strong> 7 days (or 30 days if "Remember Me" was selected during login)</li>
                        <li><strong>Recent Searches:</strong> Stored locally until you clear your browser data</li>
                        <li><strong>Session Data:</strong> Cleared when you log out or the session expires</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Changes to This Policy</h2>
                    <p className="text-slate-300 mb-4">
                        We may update this Cookie Policy from time to time to reflect changes in our practices or for legal compliance.
                        We will post the updated policy on this page with a new "last updated" date.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Contact Us</h2>
                    <p className="text-slate-300 mb-4">
                        If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                    </p>
                    <ul className="list-none space-y-2 text-slate-300">
                        <li><strong>Email:</strong> <a href="mailto:privacy@applytide.com" className="text-blue-400 hover:text-blue-300">privacy@applytide.com</a></li>
                        <li><strong>General Contact:</strong> <a href="mailto:contact@applytide.com" className="text-blue-400 hover:text-blue-300">contact@applytide.com</a></li>
                    </ul>
                </div>
            </PageContainer>
        </>
    );
}