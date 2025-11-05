const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

function DeletionConfirmationEmail({ 
  name = 'there', 
  deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  recoveryUrl = 'https://applytide.com/recover'
}) {
  return React.createElement(BaseEmail, {
    previewText: 'Your Applytide account will be deleted in 7 days - Recover now'
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
      }, '⚠️'),
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
      }, '⚠️ Deletion Scheduled'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Your Account Will Be Deleted'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Hi ${name}, we've received your deletion request`)
    ),

    // Deletion Date Countdown
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
        marginBottom: '48px',
      }
    },
      React.createElement(Text, {
        style: {
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontWeight: 'bold',
          color: colors.coral,
          marginBottom: '16px',
        }
      }, 'Deletion Date'),
      React.createElement(Text, {
        style: {
          fontSize: '48px',
          fontWeight: 'bold',
          color: colors.textWhite,
          marginBottom: '24px',
        }
      }, deletionDate),
      React.createElement('div', {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '12px 24px',
          borderRadius: '24px',
        }
      },
        React.createElement('span', { style: { fontSize: '24px' } }, '⏱️'),
        React.createElement('span', { style: { fontWeight: 'bold' } }, '7 days remaining')
      )
    ),

    // Recovery Section
    React.createElement(Section, {
      style: {
        background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
        marginBottom: '48px',
      }
    },
      React.createElement('div', {
        style: {
          width: '64px',
          height: '64px',
          backgroundColor: colors.bgDark,
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '32px',
        }
      }, '🔄'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.bgDark,
          marginBottom: '16px',
        }
      }, 'Changed Your Mind?'),
      React.createElement(Text, {
        style: {
          fontSize: '20px',
          color: colors.bgDarkSecondary,
          lineHeight: '1.7',
          maxWidth: '600px',
          margin: '0 auto 8px',
        }
      }, 
        'You have ',
        React.createElement('span', { style: { fontSize: '28px', fontWeight: 'bold' } }, '7 days'),
        ' to recover your account.'
      ),
      React.createElement(Text, {
        style: {
          color: colors.bgDarkSecondary,
          marginBottom: '32px',
        }
      }, 'Click below or simply log in to cancel the deletion.'),
      React.createElement(Link, {
        href: recoveryUrl,
        style: {
          display: 'inline-block',
          backgroundColor: colors.bgDark,
          color: colors.textWhite,
          padding: '18px 36px',
          borderRadius: '24px',
          fontWeight: 'bold',
          textDecoration: 'none',
          marginBottom: '24px',
        }
      }, '🔄 Recover My Account →'),
      React.createElement('div', {
        style: {
          backgroundColor: `${colors.bgDark}99`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
        }
      },
        React.createElement(Text, {
          style: {
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.bgDark,
            marginBottom: '8px',
          }
        }, 'Or copy this recovery link:'),
        React.createElement(Text, {
          style: {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: colors.bgDark,
            wordBreak: 'break-all',
            margin: 0,
          }
        }, recoveryUrl)
      )
    ),

    // What Will Be Deleted
    React.createElement(Section, { style: { marginBottom: '48px' } },
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.textWhite,
          textAlign: 'center',
          marginBottom: '32px',
        }
      }, 'What Will Be Deleted'),

      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0', style: { marginBottom: '24px' } },
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '20px',
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
                  marginBottom: '12px',
                  fontSize: '24px',
                }
              }, '📄'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '4px',
                }
              }, 'All resumes and documents'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Your uploaded files and generated content')
            )
          ),
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '20px',
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
                  marginBottom: '12px',
                  fontSize: '24px',
                }
              }, '💼'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '4px',
                }
              }, 'Job applications and analytics'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'All saved jobs and tracking data')
            )
          )
        ),
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '20px',
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
                  marginBottom: '12px',
                  fontSize: '24px',
                }
              }, '👤'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '4px',
                }
              }, 'Profile and preferences'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'Your personal information and settings')
            )
          ),
          React.createElement('td', { style: { padding: '12px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '20px',
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
                  marginBottom: '12px',
                  fontSize: '24px',
                }
              }, '🔔'),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  marginBottom: '4px',
                }
              }, 'Reminders and calendar events'),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, 'All scheduled notifications')
            )
          )
        )
      ),

      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '16px',
          padding: '24px',
        }
      },
        React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
          React.createElement('tr', null,
            React.createElement('td', { style: { paddingRight: '16px', verticalAlign: 'top' } },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coral,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }
              }, '⚠️')
            ),
            React.createElement('td', { style: { verticalAlign: 'top' } },
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, `This deletion is permanent and cannot be undone after ${deletionDate}.`)
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
        href: 'mailto:support@applytide.com',
        style: {
          color: colors.coral,
          fontWeight: 'bold',
        }
      }, 'support@applytide.com')
    )
  );
}

module.exports = DeletionConfirmationEmail;
module.exports.default = DeletionConfirmationEmail;
