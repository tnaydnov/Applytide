const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Link } = require('@react-email/components');

function ReminderEmail({
  name,
  title,
  description,
  dueDate,
  timeUntil,
  urgency = 'future',
  eventType = 'interview',
  actionUrl,
  company,
  aiPrepTips
}) {

  const urgencyConfig = {
    'now': { label: 'URGENT', bgColor: '#ef4444' },
    'today': { label: 'TODAY', bgColor: '#f97316' },
    'tomorrow': { label: 'Tomorrow', bgColor: '#FFB5A7' },
    'week': { label: 'THIS WEEK', bgColor: '#FFB5A7' },
    'future': { label: 'UPCOMING', bgColor: '#FFB5A7' }
  };

  const config = urgencyConfig[urgency] || urgencyConfig['future'];

  const subCopy = {
    now: `Hey ${name}, this is happening now or any minute.`,
    today: `Hey ${name}, this is happening today.`,
    tomorrow: `Hey ${name}, this is coming up tomorrow!`,
    week: `Hey ${name}, this is happening this week.`,
    future: `Hey ${name}, here's a heads-up for your upcoming event.`
  };

  const cardStyle = {
    backgroundColor: colors.bgDarkCard,
    borderRadius: '16px',
    padding: '24px',
  };

  const headingStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.textWhite,
    margin: '0 0 8px 0',
    textAlign: 'center',
  };

  const subheadingStyle = {
    fontSize: '15px',
    color: colors.textLight,
    margin: '0 0 28px 0',
    textAlign: 'center',
  };

  const iconBadgeStyle = {
    width: '48px',
    height: '48px',
    backgroundColor: colors.coral,
    borderRadius: '12px',
    textAlign: 'center',
    lineHeight: '48px',
    fontSize: '24px',
  };

  return React.createElement(BaseEmail, { previewText: `${title} - ${config.label}` },

    // Hero Section
    React.createElement('table', {
      role: 'presentation',
      width: '100%',
      cellPadding: '0',
      cellSpacing: '0',
      border: '0',
      style: { marginBottom: '32px' }
    },
      React.createElement('tr', null,
        React.createElement('td', { align: 'center' },
          React.createElement('table', {
            role: 'presentation',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '20px' }
          },
            React.createElement('tr', null,
              React.createElement('td', {
                style: {
                  backgroundColor: config.bgColor,
                  color: urgency === 'now' || urgency === 'today' ? '#ffffff' : colors.bgDark,
                  padding: '10px 28px',
                  borderRadius: '24px',
                  fontWeight: '700',
                  fontSize: '13px',
                  textAlign: 'center',
                  letterSpacing: '0.5px',
                }
              }, `📅 ${config.label}`)
            )
          ),
          
          React.createElement(Text, {
            style: {
              fontSize: '38px',
              fontWeight: '700',
              color: colors.textWhite,
              margin: '0 0 12px 0',
              textAlign: 'center',
              lineHeight: '1.2',
            }
          }, title),

          React.createElement(Text, {
            style: {
              fontSize: '16px',
              color: colors.textLight,
              margin: '0',
              textAlign: 'center',
            }
          }, subCopy[urgency] || subCopy.future)
        )
      )
    ),

    // Main Event Card
    React.createElement('table', {
      role: 'presentation',
      width: '100%',
      cellPadding: '0',
      cellSpacing: '0',
      border: '0',
      style: { marginBottom: '32px' }
    },
      React.createElement('tr', null,
        React.createElement('td', {
          style: {
            backgroundColor: colors.bgDarkCard,
            borderRadius: '16px',
            padding: '32px',
            border: `1px solid ${colors.bgDarkSecondary}`,
          }
        },
          // Icon
          description && React.createElement('table', {
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '20px' }
          },
            React.createElement('tr', null,
              React.createElement('td', { align: 'center' },
                React.createElement('div', {
                  style: {
                    width: '56px',
                    height: '56px',
                    backgroundColor: colors.coral,
                    borderRadius: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 16px',
                  }
                })
              )
            )
          ),

          description && React.createElement(Text, {
            style: {
              color: colors.textLight,
              textAlign: 'center',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: '0 0 32px 0',
            }
          }, description),

          React.createElement('table', {
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
          },
            React.createElement('tr', null,
              React.createElement('td', {
                width: '50%',
                className: 'two-col two-col-padding',
                style: { paddingRight: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0',
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        backgroundColor: colors.bgDark,
                        borderRadius: '12px',
                        padding: '24px 20px',
                        textAlign: 'center',
                        borderTop: `4px solid ${colors.coral}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          color: colors.coral,
                          fontSize: '18px',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          margin: '0 0 8px 0',
                        }
                      }, 'DUE DATE'),
                      React.createElement(Text, {
                        style: {
                          color: colors.textWhite,
                          fontSize: '22px',
                          fontWeight: '700',
                          margin: '0',
                        }
                      }, dueDate)
                    )
                  )
                )
              ),
              
              React.createElement('td', {
                width: '50%',
                className: 'two-col',
                style: { paddingLeft: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0',
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        backgroundColor: colors.bgDark,
                        borderRadius: '12px',
                        padding: '24px 20px',
                        textAlign: 'center',
                        borderTop: `4px solid ${colors.coralLight}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          color: colors.coralLight,
                          fontSize: '18px',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          margin: '0 0 8px 0',
                        }
                      }, 'TIME LEFT'),
                      React.createElement(Text, {
                        style: {
                          color: colors.textWhite,
                          fontSize: '22px',
                          fontWeight: '700',
                          margin: '0',
                        }
                      }, timeUntil)
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),

    // CTA Button
    React.createElement('table', {
      role: 'presentation',
      width: '100%',
      cellPadding: '0',
      cellSpacing: '0',
      border: '0',
      style: { marginBottom: '48px' }
    },
      React.createElement('tr', null,
        React.createElement('td', { align: 'center' },
          React.createElement(Link, {
            href: actionUrl,
            style: {
              display: 'inline-block',
              backgroundColor: colors.coral,
              color: '#ffffff',
              padding: '16px 48px',
              borderRadius: '28px',
              fontWeight: '600',
              fontSize: '15px',
              textDecoration: 'none',
            }
          }, 'View Application →')
        )
      )
    ),

    // AI Prep Section
    aiPrepTips && React.createElement(React.Fragment, null,
      // AI Prep Header
      React.createElement('table', {
        role: 'presentation',
        width: '100%',
        cellPadding: '0',
        cellSpacing: '0',
        border: '0',
        style: { marginBottom: '32px' }
      },
        React.createElement('tr', null,
          React.createElement('td', {
            style: {
              background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
              borderRadius: '16px',
              padding: '40px 32px',
              textAlign: 'center',
            }
          },
            React.createElement(Text, {
              style: {
                fontSize: '38px',
                fontWeight: '800',
                color: colors.bgDark,
                margin: '0 0 8px 0',
              }
            }, 'AI-Powered Interview Prep'),
            React.createElement(Text, {
              style: {
                fontSize: '20px',
                color: colors.bgDark,
                margin: '0',
                fontWeight: '500',
              }
            }, 'Personalized insights generated just for you')
          )
        )
      ),

      // Company Intelligence
      aiPrepTips.company && aiPrepTips.companyInfo && React.createElement('table', {
        role: 'presentation',
        width: '100%',
        cellPadding: '0',
        cellSpacing: '0',
        border: '0',
        style: { marginBottom: '32px' }
      },
        React.createElement('tr', null,
          React.createElement('td', {
            style: {
              ...cardStyle,
              borderLeft: `5px solid ${colors.coral}`,
            }
          },
            React.createElement('table', {
              role: 'presentation',
              width: '100%',
              cellPadding: '0',
              cellSpacing: '0',
              border: '0',
              style: { marginBottom: '12px' }
            },
              React.createElement('tr', null,
                React.createElement('td', {
                  width: '48',
                  style: { verticalAlign: 'middle', paddingRight: '16px' }
                },
                  React.createElement('div', {
                    style: {
                      width: '48px',
                      height: '48px',
                      backgroundColor: colors.coral,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      textAlign: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }
                  })
                ),
                React.createElement('td', { style: { verticalAlign: 'middle' } },
                  React.createElement(Text, {
                    style: {
                      fontSize: '22px',
                      fontWeight: '700',
                      color: colors.textWhite,
                      margin: '0',
                    }
                  }, 'Company Intelligence')
                )
              )
            ),
            React.createElement(Text, {
              style: {
                fontSize: '14px',
                color: colors.textLight,
                margin: '0 0 16px 0',
                opacity: '0.85',
              }
            }, `What you need to know about ${aiPrepTips.company}`),
            React.createElement(Text, {
              style: {
                color: colors.textLight,
                fontSize: '15px',
                lineHeight: '1.7',
                margin: '0',
              }
            }, aiPrepTips.companyInfo)
          )
        )
      ),

      // Prep Time Badge
      aiPrepTips.prepTime && React.createElement('table', {
        role: 'presentation',
        width: '100%',
        cellPadding: '0',
        cellSpacing: '0',
        border: '0',
        style: { marginBottom: '32px' }
      },
        React.createElement('tr', null,
          React.createElement('td', { align: 'center' },
            React.createElement('table', {
              role: 'presentation',
              cellPadding: '0',
              cellSpacing: '0',
              border: '0'
            },
              React.createElement('tr', null,
                React.createElement('td', {
                  style: {
                    backgroundColor: colors.coralLight,
                    color: colors.bgDark,
                    padding: '14px 32px',
                    borderRadius: '24px',
                    fontWeight: '700',
                    fontSize: '15px',
                  }
                }, `⏱️ Suggested Prep: ${aiPrepTips.prepTime}`)
              )
            )
          )
        )
      ),

      // Focus Areas Section
      aiPrepTips.focusAreas && aiPrepTips.focusAreas.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(Text, { style: headingStyle }, 'Critical Focus Areas'),
        React.createElement(Text, { style: subheadingStyle }, 'Master these topics to ace your interview'),

        ...Array.from({ length: Math.ceil(aiPrepTips.focusAreas.length / 2) }, (_, rowIndex) => {
          const leftArea = aiPrepTips.focusAreas[rowIndex * 2];
          const rightArea = aiPrepTips.focusAreas[rowIndex * 2 + 1];
          
          return React.createElement('table', {
            key: `focus-row-${rowIndex}`,
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '16px' }
          },
            React.createElement('tr', null,
              React.createElement('td', {
                width: '50%',
                className: 'two-col two-col-padding',
                style: { paddingRight: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', { style: cardStyle },
                      React.createElement('table', {
                        role: 'presentation',
                        width: '100%',
                        cellPadding: '0',
                        cellSpacing: '0',
                        border: '0',
                        style: { marginBottom: '12px' }
                      },
                        React.createElement('tr', null,
                          React.createElement('td', {
                            width: '48',
                            style: { verticalAlign: 'middle', paddingRight: '12px' }
                          },
                            React.createElement('div', {
                              style: {
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: colors.coral,
                                display: 'inline-flex',
                                alignItems: 'center',
                                textAlign: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                              }
                            })
                          ),
                          React.createElement('td', { style: { verticalAlign: 'middle' } },
                            React.createElement(Text, {
                              style: {
                                fontSize: '18px',
                                fontWeight: '700',
                                color: colors.textWhite,
                                margin: '0',
                              }
                            }, leftArea.title)
                          )
                        )
                      ),
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, leftArea.description)
                    )
                  )
                )
              ),
              
              rightArea ? React.createElement('td', {
                width: '50%',
                className: 'two-col',
                style: { paddingLeft: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', { style: cardStyle },
                      React.createElement('table', {
                        role: 'presentation',
                        width: '100%',
                        cellPadding: '0',
                        cellSpacing: '0',
                        border: '0',
                        style: { marginBottom: '12px' }
                      },
                        React.createElement('tr', null,
                          React.createElement('td', {
                            width: '48',
                            style: { verticalAlign: 'middle', paddingRight: '12px' }
                          },
                            React.createElement('div', {
                              style: {
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: colors.coral,
                                display: 'inline-flex',
                                alignItems: 'center',
                                textAlign: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                              }
                            })
                          ),
                          React.createElement('td', { style: { verticalAlign: 'middle' } },
                            React.createElement(Text, {
                              style: {
                                fontSize: '18px',
                                fontWeight: '700',
                                color: colors.textWhite,
                                margin: '0',
                              }
                            }, rightArea.title)
                          )
                        )
                      ),
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, rightArea.description)
                    )
                  )
                )
              ) : React.createElement('td', { width: '50%', className: 'two-col', style: { paddingLeft: '12px' } })
            )
          );
        })
      ),

      // Preparation Tips
      aiPrepTips.tips && aiPrepTips.tips.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { height: '32px' } }),
        React.createElement(Text, { style: headingStyle }, 'Preparation Tips'),
        React.createElement(Text, { style: subheadingStyle }, 'Essential tips to maximize your preparation'),

        ...Array.from({ length: Math.ceil(aiPrepTips.tips.length / 2) }, (_, rowIndex) => {
          const leftTip = aiPrepTips.tips[rowIndex * 2];
          const rightTip = aiPrepTips.tips[rowIndex * 2 + 1];
          
          return React.createElement('table', {
            key: `tip-row-${rowIndex}`,
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '16px' }
          },
            React.createElement('tr', null,
              React.createElement('td', {
                width: '50%',
                className: 'two-col two-col-padding',
                style: { paddingRight: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        ...cardStyle,
                        borderLeft: `4px solid ${colors.coral}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, leftTip)
                    )
                  )
                )
              ),
              
              rightTip ? React.createElement('td', {
                width: '50%',
                className: 'two-col',
                style: { paddingLeft: '12px', verticalAlign: 'top' }
              },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        ...cardStyle,
                        borderLeft: `4px solid ${colors.coral}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          fontSize: '14px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, rightTip)
                    )
                  )
                )
              ) : React.createElement('td', { width: '50%', className: 'two-col', style: { paddingLeft: '12px' } })
            )
          );
        })
      ),

      // Preparation Roadmap
      aiPrepTips.roadmap && aiPrepTips.roadmap.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { height: '32px' } }),
        React.createElement(Text, { style: headingStyle }, 'Your Preparation Roadmap'),
        React.createElement(Text, { style: subheadingStyle }, 'Follow these steps to ace your interview'),

        ...aiPrepTips.roadmap.map((step, idx) =>
          React.createElement('table', {
            key: `step-${idx}`,
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '16px' }
          },
            React.createElement('tr', null,
              React.createElement('td', { width: '48', style: { verticalAlign: 'top', paddingTop: '4px' } },
                React.createElement('table', {
                  role: 'presentation',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        width: '40px',
                        height: '40px',
                        background: idx % 2 === 0 ? colors.coral : colors.coralLight,
                        color: idx % 2 === 0 ? '#ffffff' : colors.bgDark,
                        fontWeight: '700',
                        fontSize: '16px',
                        textAlign: 'center',
                        borderRadius: '10px',
                        lineHeight: '40px',
                      }
                    }, (idx + 1).toString())
                  )
                )
              ),
              React.createElement('td', { style: { paddingLeft: '16px' } },
                React.createElement('table', {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', { style: cardStyle },
                      React.createElement(Text, {
                        style: {
                          color: colors.textLight,
                          fontSize: '15px',
                          lineHeight: '1.6',
                          margin: '0'
                        }
                      }, step)
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Success Footer
      React.createElement('table', {
        role: 'presentation',
        width: '100%',
        cellPadding: '0',
        cellSpacing: '0',
        border: '0',
        style: { marginTop: '48px' }
      },
        React.createElement('tr', null,
          React.createElement('td', {
            style: {
              background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
              borderRadius: '16px',
              padding: '48px 32px',
              textAlign: 'center',
            }
          },
            React.createElement(Text, {
              style: {
                fontSize: '32px',
                fontWeight: '800',
                color: colors.bgDark,
                margin: '0 0 10px 0',
              }
            }, "You've Got This!"),
            React.createElement(Text, {
              style: {
                fontSize: '16px',
                color: colors.bgDark,
                margin: '0',
                fontWeight: '500',
              }
            }, 'Follow this plan and nail your interview')
          )
        )
      )
    ),

    // Footer Tip
    React.createElement('table', {
      role: 'presentation',
      width: '100%',
      cellPadding: '0',
      cellSpacing: '0',
      border: '0',
      style: {
        borderTop: `1px solid ${colors.bgDarkCard}`,
        paddingTop: '32px',
        marginTop: '48px',
      }
    },
      React.createElement('tr', null,
        React.createElement('td', { style: { textAlign: 'center' } },
          React.createElement(Text, {
            style: {
              fontSize: '14px',
              color: colors.textLight,
              margin: '0',
              lineHeight: '1.6',
            }
          },
            React.createElement('span', { style: { fontWeight: '700', color: colors.textWhite } }, '💡 Pro Tip: '),
            'Set multiple reminders to never miss important deadlines'
          )
        )
      )
    )
  );
}

module.exports = { default: ReminderEmail };