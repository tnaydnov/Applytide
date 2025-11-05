const React = require('react');
const { Html, Head, Body, Container, Section, Text, Link, Hr, Font } = require('@react-email/components');

// Color Palette - EXACT from Figma (Dark theme)
const colors = {
  bgDark: '#2C2B30',           // Main dark background
  bgDarkSecondary: '#4F4F51',  // Secondary dark (for cards)
  textLight: '#D6D6D6',        // Light gray text
  textWhite: '#FFFFFF',        // White text for emphasis
  coral: '#F58F7C',            // Primary coral
  coralLight: '#F2C4CE',       // Soft pink
};

// Main styles
const main = {
  backgroundColor: colors.bgDark,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '32px 20px',
};

const container = {
  maxWidth: '1200px',
  margin: '0 auto',
  backgroundColor: colors.bgDark,
  borderRadius: '24px',
  overflow: 'hidden',
};

const header = {
  padding: '48px',
  textAlign: 'center',
  backgroundColor: colors.bgDark,
};

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
  marginBottom: '24px',
};

const logoText = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: colors.textWhite,
  margin: 0,
  textShadow: `0 0 20px ${colors.coral}60`,
  display: 'inline-block',
  verticalAlign: 'middle',
};

const subtitle = {
  color: colors.textLight,
  fontSize: '18px',
  margin: 0,
};

const body = {
  padding: '64px',
  backgroundColor: colors.bgDark,
};

const footer = {
  padding: '40px 48px',
  textAlign: 'center',
  backgroundColor: colors.bgDarkSecondary,
  borderRadius: '0 0 24px 24px',
};

const footerTitle = {
  color: colors.textWhite,
  fontWeight: 'bold',
  marginBottom: '4px',
  fontSize: '16px',
};

const footerSubtitle = {
  color: colors.coralLight,
  fontSize: '14px',
  marginBottom: '16px',
};

const footerLinks = {
  display: 'flex',
  justifyContent: 'center',
  gap: '24px',
  marginBottom: '16px',
  flexWrap: 'wrap',
};

const footerLink = {
  color: colors.textLight,
  fontSize: '14px',
  textDecoration: 'none',
};

const footerDivider = {
  borderColor: colors.bgDark,
  margin: '16px 0',
};

const footerCopyright = {
  color: colors.textLight,
  fontSize: '12px',
  opacity: 0.6,
  lineHeight: '1.6',
};

function BaseEmail({ children, previewText = '' }) {
  return React.createElement(Html, { lang: 'en' },
    React.createElement(Head, null,
      React.createElement(Font, {
        fontFamily: 'Inter',
        fallbackFontFamily: 'Arial',
        webFont: {
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
          format: 'woff2',
        },
        fontWeight: 400,
        fontStyle: 'normal',
      }),
      // lock light color scheme so Gmail iOS won't invert
      React.createElement('meta', { name: 'color-scheme', content: 'light' }),
      React.createElement('meta', { name: 'supported-color-schemes', content: 'light' }),

      // mobile + dark-mode overrides, and a stack helper
      React.createElement('style', {
        dangerouslySetInnerHTML: {
          __html: `
  :root, [data-ogsc] body { background-color: #2C2B30 !important; color-scheme: only light; }
  [data-bg-dark] { background-color: #2C2B30 !important; }
  [data-bg-dark-2] { background-color: #4F4F51 !important; }
  [data-text-white] { color: #FFFFFF !important; }
  [data-text-light] { color: #D6D6D6 !important; }

  @media only screen and (max-width: 480px) {
    .stack td { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    .stack td:last-child { padding-bottom: 0 !important; }
  }
`}
      })

    ),
    React.createElement(Body, { style: main, 'data-bg-dark': true },
      // Preview text
      previewText && React.createElement(Text, {
        style: {
          fontSize: '1px',
          color: 'transparent',
          lineHeight: '1px',
          maxHeight: '0',
          maxWidth: '0',
          opacity: 0,
          overflow: 'hidden',
        }
      }, previewText),

      // Main Container
      React.createElement(Container, { style: container, 'data-bg-dark': true },
        // Header
        React.createElement(Section, { style: header, 'data-bg-dark': true },
          React.createElement(Text, { style: subtitle }, 'AI-Powered Job Tracking')
        ),

        // Body
        React.createElement(Section, { style: body, 'data-bg-dark': true }, children),

        // Footer
        React.createElement(Section, { style: footer, 'data-bg-dark': true },
          React.createElement(Text, { style: footerTitle }, 'Applytide'),
          React.createElement(Text, { style: footerSubtitle }, 'Your AI-Powered Job Application Tracker'),

          React.createElement('table', {
            align: 'center',
            role: 'presentation',
            cellSpacing: '0',
            cellPadding: '0',
            border: '0',
            style: { marginBottom: '16px' }
          },
            React.createElement('tr', null,
              React.createElement('td', { style: { padding: '0 12px' } },
                React.createElement(Link, { href: 'https://applytide.com', style: footerLink }, 'Home')
              ),
              React.createElement('td', { style: { padding: '0 12px' } },
                React.createElement(Link, { href: 'https://applytide.com/dashboard', style: footerLink }, 'Dashboard')
              ),
              React.createElement('td', { style: { padding: '0 12px' } },
                React.createElement(Link, { href: 'https://applytide.com/privacy', style: footerLink }, 'Privacy')
              ),
              React.createElement('td', { style: { padding: '0 12px' } },
                React.createElement(Link, { href: 'https://applytide.com/contact', style: footerLink }, 'Contact')
              )
            )
          ),

          React.createElement(Hr, { style: footerDivider }),

          React.createElement(Text, { style: footerCopyright }, '© 2025 Applytide. All rights reserved.'),
          React.createElement(Text, { style: footerCopyright }, "You're receiving this because you have an account with us.")
        )
      )
    )
  );
}

module.exports = { BaseEmail, colors };
