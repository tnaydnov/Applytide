const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link, Button } = require('@react-email/components');

function ReminderEmail({ 
  name = 'Alex',
  title = 'Technical Interview - Senior Software Engineer',
  description = 'System design round with the engineering team',
  dueDate = 'Tomorrow, Nov 5 at 2:00 PM',
  timeUntil = '18 hours',
  urgency = 'tomorrow',
  eventType = 'interview',
  actionUrl = 'https://applytide.com',
  aiPrepTips = null // Object with: company, companyInfo, prepTime, focusAreas [{ icon, title, description }], roadmap []
}) {
  
  // Urgency badge config
  const urgencyConfig = {
    'now': { emoji: '🚨', label: 'URGENT', bg: colors.coral },
    'today': { emoji: '⏰', label: 'DUE TODAY', bg: colors.coral },
    'tomorrow': { emoji: '📅', label: 'DUE TOMORROW', bg: colors.coralLight },
    'week': { emoji: '📌', label: 'THIS WEEK', bg: colors.coralLight },
    'future': { emoji: '🔔', label: 'UPCOMING', bg: colors.coralLight }
  };

  const config = urgencyConfig[urgency] || urgencyConfig['future'];

  return React.createElement(BaseEmail, { 
    previewText: `${title} - ${config.label}` 
  },
    // Hero Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      // Badge
      React.createElement('div', {
        style: {
          display: 'inline-block',
          background: config.bg,
          color: colors.bgDark,
          padding: '10px 24px',
          borderRadius: '24px',
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px',
        }
      }, `${config.emoji} ${config.label}`),
      
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          color: colors.textWhite,
          margin: '16px 0 12px 0',
          lineHeight: '1.2',
        }
      }, title),
      
      React.createElement(Text, {
        style: {
          fontSize: '18px',
          color: colors.textLight,
          margin: 0,
        }
      }, `Hey ${name}, this is coming up ${urgency === 'tomorrow' ? 'tomorrow' : 'soon'}!`)
    ),

    // Main Event Card
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '48px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }
    },
      // Icon
      React.createElement('div', { style: { textAlign: 'center', marginBottom: '24px' } },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '64px',
            height: '64px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
            fontSize: '32px',
          }
        }, '📋')
      ),

      // Description
      description && React.createElement(Text, {
        style: {
          color: colors.textLight,
          textAlign: 'center',
          lineHeight: '1.7',
          fontSize: '16px',
          marginBottom: '24px',
        }
      }, description),

      // Due Date & Time
      React.createElement('table', {
        style: { width: '100%', marginTop: '24px' }
      },
        React.createElement('tr', null,
          React.createElement('td', { style: { width: '50%', textAlign: 'center', padding: '16px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDark,
                borderRadius: '16px',
                padding: '16px',
              }
            },
              React.createElement('div', {
                style: { fontSize: '32px', marginBottom: '8px' }
              }, '�'),
              React.createElement(Text, {
                style: {
                  color: colors.textLight,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }
              }, 'DUE DATE'),
              React.createElement(Text, {
                style: {
                  color: colors.textWhite,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  margin: 0,
                }
              }, dueDate)
            )
          ),
          React.createElement('td', { style: { width: '50%', textAlign: 'center', padding: '16px' } },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDark,
                borderRadius: '16px',
                padding: '16px',
              }
            },
              React.createElement('div', {
                style: { fontSize: '32px', marginBottom: '8px' }
              }, '⏰'),
              React.createElement(Text, {
                style: {
                  color: colors.textLight,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }
              }, 'TIME LEFT'),
              React.createElement(Text, {
                style: {
                  color: colors.textWhite,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  margin: 0,
                }
              }, timeUntil)
            )
          )
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
          borderRadius: '32px',
          fontWeight: 'bold',
          fontSize: '16px',
          textDecoration: 'none',
          boxShadow: `0 4px 20px ${colors.coral}60`,
        }
      }, 'View Application →')
    ),

    // AI Prep Tips (only if provided)
    aiPrepTips && [
      // AI Header
      React.createElement(Section, {
        key: 'ai-header',
        style: {
          background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
          borderRadius: '24px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '48px',
          boxShadow: '0 8px 24px rgba(245, 143, 124, 0.3)',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '56px',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            backgroundColor: colors.bgDark,
            fontSize: '32px',
            marginBottom: '16px',
          }
        }, '✨'),
        React.createElement(Text, {
          style: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: colors.bgDark,
            margin: '16px 0 8px 0',
          }
        }, 'AI-Powered Interview Prep'),
        React.createElement(Text, {
          style: {
            fontSize: '16px',
            color: colors.bgDarkSecondary,
            margin: 0,
          }
        }, 'Personalized insights generated just for you')
      ),

      // Company Intelligence
      aiPrepTips.company && React.createElement(Section, {
        key: 'company',
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }
      },
        React.createElement('table', { style: { width: '100%' } },
          React.createElement('tr', null,
            React.createElement('td', { style: { verticalAlign: 'top', paddingRight: '16px' } },
              React.createElement('div', {
                style: {
                  display: 'inline-flex',
                  width: '48px',
                  height: '48px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  backgroundColor: colors.coral,
                  fontSize: '24px',
                }
              }, '🏢')
            ),
            React.createElement('td', null,
              React.createElement(Text, {
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: colors.textWhite,
                  margin: '0 0 8px 0',
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
          )
        ),
        aiPrepTips.companyInfo && React.createElement(Text, {
          style: {
            color: colors.textLight,
            fontSize: '14px',
            lineHeight: '1.7',
            marginTop: '16px',
            padding: '16px',
            backgroundColor: colors.bgDark,
            borderRadius: '12px',
          }
        }, aiPrepTips.companyInfo)
      ),

      // Prep Time Badge
      aiPrepTips.prepTime && React.createElement(Section, {
        key: 'prep-time',
        style: { textAlign: 'center', marginBottom: '32px' }
      },
        React.createElement('div', {
          style: {
            display: 'inline-block',
            background: colors.coralLight,
            color: colors.bgDark,
            padding: '12px 24px',
            borderRadius: '24px',
            fontWeight: 'bold',
            fontSize: '14px',
          }
        }, `⏱ Suggested Prep: ${aiPrepTips.prepTime}`)
      ),

      // Critical Focus Areas
      aiPrepTips.focusAreas && aiPrepTips.focusAreas.length > 0 && React.createElement(Section, {
        key: 'focus-areas',
        style: { marginBottom: '48px' }
      },
        React.createElement(Text, {
          style: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.textWhite,
            textAlign: 'center',
            marginBottom: '24px',
          }
        }, 'Critical Focus Areas'),
        React.createElement(Text, {
          style: {
            fontSize: '16px',
            color: colors.textLight,
            textAlign: 'center',
            marginBottom: '32px',
          }
        }, 'Master these topics to ace your interview'),

        // Grid of focus areas (2 columns)
        React.createElement('table', { style: { width: '100%' } },
          ...aiPrepTips.focusAreas.reduce((rows, area, index) => {
            if (index % 2 === 0) {
              const nextArea = aiPrepTips.focusAreas[index + 1];
              rows.push(
                React.createElement('tr', { key: `row-${index}` },
                  React.createElement('td', { 
                    style: { 
                      width: '50%', 
                      padding: '8px',
                      verticalAlign: 'top'
                    } 
                  },
                    React.createElement('div', {
                      style: {
                        backgroundColor: colors.bgDarkSecondary,
                        borderRadius: '16px',
                        padding: '20px',
                        height: '100%',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          display: 'inline-flex',
                          width: '40px',
                          height: '40px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          backgroundColor: colors.coral,
                          fontSize: '20px',
                          marginBottom: '12px',
                        }
                      }, area.icon || '📌'),
                      React.createElement(Text, {
                        style: {
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: colors.textWhite,
                          margin: '8px 0',
                        }
                      }, area.title),
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: 0,
                          lineHeight: '1.5',
                        }
                      }, area.description)
                    )
                  ),
                  nextArea ? React.createElement('td', { 
                    style: { 
                      width: '50%', 
                      padding: '8px',
                      verticalAlign: 'top'
                    } 
                  },
                    React.createElement('div', {
                      style: {
                        backgroundColor: colors.bgDarkSecondary,
                        borderRadius: '16px',
                        padding: '20px',
                        height: '100%',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          display: 'inline-flex',
                          width: '40px',
                          height: '40px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          backgroundColor: colors.coral,
                          fontSize: '20px',
                          marginBottom: '12px',
                        }
                      }, nextArea.icon || '📌'),
                      React.createElement(Text, {
                        style: {
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: colors.textWhite,
                          margin: '8px 0',
                        }
                      }, nextArea.title),
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: 0,
                          lineHeight: '1.5',
                        }
                      }, nextArea.description)
                    )
                  ) : React.createElement('td', { style: { width: '50%', padding: '8px' } })
                )
              );
            }
            return rows;
          }, [])
        )
      ),

      // Preparation Roadmap
      aiPrepTips.roadmap && aiPrepTips.roadmap.length > 0 && React.createElement(Section, {
        key: 'roadmap',
        style: { marginBottom: '48px' }
      },
        React.createElement(Text, {
          style: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.textWhite,
            textAlign: 'center',
            marginBottom: '24px',
          }
        }, 'Your Preparation Roadmap'),
        React.createElement(Text, {
          style: {
            fontSize: '16px',
            color: colors.textLight,
            textAlign: 'center',
            marginBottom: '32px',
          }
        }, 'Follow these steps to ace your interview'),

        // Roadmap steps
        ...aiPrepTips.roadmap.map((step, index) => 
          React.createElement('div', {
            key: `step-${index}`,
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }
          },
            React.createElement('div', {
              style: {
                flex: '0 0 auto',
                width: '40px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: index % 2 === 0 ? colors.coral : colors.coralLight,
                color: colors.bgDark,
                fontWeight: 'bold',
                fontSize: '18px',
                marginRight: '16px',
              }
            }, (index + 1).toString()),
            React.createElement(Text, {
              style: {
                flex: 1,
                backgroundColor: colors.bgDarkSecondary,
                borderRadius: '16px',
                padding: '16px 20px',
                color: colors.textLight,
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.6',
              }
            }, step)
          )
        )
      ),

      // Success Footer
      React.createElement(Section, {
        key: 'success-footer',
        style: {
          background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
          borderRadius: '24px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(245, 143, 124, 0.3)',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '56px',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            backgroundColor: colors.bgDark,
            fontSize: '32px',
            marginBottom: '16px',
          }
        }, '🎯'),
        React.createElement(Text, {
          style: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.bgDark,
            margin: '16px 0 8px 0',
          }
        }, "You've Got This!"),
        React.createElement(Text, {
          style: {
            fontSize: '16px',
            color: colors.bgDarkSecondary,
            margin: 0,
          }
        }, 'Follow this plan and nail your interview')
      )
    ],

    // Footer Tip
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
          fontSize: '14px',
          margin: 0,
        }
      }, '💡 Pro Tip: Set multiple reminders to never miss important deadlines!')
    )
  );
}

module.exports = { default: ReminderEmail };
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
