const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link, Button } = require('@react-email/components');

// Shared button style
const actionButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '24px',
  padding: '16px 32px',
  fontWeight: 'bold',
  backgroundColor: colors.coral,
  color: colors.textWhite,
  textDecoration: 'none',
  boxShadow: `0 4px 20px ${colors.coral}60`,
};

const badge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '20px',
  padding: '8px 20px',
  fontWeight: 'bold',
  backgroundColor: colors.coralLight,
  color: colors.bgDark,
  fontSize: '14px',
};

function WelcomeEmail({ name = 'there' }) {
  return React.createElement(BaseEmail, {
    previewText: `Welcome to Applytide, ${name}! Let's get you started`
  },
    // Hero Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      React.createElement('div', { style: { marginBottom: '16px' } },
        React.createElement('span', { style: badge }, '✨  Account Activated  ✨')
      ),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, `Welcome aboard, ${name}!`),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, 'Your AI-powered job search companion is ready')
    ),

    // CTA Button
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '64px' } },
      React.createElement(Link, {
        href: 'http://localhost/dashboard',
        style: actionButton
      }, 'Open Dashboard →')
    ),

    // Job Search Journey
    React.createElement(Section, { style: { marginBottom: '64px' } },
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.textWhite,
          textAlign: 'center',
          marginBottom: '8px',
        }
      }, 'Your Job Search Journey'),
      React.createElement(Text, {
        style: {
          color: colors.textLight,
          textAlign: 'center',
          marginBottom: '40px',
        }
      }, 'A seamless workflow designed for success'),

      // Steps Grid (using table for email compatibility)
      React.createElement('table', {
        width: '100%',
        cellSpacing: '0',
        cellPadding: '0',
        style: { marginBottom: '24px' }
      },
        React.createElement('tr', null,
          // Step 1
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coral,
                      color: colors.textWhite,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '1')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '🌐 Save Jobs'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Browser extension for one-click saving')
            )
          ),
          // Step 2
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coralLight,
                      color: colors.bgDark,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '2')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '✨ AI Resume Optimization'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Tailor your resume for each position')
            )
          )
        ),
        React.createElement('tr', null,
          // Step 3
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coral,
                      color: colors.textWhite,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '3')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '📄 Cover Letters'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'AI-generated, personalized cover letters')
            )
          ),
          // Step 4
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coralLight,
                      color: colors.bgDark,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '4')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '📊 Track Pipeline'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Visualize your application progress')
            )
          )
        ),
        React.createElement('tr', null,
          // Step 5
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coral,
                      color: colors.textWhite,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '5')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '🔔 Smart Reminders'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Never miss a follow-up or deadline')
            )
          ),
          // Step 6
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '16px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors.coralLight,
                      color: colors.bgDark,
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }
                  }, '6')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, '📈 Analytics'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Track trends and optimize your strategy')
            )
          )
        )
      )
    ),

    // Quick Start CTA
    React.createElement(Section, {
      style: {
        background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
        borderRadius: '16px',
        padding: '48px 32px 40px',
        textAlign: 'center',
      }
    },
      React.createElement('div', {
        style: {
          fontSize: '50px',
          lineHeight: '1',
          marginBottom: '24px',
        }
      }, '🌐'),
      React.createElement(Text, {
        style: {
          fontSize: '28px',
          fontWeight: 'bold',
          color: colors.bgDark,
          marginBottom: '8px',
        }
      }, 'Quick Start: Install Extension'),
      React.createElement(Text, {
        style: {
          color: colors.bgDarkSecondary,
          marginBottom: '28px',
        }
      }, 'Save jobs from any website with one click!'),
      React.createElement(Link, {
        href: 'https://chromewebstore.google.com/detail/onilaanepnjcbcoehjphgicieliclmmo?utm_source=item-share-cb',
        style: {
          display: 'inline-block',
          backgroundColor: colors.bgDark,
          color: colors.textWhite,
          padding: '12px 24px',
          borderRadius: '24px',
          fontWeight: 'bold',
          textDecoration: 'none',
        }
      }, 'Get Chrome Extension →')
    ),

    // Footer Message
    React.createElement(Section, {
      style: {
        textAlign: 'center',
        marginTop: '48px',
        paddingTop: '32px',
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
      }
    },
      React.createElement(Text, {
        style: {
          color: colors.textLight,
        }
      }, 'Questions? We\'re here to help!'),
      React.createElement(Text, {
        style: {
          fontSize: '14px',
          color: colors.coral,
        }
      }, 'Reply to this email anytime')
    )
  );
}

module.exports = WelcomeEmail;
module.exports.default = WelcomeEmail;
