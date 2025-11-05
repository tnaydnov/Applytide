const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail');
const { Text, Section, Link } = require('@react-email/components');

function ReminderEmail({ 
  name = 'there',
  title = 'Event Title',
  description = '',
  dueDate = 'Date',
  timeUntil = 'Time',
  urgency = 'future',
  eventType = 'general',
  actionUrl = 'https://applytide.com',
  aiPrepTips = null // Object with company, companyInfo, prepTime, focusAreas, roadmap
}) {
  
  // Urgency configs
  const urgencyConfig = {
    'now': { emoji: '🚨', title: 'HAPPENING NOW', message: 'This is happening right now!' },
    'today': { emoji: '⏰', title: 'DUE TODAY', message: 'This is coming up today!' },
    'tomorrow': { emoji: '📅', title: 'TOMORROW', message: 'This is coming up tomorrow!' },
    'week': { emoji: '📌', title: 'THIS WEEK', message: `Coming up in ${timeUntil}` },
    'future': { emoji: '🔔', title: 'UPCOMING', message: `Coming up in ${timeUntil}` }
  };

  const eventIcons = {
    'interview': '🎯',
    'deadline': '⚡',
    'follow-up': '📧',
    'general': '📋'
  };

  const config = urgencyConfig[urgency] || urgencyConfig['future'];
  const eventIcon = eventIcons[eventType] || '📋';

  return React.createElement(BaseEmail, { 
    previewText: `${title} - ${config.title}` 
  },
    // Hero Badge Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      React.createElement('div', {
        style: {
          display: 'inline-block',
          backgroundColor: colors.coralLight,
          color: colors.bgDark,
          padding: '8px 20px',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '16px',
        }
      }, `${config.emoji} ${config.title}`),
      
      React.createElement(Text, {
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '24px 0 12px 0',
        }
      }, title),
      
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Hey ${name}, ${config.message}`)
    ),

    // Main Event Card
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '48px',
      }
    },
      React.createElement('div', { style: { textAlign: 'center', marginBottom: '24px' } },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '64px',
            height: '64px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
            fontSize: '32px',
          }
        }, eventIcon)
      ),

      description && React.createElement(Text, {
        style: {
          color: colors.textLight,
          textAlign: 'center',
          lineHeight: '1.7',
          marginBottom: '32px',
        }
      }, description),

      // Stats Grid
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          maxWidth: '400px',
          margin: '0 auto',
        }
      },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', {
            style: {
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              backgroundColor: colors.bgDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '32px',
            }
          }, '📅'),
          React.createElement(Text, {
            style: {
              fontSize: '12px',
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '4px',
            }
          }, 'Due Date'),
          React.createElement(Text, {
            style: {
              color: colors.textWhite,
              fontWeight: 'bold',
              margin: 0,
            }
          }, dueDate)
        ),
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', {
            style: {
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              backgroundColor: colors.bgDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '32px',
            }
          }, '⏱️'),
          React.createElement(Text, {
            style: {
              fontSize: '12px',
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '4px',
            }
          }, 'Time Left'),
          React.createElement(Text, {
            style: {
              color: colors.textWhite,
              fontWeight: 'bold',
              margin: 0,
            }
          }, timeUntil)
        )
      )
    ),

    // CTA Button
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '64px' } },
      React.createElement(Link, {
        href: actionUrl,
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '16px 32px',
          borderRadius: '24px',
          fontWeight: 'bold',
          textDecoration: 'none',
          boxShadow: `0 4px 20px ${colors.coral}60`,
        }
      }, 'View Application →')
    ),

    // AI Prep Tips (if provided)
    aiPrepTips && React.createElement(React.Fragment, null,
      // AI Prep Header
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '48px',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '56px',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            backgroundColor: colors.bgDark,
            marginBottom: '16px',
            fontSize: '28px',
          }
        }, '✨'),
        React.createElement(Text, {
          style: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: colors.bgDark,
            marginBottom: '8px',
          }
        }, 'AI-Powered Interview Prep'),
        React.createElement(Text, {
          style: {
            color: colors.bgDarkSecondary,
            margin: 0,
          }
        }, 'Personalized insights generated just for you')
      ),

      // Company Intelligence
      aiPrepTips.company && React.createElement(Section, {
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '48px',
        }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }
        },
          React.createElement('div', {
            style: {
              width: '48px',
              height: '48px',
              backgroundColor: colors.coral,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }
          }, '🏢'),
          React.createElement('div', null,
            React.createElement(Text, {
              style: {
                fontSize: '20px',
                fontWeight: 'bold',
                color: colors.textWhite,
                margin: '0 0 4px 0',
              }
            }, 'Company Intelligence'),
            React.createElement(Text, {
              style: {
                fontSize: '14px',
                color: colors.textLight,
                margin: 0,
              }
            }, `What you need to know about ${aiPrepTips.company}`)
          )
        ),
        React.createElement(Text, {
          style: {
            color: colors.textLight,
            lineHeight: '1.7',
            margin: 0,
          }
        }, aiPrepTips.companyInfo || 'Company information will be displayed here.')
      ),

      // Prep Time Badge
      aiPrepTips.prepTime && React.createElement(Section, {
        style: {
          textAlign: 'center',
          marginBottom: '48px',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: colors.coralLight,
            padding: '12px 24px',
            borderRadius: '24px',
          }
        },
          React.createElement('span', { style: { fontSize: '20px' } }, '⏱️'),
          React.createElement(Text, {
            style: {
              color: colors.bgDark,
              fontWeight: 'bold',
              margin: 0,
            }
          }, `Suggested Prep: ${aiPrepTips.prepTime}`)
        )
      ),

      // Focus Areas
      aiPrepTips.focusAreas && React.createElement(React.Fragment, null,
        React.createElement(Section, { style: { textAlign: 'center', marginBottom: '40px' } },
          React.createElement(Text, {
            style: {
              fontSize: '32px',
              fontWeight: 'bold',
              color: colors.textWhite,
              marginBottom: '8px',
            }
          }, 'Critical Focus Areas'),
          React.createElement(Text, {
            style: {
              color: colors.textLight,
              margin: 0,
            }
          }, 'Master these topics to ace your interview')
        ),
        React.createElement(Section, {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '48px',
          }
        },
          aiPrepTips.focusAreas.map((area, idx) =>
            React.createElement('div', {
              key: idx,
              style: {
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '12px',
                padding: '20px',
              }
            },
              React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '40px',
                    height: '40px',
                    backgroundColor: idx % 2 === 0 ? colors.coral : colors.coralLight,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }
                }, area.icon || '📌'),
                React.createElement(Text, {
                  style: {
                    fontWeight: 'bold',
                    color: colors.textWhite,
                    margin: 0,
                  }
                }, area.title)
              ),
              React.createElement(Text, {
                style: {
                  fontSize: '14px',
                  color: colors.textLight,
                  margin: 0,
                }
              }, area.description)
            )
          )
        )
      ),

      // Roadmap
      aiPrepTips.roadmap && React.createElement(React.Fragment, null,
        React.createElement(Section, { style: { textAlign: 'center', marginBottom: '32px' } },
          React.createElement(Text, {
            style: {
              fontSize: '32px',
              fontWeight: 'bold',
              color: colors.textWhite,
              marginBottom: '8px',
            }
          }, 'Your Preparation Roadmap'),
          React.createElement(Text, {
            style: {
              color: colors.textLight,
              margin: 0,
            }
          }, 'Follow these steps to ace your interview')
        ),
        React.createElement(Section, { style: { marginBottom: '48px' } },
          aiPrepTips.roadmap.map((step, idx) =>
            React.createElement('div', {
              key: idx,
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px',
              }
            },
              React.createElement('div', {
                style: {
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: idx % 2 === 0 ? colors.coral : colors.coralLight,
                  color: idx % 2 === 0 ? colors.textWhite : colors.bgDark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  flexShrink: 0,
                }
              }, idx + 1),
              React.createElement('div', {
                style: {
                  flex: 1,
                  backgroundColor: colors.bgDarkSecondary,
                  borderRadius: '16px',
                  padding: '16px 24px',
                }
              },
                React.createElement(Text, {
                  style: {
                    color: colors.textLight,
                    lineHeight: '1.7',
                    margin: 0,
                  }
                }, step)
              )
            )
          )
        )
      ),

      // Success Footer
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '56px',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            backgroundColor: colors.bgDark,
            marginBottom: '16px',
            fontSize: '28px',
          }
        }, '🎯'),
        React.createElement(Text, {
          style: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: colors.bgDark,
            marginBottom: '8px',
          }
        }, "You've Got This!"),
        React.createElement(Text, {
          style: {
            color: colors.bgDarkSecondary,
            margin: 0,
          }
        }, 'Follow this plan and nail your interview')
      )
    ),

    // Footer Tip
    React.createElement(Section, {
      style: {
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
        paddingTop: '32px',
        marginTop: '48px',
        textAlign: 'center',
      }
    },
      React.createElement(Text, {
        style: {
          color: colors.textLight,
        }
      },
        React.createElement('span', { style: { fontWeight: 'bold', color: colors.textWhite } }, '💡 Pro Tip: '),
        'Set multiple reminders to never miss important deadlines!'
      )
    )
  );
}

module.exports = ReminderEmail;
module.exports.default = ReminderEmail;
