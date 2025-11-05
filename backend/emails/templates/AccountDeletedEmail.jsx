const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

function AccountDeletedEmail({ name = 'there' }) {
  return React.createElement(BaseEmail, {
    previewText: 'Your Applytide account has been deleted'
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
      }, 'Account Deleted'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Account Deleted'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Sorry to see you go, ${name}`)
    ),

    // Deletion Confirmation
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '32px 32px 32px 40px',
        marginBottom: '32px',
      }
    },
      React.createElement(Text, {
        style: {
          color: colors.textLight,
          lineHeight: '1.7',
          margin: 0,
          fontSize: '15px',
        }
      }, 'Your Applytide account and all associated data have been permanently deleted. This includes:')
    ),

    // Deleted Items Grid
    React.createElement(Section, { style: { marginBottom: '48px' } },
      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px', width: '50%' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '20px',
              }
            },
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '12px' }
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
                  }, '📄')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'All resumes and documents')
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
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '12px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      backgroundColor: colors.coralLight,
                      borderRadius: '12px',
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontSize: '24px',
                    }
                  }, '💼')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'Saved jobs and tracking data')
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
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '12px' }
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
                  }, '🔔')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'Reminders and preferences')
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
              React.createElement('table', {
                role: 'presentation',
                cellPadding: '0',
                cellSpacing: '0',
                border: '0',
                style: { marginBottom: '12px' }
              },
                React.createElement('tr', null,
                  React.createElement('td', {
                    style: {
                      width: '48px',
                      height: '48px',
                      backgroundColor: colors.coralLight,
                      borderRadius: '12px',
                      textAlign: 'center',
                      lineHeight: '48px',
                      fontSize: '24px',
                    }
                  }, '👤')
                )
              ),
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'Profile information')
            )
          )
        )
      )
    ),

    // Changed Your Mind
    React.createElement(Section, {
      style: {
        background: `linear-gradient(135deg, ${colors.coralLight}, ${colors.coral})`,
        borderRadius: '16px',
        padding: '48px 32px 40px',
        textAlign: 'center',
        marginBottom: '48px',
      }
    },
      React.createElement('div', {
        style: {
          fontSize: '50px',
          lineHeight: '1',
          marginBottom: '24px',
        }
      }, '💡'),
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.bgDark,
          marginBottom: '16px',
        }
      }, 'Changed your mind?'),
      React.createElement(Text, {
        style: {
          color: colors.bgDarkSecondary,
          lineHeight: '1.7',
          maxWidth: '600px',
          margin: '0 auto 28px',
        }
      }, "You can create a new account anytime. Your previous data cannot be recovered, but you can start fresh!"),
      React.createElement(Link, {
        href: 'https://applytide.com/login',
        style: {
          display: 'inline-block',
          backgroundColor: colors.bgDark,
          color: colors.textWhite,
          padding: '16px 32px',
          borderRadius: '24px',
          fontWeight: 'bold',
          textDecoration: 'none',
        }
      }, 'Create New Account →')
    ),

    // Feedback Request
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '24px',
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
                }, '💬')
              )
            )
          ),
          React.createElement('td', { style: { verticalAlign: 'top' } },
            React.createElement(Text, {
              style: {
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.textWhite,
                marginBottom: '12px',
              }
            }, "We'd love your feedback"),
            React.createElement(Text, {
              style: {
                color: colors.textLight,
                lineHeight: '1.7',
                marginBottom: '16px',
              }
            }, 'Help us improve! Let us know why you left and what we could do better.'),
            React.createElement(Link, {
              href: 'mailto:feedback@applytide.com?subject=Feedback from deleted account',
              style: {
                color: colors.coral,
                fontWeight: 'bold',
              }
            }, 'Send Feedback →')
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
      }, "This is the last email you'll receive from us."),
      React.createElement(Text, {
        style: {
          color: colors.textLight,
        }
      }, 'If you have any questions, contact '),
      React.createElement(Link, {
        href: 'mailto:privacy@applytide.com',
        style: {
          color: colors.coral,
          fontWeight: 'bold',
        }
      }, 'privacy@applytide.com')
    )
  );
}

module.exports = AccountDeletedEmail;
module.exports.default = AccountDeletedEmail;
