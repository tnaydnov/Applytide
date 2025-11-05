const React = require('react');
const { Html, Head, Body, Text, Link, Hr } = require('@react-email/components');

const colors = {
  bgDark: '#2e2e30',
  bgDarkCard: '#3f3f42',
  bgDarkSecondary: '#4a4a4e',
  textLight: '#d1d1d6',
  textWhite: '#ffffff',
  coral: '#FF9580',
  coralLight: '#FFB5A7',
  coralBg: '#FFC9BD',
};

const main = {
  backgroundColor: colors.bgDark,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '0',
  margin: '0',
};

const container = {
  maxWidth: '900px',
  margin: '0 auto',
  backgroundColor: colors.bgDark,
};

const header = {
  padding: '48px 32px 40px',
  textAlign: 'center',
  backgroundColor: colors.bgDark,
};

const logoWrapper = {
  marginBottom: '16px',
};

const logoBox = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
};

const logoIcon = {
  width: '48px',
  height: '48px',
  backgroundColor: colors.coral,
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
};

const logoText = {
  fontSize: '50px',
  fontWeight: '900',
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
  display: 'inline-block',
  verticalAlign: 'middle',
};

const subtitle = {
  color: colors.textLight,
  fontSize: '15px',
  margin: '0',
  fontWeight: '400',
};

const body = {
  padding: '0 32px 40px',
  backgroundColor: colors.bgDark,
};

const footer = {
  padding: '48px 32px',
  textAlign: 'center',
  backgroundColor: colors.bgDarkSecondary,
  borderTop: `1px solid ${colors.bgDarkCard}`,
};

const footerLogoText = {
  fontSize: '32px',
  fontWeight: '700',
  color: colors.textWhite,
  margin: '0 0 8px 0',
};

const footerSubtitle = {
  color: colors.textLight,
  fontSize: '14px',
  margin: '0 0 24px 0',
  fontWeight: '400',
};

const footerLinks = {
  margin: '0 0 24px 0',
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
        @media only screen and (max-width: 920px) {
          .container { width: 100% !important; }
          .mobile-padding { padding: 16px !important; }
          .two-col { width: 100% !important; display: block !important; }
          .two-col-padding { padding: 0 0 12px 0 !important; }
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
              width: '900',
              cellPadding: '0',
              cellSpacing: '0',
              border: '0',
              className: 'container',
              style: container
            },
              // HEADER
              React.createElement('tr', null,
                React.createElement('td', { style: header },
                  React.createElement('div', { style: logoWrapper },
                    React.createElement('table', { role: 'presentation', cellPadding: '0', cellSpacing: '0', border: '0', align: 'center' },
                      React.createElement('tr', null,
                        React.createElement('td', {
                          style: {
                            paddingRight: '16px',
                            verticalAlign: 'middle',
                          }
                        },
                          React.createElement('img', {
                            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik02NCAyMDggTDEyOCA0OCIgc3Ryb2tlPSIjRjNGNkZGIiBzdHJva2Utd2lkdGg9IjI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTkyIDIwOCBMMTI4IDQ4IiBzdHJva2U9IiNGM0Y2RkYiIHN0cm9rZS13aWR0aD0iMjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0gNTggMTQ2IEMgODYgODYsIDEwNiAyMDYsIDEyOCAxNDYgUyAxNzAgODYsIDE5NCAxNDYiIHN0cm9rZT0iI0ZGOTU4MCIgc3Ryb2tlLXdpZHRoPSIyNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+PC9zdmc+',
                            alt: 'Applytide Logo',
                            width: '48',
                            height: '48',
                            style: {
                              display: 'block',
                              width: '48px',
                              height: '48px',
                            }
                          })
                        ),
                        React.createElement('td', { style: { verticalAlign: 'middle' } },
                          React.createElement(Text, { style: logoText }, 'Applytide')
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
                  React.createElement('table', { role: 'presentation', cellPadding: '0', cellSpacing: '0', border: '0', align: 'center', style: { marginBottom: '8px' } },
                    React.createElement('tr', null,
                      React.createElement('td', {
                        style: {
                          paddingRight: '12px',
                          verticalAlign: 'middle',
                        }
                      },
                        React.createElement('img', {
                          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik02NCAyMDggTDEyOCA0OCIgc3Ryb2tlPSIjRjNGNkZGIiBzdHJva2Utd2lkdGg9IjI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTkyIDIwOCBMMTI4IDQ4IiBzdHJva2U9IiNGM0Y2RkYiIHN0cm9rZS13aWR0aD0iMjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0gNTggMTQ2IEMgODYgODYsIDEwNiAyMDYsIDEyOCAxNDYgUyAxNzAgODYsIDE5NCAxNDYiIHN0cm9rZT0iI0ZGOTU4MCIgc3Ryb2tlLXdpZHRoPSIyNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+PC9zdmc+',
                          alt: 'Applytide Logo',
                          width: '32',
                          height: '32',
                          style: {
                            display: 'block',
                            width: '32px',
                            height: '32px',
                          }
                        })
                      ),
                      React.createElement('td', { style: { verticalAlign: 'middle' } },
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
                  React.createElement(Hr, { style: { borderColor: colors.bgDarkCard, margin: '24px 0 20px 0' } }),
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