const React = require('react');
const { Html, Head, Body, Container, Section, Text, Link, Hr } = require('@react-email/components');

const colors = {
  bgDark: '#1a1a1a',
  bgDarkSecondary: '#2d2d2d',
  textLight: '#cccccc',
  textWhite: '#ffffff',
  coral: '#F58F7C',
  coralLight: '#F2C4CE',
  coralBg: '#fff5f3',
};

const main = {
  backgroundColor: colors.bgDark,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '0',
  margin: '0',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: colors.bgDark,
};

const header = {
  padding: '40px 20px 32px',
  textAlign: 'center',
  backgroundColor: colors.bgDark,
};

const logoBox = {
  display: 'inline-block',
  backgroundColor: colors.coral,
  padding: '16px 32px',
  borderRadius: '12px',
  marginBottom: '16px',
};

const logoText = {
  fontSize: '32px',
  fontWeight: '900',
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
};

const subtitle = {
  color: colors.textLight,
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
};

const body = {
  padding: '20px',
  backgroundColor: colors.bgDark,
};

const footer = {
  padding: '40px 20px',
  textAlign: 'center',
  backgroundColor: colors.bgDarkSecondary,
  borderTop: `1px solid ${colors.bgDark}`,
};

const footerLogoBox = {
  display: 'inline-block',
  backgroundColor: colors.coral,
  padding: '14px 28px',
  borderRadius: '10px',
  marginBottom: '12px',
};

const footerLogoText = {
  fontSize: '28px',
  fontWeight: '900',
  color: '#ffffff',
  margin: '0',
};

const footerSubtitle = {
  color: colors.textLight,
  fontSize: '13px',
  margin: '0 0 20px 0',
  fontWeight: '400',
};

const footerLinks = {
  margin: '0 0 16px 0',
};

const footerLink = {
  color: colors.textLight,
  fontSize: '13px',
  textDecoration: 'none',
  margin: '0 12px',
};

const footerCopyright = {
  color: colors.textLight,
  fontSize: '12px',
  opacity: '0.7',
  margin: '8px 0',
  lineHeight: '1.5',
};

function BaseEmail({ children, previewText = '' }) {
  return React.createElement(Html, { lang: 'en' },
    React.createElement(Head, null,
      React.createElement('meta', { name: 'color-scheme', content: 'light dark' }),
      React.createElement('meta', { name: 'supported-color-schemes', content: 'light dark' }),
      React.createElement('style', null, `
        body { margin: 0; padding: 0; }
        table { border-collapse: collapse; }
        @media only screen and (max-width: 600px) {
          .mobile-full { width: 100% !important; }
          .mobile-padding { padding: 16px !important; }
        }
      `)
    ),
    React.createElement(Body, { style: main },
      previewText && React.createElement('div', {
        style: {
          display: 'none',
          fontSize: '1px',
          color: colors.bgDark,
          lineHeight: '1px',
          maxHeight: '0',
          maxWidth: '0',
          opacity: '0',
          overflow: 'hidden'
        }
      }, previewText),

      React.createElement('table', {
        role: 'presentation',
        width: '100%',
        cellPadding: '0',
        cellSpacing: '0',
        border: '0',
        style: { backgroundColor: colors.bgDark }
      },
        React.createElement('tr', null,
          React.createElement('td', { align: 'center', style: { padding: '0' } },
            React.createElement('table', {
              role: 'presentation',
              width: '600',
              cellPadding: '0',
              cellSpacing: '0',
              border: '0',
              className: 'mobile-full',
              style: container
            },
              // HEADER
              React.createElement('tr', null,
                React.createElement('td', { style: header },
                  React.createElement('table', { role: 'presentation', cellPadding: '0', cellSpacing: '0', border: '0', align: 'center' },
                    React.createElement('tr', null,
                      React.createElement('td', { style: logoBox },
                        React.createElement('table', { role: 'presentation', cellPadding: '0', cellSpacing: '0', border: '0' },
                          React.createElement('tr', null,
                            React.createElement('td', null,
                              React.createElement(Text, { style: logoText }, 'Applytide')
                            )
                          )
                        )
                      )
                    )
                  ),
                  React.createElement(Text, { style: subtitle }, 'AI-Powered Job Tracking')
                )
              ),

              // BODY
              React.createElement('tr', null,
                React.createElement('td', { style: body, className: 'mobile-padding' },
                  children
                )
              ),

              // FOOTER
              React.createElement('tr', null,
                React.createElement('td', { style: footer },
                  React.createElement('table', { role: 'presentation', cellPadding: '0', cellSpacing: '0', border: '0', align: 'center' },
                    React.createElement('tr', null,
                      React.createElement('td', { style: footerLogoBox },
                        React.createElement(Text, { style: footerLogoText }, 'Applytide')
                      )
                    )
                  ),
                  React.createElement(Text, { style: footerSubtitle }, 'Your AI-Powered Job Application Tracker'),
                  React.createElement('div', { style: footerLinks },
                    React.createElement(Link, { href: 'https://applytide.com', style: footerLink }, 'Home'),
                    React.createElement('span', { style: { color: colors.textLight, margin: '0 4px' } }, '•'),
                    React.createElement(Link, { href: 'https://applytide.com/dashboard', style: footerLink }, 'Dashboard'),
                    React.createElement('span', { style: { color: colors.textLight, margin: '0 4px' } }, '•'),
                    React.createElement(Link, { href: 'https://applytide.com/privacy', style: footerLink }, 'Privacy'),
                    React.createElement('span', { style: { color: colors.textLight, margin: '0 4px' } }, '•'),
                    React.createElement(Link, { href: 'https://applytide.com/contact', style: footerLink }, 'Contact')
                  ),
                  React.createElement(Hr, { style: { borderColor: colors.bgDark, margin: '20px 0 16px 0' } }),
                  React.createElement(Text, { style: footerCopyright }, '© 2025 Applytide. All rights reserved.'),
                  React.createElement(Text, { style: footerCopyright }, "You're receiving this because you have an account with us.")
                )
              )
            )
          )
        )
      )
    )
  );
}

module.exports = { BaseEmail, colors };