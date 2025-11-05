const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail');
const { Text, Section, Link } = require('@react-email/components');

function RecoverySuccessEmail({ name = 'there' }) {
  return React.createElement(BaseEmail, {
    previewText: 'Your Applytide account has been recovered - Welcome back!'
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
      }, '✅'),
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
      }, '✅ Account Recovered'),
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, 'Welcome Back!'),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Hi ${name}, your account has been successfully recovered!`)
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
      React.createElement(Text, {
        style: {
          fontSize: '28px',
          fontWeight: 'bold',
          color: colors.textWhite,
          textAlign: 'center',
          marginBottom: '24px',
        }
      }, 'Great News!'),
      
      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDark,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
        }
      },
        React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
          React.createElement('tr', null,
            React.createElement('td', { style: { paddingRight: '16px', verticalAlign: 'middle', width: '40px' } },
              React.createElement('span', { style: { fontSize: '32px', color: colors.coral } }, '✓')
            ),
            React.createElement('td', { style: { verticalAlign: 'middle' } },
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'Account deletion cancelled')
            )
          )
        )
      ),

      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDark,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
        }
      },
        React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
          React.createElement('tr', null,
            React.createElement('td', { style: { paddingRight: '16px', verticalAlign: 'middle', width: '40px' } },
              React.createElement('span', { style: { fontSize: '32px', color: colors.coral } }, '✓')
            ),
            React.createElement('td', { style: { verticalAlign: 'middle' } },
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'All your data has been preserved')
            )
          )
        )
      ),

      React.createElement('div', {
        style: {
          backgroundColor: colors.bgDark,
          borderRadius: '16px',
          padding: '16px',
        }
      },
        React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
          React.createElement('tr', null,
            React.createElement('td', { style: { paddingRight: '16px', verticalAlign: 'middle', width: '40px' } },
              React.createElement('span', { style: { fontSize: '32px', color: colors.coral } }, '✓')
            ),
            React.createElement('td', { style: { verticalAlign: 'middle' } },
              React.createElement(Text, {
                style: {
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: 0,
                }
              }, 'You can continue using Applytide')
            )
          )
        )
      )
    ),

    // Dashboard CTA
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '64px' } },
      React.createElement(Link, {
        href: 'https://applytide.com/dashboard',
        style: {
          display: 'inline-block',
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          color: colors.textWhite,
          padding: '18px 48px',
          borderRadius: '24px',
          fontWeight: 'bold',
          fontSize: '18px',
          textDecoration: 'none',
        }
      }, 'Go to Dashboard →')
    ),

    // Security Warning
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '48px',
      }
    },
      React.createElement('div', { style: { textAlign: 'center', marginBottom: '32px' } },
        React.createElement('div', {
          style: {
            width: '56px',
            height: '56px',
            backgroundColor: colors.coralLight,
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '28px',
          }
        }, '🛡️'),
        React.createElement(Text, {
          style: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: colors.textWhite,
            marginBottom: '12px',
          }
        }, 'Security Notice'),
        React.createElement(Text, {
          style: {
            color: colors.textLight,
            lineHeight: '1.7',
            maxWidth: '600px',
            margin: '0 auto',
          }
        }, "If you didn't request this account recovery, please take these steps immediately:")
      ),

      // Security Steps Grid
      React.createElement('table', { width: '100%', cellSpacing: '0', cellPadding: '0' },
        React.createElement('tr', null,
          React.createElement('td', { style: { padding: '12px', width: '33.33%' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coral,
                  color: colors.textWhite,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                }
              }, '1'),
              React.createElement('div', {
                style: {
                  backgroundColor: colors.bgDark,
                  borderRadius: '16px',
                  padding: '16px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '40px',
                    height: '40px',
                    backgroundColor: colors.coral,
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    fontSize: '20px',
                  }
                }, '🔑'),
                React.createElement(Text, {
                  style: {
                    fontWeight: 'bold',
                    color: colors.textWhite,
                    marginBottom: '8px',
                  }
                }, 'Change password'),
                React.createElement(Text, {
                  style: {
                    fontSize: '14px',
                    color: colors.textLight,
                    margin: 0,
                  }
                }, 'Update it to a strong, unique password')
              )
            )
          ),
          React.createElement('td', { style: { padding: '12px', width: '33.33%' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coralLight,
                  color: colors.bgDark,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                }
              }, '2'),
              React.createElement('div', {
                style: {
                  backgroundColor: colors.bgDark,
                  borderRadius: '16px',
                  padding: '16px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '40px',
                    height: '40px',
                    backgroundColor: colors.coralLight,
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    fontSize: '20px',
                  }
                }, '👁️'),
                React.createElement(Text, {
                  style: {
                    fontWeight: 'bold',
                    color: colors.textWhite,
                    marginBottom: '8px',
                  }
                }, 'Review activity'),
                React.createElement(Text, {
                  style: {
                    fontSize: '14px',
                    color: colors.textLight,
                    margin: 0,
                  }
                }, 'Check for any suspicious changes')
              )
            )
          ),
          React.createElement('td', { style: { padding: '12px', width: '33.33%' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('div', {
                style: {
                  width: '48px',
                  height: '48px',
                  backgroundColor: colors.coral,
                  color: colors.textWhite,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                }
              }, '3'),
              React.createElement('div', {
                style: {
                  backgroundColor: colors.bgDark,
                  borderRadius: '16px',
                  padding: '16px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '40px',
                    height: '40px',
                    backgroundColor: colors.coral,
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    fontSize: '20px',
                  }
                }, '📧'),
                React.createElement(Text, {
                  style: {
                    fontWeight: 'bold',
                    color: colors.textWhite,
                    marginBottom: '8px',
                  }
                }, 'Contact support'),
                React.createElement(Text, {
                  style: {
                    fontSize: '14px',
                    color: colors.textLight,
                    margin: 0,
                  }
                }, 'Email us at security@applytide.com')
              )
            )
          )
        )
      )
    ),

    // Welcome Back Message
    React.createElement(Section, {
      style: {
        background: `linear-gradient(135deg, ${colors.coralLight}, ${colors.coral})`,
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
      }
    },
      React.createElement('div', {
        style: {
          fontSize: '48px',
          marginBottom: '16px',
        }
      }, '🎉'),
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.bgDark,
          marginBottom: '12px',
        }
      }, "We're thrilled to have you back!"),
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.bgDarkSecondary,
          lineHeight: '1.7',
          maxWidth: '600px',
          margin: '0 auto',
        }
      }, 'Continue your job search journey right where you left off. Your applications, documents, and reminders are all waiting for you.')
    ),

    // Footer Message
    React.createElement(Section, {
      style: {
        textAlign: 'center',
        paddingTop: '32px',
        marginTop: '48px',
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
      }
    },
      React.createElement(Text, {
        style: {
          color: colors.textLight,
        }
      }, 'Questions about your account? Contact '),
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

module.exports = RecoverySuccessEmail;
module.exports.default = RecoverySuccessEmail;
