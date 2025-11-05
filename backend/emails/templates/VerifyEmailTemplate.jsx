const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

function VerifyEmailTemplate({ verifyUrl }) {
  return React.createElement(BaseEmail, {
    previewText: 'Verify your email address to get started with Applytide'
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
      }, '✨ Welcome'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Welcome to Applytide!'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, "Let's verify your email to get started")
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
          color: colors.textLight,
          lineHeight: '1.7',
          textAlign: 'center',
          marginBottom: '32px',
        }
      }, 'Thanks for signing up! Click the button below to verify your email address and get started.')
    ),

    // CTA Button
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      React.createElement(Link, {
        href: verifyUrl,
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
      }, 'Verify Email Address')
    ),

    // Manual Link Section
    React.createElement(Section, {
      style: {
        textAlign: 'center',
        marginBottom: '48px',
      }
    },
      React.createElement(Text, {
        style: {
          fontSize: '13px',
          color: colors.textLight,
          marginBottom: '8px',
        }
      }, "If the button doesn't work, copy and paste this link into your browser:"),
      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '8px',
          padding: '12px 16px',
          maxWidth: '500px',
          margin: '0 auto',
        }
      },
        React.createElement(Link, {
          href: verifyUrl,
          style: {
            color: colors.coral,
            wordBreak: 'break-all',
            fontSize: '12px',
            textDecoration: 'none',
          }
        }, verifyUrl)
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
      }, 'This verification link will expire in 24 hours.'),
      React.createElement(Text, {
        style: {
          fontSize: '14px',
          color: colors.textLight,
        }
      }, "If you didn't create an account, you can safely ignore this email.")
    )
  );
}

module.exports = VerifyEmailTemplate;
module.exports.default = VerifyEmailTemplate;
