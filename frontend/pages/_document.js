import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
        
        {/* App Icons */}
        <link rel="apple-touch-icon" href="/images/app-icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Meta Tags */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="Track every job application like a pro with Applytide - the smart job search organizer with AI insights." />
        
        {/* Open Graph */}
        <meta property="og:title" content="Applytide - Track Every Job Application Like a Pro" />
        <meta property="og:description" content="Never lose track of job applications again. Organize, track, and manage your entire job search pipeline with AI insights." />
        <meta property="og:image" content="/images/app-icon.svg" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Applytide - Smart Job Application Tracker" />
        <meta name="twitter:description" content="Track every job application like a pro with AI insights and pipeline management." />
        <meta name="twitter:image" content="/images/app-icon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
