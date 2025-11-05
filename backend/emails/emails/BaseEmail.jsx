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
  backgroundColor: '#1a1a1a',
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

const logoBox = {
  width: '80px',
  height: '80px',
  backgroundColor: colors.coral,
  borderRadius: '16px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 0 30px ${colors.coral}80, 0 0 60px ${colors.coral}40`,
  fontSize: '40px',
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
      })
    ),
    React.createElement(Body, { style: main },
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
      React.createElement(Container, { style: container },
        // Header
        React.createElement(Section, { style: header },
          // Logo and title
          React.createElement('table', {
            align: 'center',
            role: 'presentation',
            cellSpacing: '0',
            cellPadding: '0',
            border: '0',
            style: { marginBottom: '24px' }
          },
            React.createElement('tr', null,
              React.createElement('td', null,
                React.createElement('div', { style: logoBox }, '⚡')
              ),
              React.createElement('td', { style: { paddingLeft: '20px' } },
                React.createElement(Text, { style: logoText }, 'Applytide')
              )
            )
          ),
          React.createElement(Text, { style: subtitle }, 'AI-Powered Job Tracking')
        ),

        // Body
        React.createElement(Section, { style: body }, children),

        // Footer
        React.createElement(Section, { style: footer },
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
