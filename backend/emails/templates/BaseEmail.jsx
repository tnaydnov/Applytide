const React = require('react');
const { Html, Head, Body, Container, Section, Text, Link, Hr, Font } = require('@react-email/components');

const colors = {
  bgDark: '#2C2B30',
  bgDarkSecondary: '#4F4F51',
  textLight: '#D6D6D6',
  textWhite: '#FFFFFF',
  coral: '#F58F7C',
  coralLight: '#F2C4CE',
};

const main = {
  backgroundColor: colors.bgDark,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '0',
};

const container = {
  maxWidth: '1200px',
  margin: '0 auto',
  backgroundColor: colors.bgDark,
};

const header = {
  padding: '48px 20px 24px 20px',
  textAlign: 'center',
  backgroundColor: colors.bgDark,
};

const wordmarkWrap = {
  display: 'inline-block',
  padding: '20px 32px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #F58F7C 0%, #F2C4CE 100%)',
  boxShadow: '0 4px 12px rgba(245, 143, 124, 0.3)',
};

const wordmark = {
  fontSize: '42px',
  fontWeight: 900,
  color: colors.bgDark,
  letterSpacing: '0.5px',
  margin: 0,
};

const subtitle = {
  color: colors.textLight,
  fontSize: '16px',
  margin: '12px 0 0 0',
  fontWeight: '500',
};

const body = {
  padding: '40px 16px 64px 16px',
  backgroundColor: colors.bgDark,
};

const footer = {
  padding: '48px 20px',
  textAlign: 'center',
  backgroundColor: colors.bgDarkSecondary,
};

const footerLogoWrap = {
  display: 'inline-block',
  padding: '20px 36px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #F58F7C 0%, #F2C4CE 100%)',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(245, 143, 124, 0.3)',
};

const footerLogo = {
  fontSize: '38px',
  fontWeight: 900,
  color: colors.bgDark,
  margin: 0,
};

const footerSubtitle = {
  color: colors.textLight,
  fontSize: '15px',
  marginBottom: '24px',
  fontWeight: '500',
};

const footerLink = {
  color: colors.textLight,
  fontSize: '14px',
  textDecoration: 'none',
  padding: '0 12px',
};

const footerDivider = {
  borderColor: colors.bgDark,
  margin: '16px 0',
};

const footerCopyright = {
  color: colors.textLight,
  fontSize: '12px',
  opacity: 0.7,
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
      // mobile + dark-mode overrides + Gmail clients
      React.createElement('style', {
        dangerouslySetInnerHTML: {
          __html: `
  :root, [data-ogsc] body { background-color: #2C2B30 !important; color-scheme: only light; }
  body, table, td, div, p { background-color: #2C2B30 !important; }
  [data-bg-dark] { background-color: #2C2B30 !important; }
  [data-bg-dark-2] { background-color: #4F4F51 !important; }
  [data-text-white] { color: #FFFFFF !important; }
  [data-text-light] { color: #D6D6D6 !important; }
  [data-coral] { color: #F58F7C !important; }
  [data-coral-light] { color: #F2C4CE !important; }
  .stack td { vertical-align: top; }
  @media only screen and (max-width: 480px) {
    .stack td { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    .stack td:last-child { padding-bottom: 0 !important; }
    .xl-center { text-align: center !important; }
    body, table, td, div, p { background-color: #2C2B30 !important; color: #D6D6D6 !important; }
  }
` }
      })
    ),
    React.createElement(Body, { style: main, 'data-bg-dark': true },
      previewText && React.createElement(Text, {
        style: { fontSize: '1px', color: 'transparent', lineHeight: '1px', maxHeight: '0', maxWidth: '0', opacity: 0, overflow: 'hidden' }
      }, previewText),

      React.createElement(Container, { style: container, 'data-bg-dark': true },

        // HEADER with logo
        React.createElement(Section, { style: header, 'data-bg-dark': true },
          React.createElement('div', { style: wordmarkWrap },
            React.createElement(Text, { style: wordmark }, 'Applytide')
          ),
          React.createElement(Text, { style: subtitle }, 'AI-Powered Job Tracking')
        ),

        // BODY
        React.createElement(Section, { style: body, 'data-bg-dark': true }, children),

        // FOOTER with bigger logo
        React.createElement(Section, { style: footer, 'data-bg-dark-2': true },
          React.createElement('div', { style: footerLogoWrap },
            React.createElement(Text, { style: footerLogo }, 'Applytide')
          ),
          React.createElement(Text, { style: footerSubtitle }, 'Your AI-Powered Job Application Tracker'),
          React.createElement('table', { align: 'center', role: 'presentation', cellSpacing: '0', cellPadding: '0', border: '0', style: { marginBottom: '14px' } },
            React.createElement('tr', null,
              React.createElement('td', null, React.createElement(Link, { href: 'https://applytide.com', style: footerLink }, 'Home')),
              React.createElement('td', null, React.createElement(Link, { href: 'https://applytide.com/dashboard', style: footerLink }, 'Dashboard')),
              React.createElement('td', null, React.createElement(Link, { href: 'https://applytide.com/privacy', style: footerLink }, 'Privacy')),
              React.createElement('td', null, React.createElement(Link, { href: 'https://applytide.com/contact', style: footerLink }, 'Contact')),
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
