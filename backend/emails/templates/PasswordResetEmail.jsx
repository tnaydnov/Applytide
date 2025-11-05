const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

function PasswordResetEmail({ resetUrl }) {
  return React.createElement(BaseEmail, {
    previewText: 'Reset your Applytide password'
  },
    // Hero Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
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
      }, '🔑 Password Reset'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Reset Your Password'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, 'We received a request to reset your password')
    ),

    // Main Card
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '40px 32px',
        marginBottom: '32px',
      }
    },
      React.createElement(Text, {
        style: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: colors.textWhite,
          textAlign: 'center',
          marginBottom: '16px',
        }
      }, 'Password Reset Request'),
      React.createElement(Text, {
        style: {
          color: colors.textLight,
          lineHeight: '1.7',
          textAlign: 'center',
          marginBottom: '32px',
        }
      }, 'We received a request to reset your password. Click the button below to create a new password.')
    ),

    // CTA Button
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      React.createElement(Link, {
        href: resetUrl,
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '16px 48px',
          borderRadius: '28px',
          fontWeight: '600',
          fontSize: '18px',
          textDecoration: 'none',
        }
      }, 'Reset Password')
    ),

    // Manual Link Section
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '48px',
      }
    },
      React.createElement(Text, {
        style: {
          fontSize: '14px',
          color: colors.textLight,
          marginBottom: '12px',
        }
      }, "If the button doesn't work, copy and paste this link into your browser:"),
      React.createElement(Link, {
        href: resetUrl,
        style: {
          color: colors.coral,
          wordBreak: 'break-all',
          fontSize: '14px',
        }
      }, resetUrl)
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
          React.createElement('td', { style: { paddingRight: '16px', verticalAlign: 'top' } },
            React.createElement('table', {
              role: 'presentation',
              cellPadding: '0',
              cellSpacing: '0',
              border: '0'
            },
              React.createElement('tr', null,
                React.createElement('td', {
                  style: {
                    width: '48px',
                    height: '48px',
                    backgroundColor: colors.coral,
                    borderRadius: '12px',
                    textAlign: 'center',
                    lineHeight: '48px',
                    fontSize: '24px',
                  }
                }, '⚠️')
              )
            )
          ),
          React.createElement('td', { style: { verticalAlign: 'top' } },
            React.createElement(Text, {
              style: {
                fontSize: '20px',
                fontWeight: 'bold',
                color: colors.textWhite,
                marginBottom: '12px',
              }
            }, "Didn't request this?"),
            React.createElement(Text, {
              style: {
                color: colors.textLight,
                lineHeight: '1.7',
                margin: 0,
              }
            }, "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.")
          )
        )
      )
    ),

    // Footer Info
    React.createElement(Section, {
      style: {
        textAlign: 'center',
        paddingTop: '32px',
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
      }
    },
      React.createElement(Text, {
        style: {
          fontSize: '14px',
          color: colors.textLight,
          marginBottom: '8px',
        }
      }, 'This reset link will expire in 1 hour.'),
      React.createElement(Text, {
        style: {
          fontSize: '14px',
          color: colors.textLight,
        }
      }, 'For security reasons, this link can only be used once.')
    )
  );
}

module.exports = PasswordResetEmail;
module.exports.default = PasswordResetEmail;
