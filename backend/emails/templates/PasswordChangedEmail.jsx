const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

function PasswordChangedEmail({ name = 'there', changedAt = new Date().toLocaleString() }) {
  return React.createElement(BaseEmail, {
    previewText: 'Your Applytide password was changed'
  },
    // Hero Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      React.createElement('div', {
        style: {
          width: '80px',
          height: '80px',
          backgroundColor: colors.coral,
          borderRadius: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '40px',
        }
      }, '🛡️'),
      React.createElement('div', {
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '8px 20px',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '16px',
        }
      }, '🛡️ Security Update'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Password Changed'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Hi ${name}, your password was just updated`)
    ),

    // Success Confirmation
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '48px',
      }
    },
      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
        React.createElement('tr', null,
          React.createElement('td', { style: { paddingRight: '24px', verticalAlign: 'middle' } },
            React.createElement('div', {
              style: {
                width: '56px',
                height: '56px',
                backgroundColor: colors.coral,
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }
            }, '✓')
          ),
          React.createElement('td', { style: { verticalAlign: 'middle' } },
            React.createElement(Text, {
              style: {
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.textWhite,
                margin: 0,
              }
            }, 'Password successfully updated')
          )
        )
      ),
      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDark,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '24px',
        }
      },
        React.createElement(Text, {
          style: {
            fontWeight: 'bold',
            color: colors.textLight,
            margin: 0,
          }
        }, `Changed on: ${changedAt}`)
      )
    ),

    // Warning Section
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '48px',
      }
    },
      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
        React.createElement('tr', null,
          React.createElement('td', { style: { paddingRight: '24px', verticalAlign: 'top' } },
            React.createElement('div', {
              style: {
                width: '56px',
                height: '56px',
                backgroundColor: colors.coral,
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }
            }, '⚠️')
          ),
          React.createElement('td', { style: { verticalAlign: 'top' } },
            React.createElement(Text, {
              style: {
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.textWhite,
                marginBottom: '12px',
              }
            }, "Didn't make this change?"),
            React.createElement(Text, {
              style: {
                color: colors.textLight,
                lineHeight: '1.7',
                marginBottom: '24px',
              }
            }, "If you didn't request this password change, your account may be compromised. Secure it immediately.")
          )
        )
      ),
      React.createElement(Link, {
        href: 'https://applytide.com/auth/reset',
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '16px 32px',
          borderRadius: '24px',
          fontWeight: 'bold',
          textDecoration: 'none',
        }
      }, 'Reset Password Now')
    ),

    // Security Best Practices
    React.createElement(Section, { style: { marginBottom: '48px' } },
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.textWhite,
          textAlign: 'center',
          marginBottom: '32px',
        }
      }, 'Security Best Practices'),

      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coral,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '24px',
                }
              }, '🔑'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, 'Strong Password'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Use numbers, symbols, and mixed case')
            )
          ),
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coralLight,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '24px',
                }
              }, '🔒'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, 'Never Share'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, "Don't share with anyone, including staff")
            )
          )
        ),
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coral,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '24px',
                }
              }, '🛡️'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, 'Two-Factor Auth'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Extra security layer (coming soon!)')
            )
          ),
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '24px',
              }
            },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coralLight,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '24px',
                }
              }, '👁️'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '8px',
                }
              }, 'Watch for Phishing'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, "We'll never ask for your password")
            )
          )
        )
      )
    ),

    // Footer Message
    React.createElement(Section, {
      style: {
        textAlign: 'center',
        paddingTop: '32px',
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
      }
    },
      React.createElement(Text, {
        style: {
          color: colors.textLight,
        }
      }, 'Questions? Contact us at '),
      React.createElement(Link, {
        href: 'mailto:security@applytide.com',
        style: {
          color: colors.coral,
          fontWeight: 'bold',
        }
      }, 'security@applytide.com')
    )
  );
}

module.exports = PasswordChangedEmail;
module.exports.default = PasswordChangedEmail;
