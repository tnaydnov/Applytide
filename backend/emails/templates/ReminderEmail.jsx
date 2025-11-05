const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

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
    'now': { label: 'URGENT', bgColor: '#dc2626' },
    'today': { label: 'TODAY', bgColor: '#ea580c' },
    'tomorrow': { label: 'TOMORROW', bgColor: '#f59e0b' },
    'week': { label: 'THIS WEEK', bgColor: '#10b981' },
    'future': { label: 'UPCOMING', bgColor: '#6366f1' }
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
    backgroundColor: colors.bgDarkSecondary,
    borderRadius: '12px',
    padding: '20px',
  };

  const headingStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: colors.textWhite,
    margin: '0 0 8px 0',
    textAlign: 'center',
  };

  const subheadingStyle = {
    fontSize: '14px',
    color: colors.textLight,
    margin: '0 0 20px 0',
    textAlign: 'center',
  };

  return React.createElement(BaseEmail, { previewText: `${title} - ${config.label}` },

    // Hero Section
    React.createElement('table', {
      role: 'presentation',
      width: '100%',
      cellPadding: '0',
      cellSpacing: '0',
      border: '0',
      style: { marginBottom: '24px' }
    },
      React.createElement('tr', null,
        React.createElement('td', { align: 'center' },
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
                  backgroundColor: config.bgColor,
                  color: '#ffffff',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontWeight: '700',
                  fontSize: '12px',
                  letterSpacing: '0.5px',
                }
              }, config.label)
            )
          ),
          
          React.createElement(Text, {
            style: {
              fontSize: '28px',
              fontWeight: '700',
              color: colors.textWhite,
              margin: '0 0 12px 0',
              textAlign: 'center',
            }
          }, title),

          React.createElement(Text, {
            style: {
              fontSize: '15px',
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
      style: { marginBottom: '24px' }
    },
      React.createElement('tr', null,
        React.createElement('td', {
          style: {
            backgroundColor: colors.bgDarkSecondary,
            borderRadius: '12px',
            padding: '24px',
            border: `2px solid ${colors.coral}`,
          }
        },
          description && React.createElement(Text, {
            style: {
              color: colors.textLight,
              textAlign: 'center',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 24px 0',
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
                style: { paddingRight: '8px', verticalAlign: 'top' }
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
                        borderRadius: '8px',
                        padding: '20px 16px',
                        textAlign: 'center',
                        borderTop: `3px solid ${colors.coral}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          color: colors.coral,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          margin: '0 0 8px 0',
                        }
                      }, '📅 DUE DATE'),
                      React.createElement(Text, {
                        style: {
                          color: colors.textWhite,
                          fontSize: '18px',
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
                style: { paddingLeft: '8px', verticalAlign: 'top' }
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
                        borderRadius: '8px',
                        padding: '20px 16px',
                        textAlign: 'center',
                        borderTop: `3px solid ${colors.coralLight}`,
                      }
                    },
                      React.createElement(Text, {
                        style: {
                          color: colors.coralLight,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          margin: '0 0 8px 0',
                        }
                      }, '⏰ TIME LEFT'),
                      React.createElement(Text, {
                        style: {
                          color: colors.textWhite,
                          fontSize: '18px',
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
      style: { marginBottom: '32px' }
    },
      React.createElement('tr', null,
        React.createElement('td', { align: 'center' },
          React.createElement(Link, {
            href: actionUrl,
            style: {
              display: 'inline-block',
              backgroundColor: colors.coral,
              color: '#ffffff',
              padding: '14px 40px',
              borderRadius: '24px',
              fontWeight: '600',
              fontSize: '14px',
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
        style: { marginBottom: '24px' }
      },
        React.createElement('tr', null,
          React.createElement('td', {
            style: {
              backgroundColor: colors.coral,
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
            }
          },
            React.createElement(Text, {
              style: {
                fontSize: '28px',
                fontWeight: '800',
                color: '#ffffff',
                margin: '0 0 8px 0',
              }
            }, '✨ AI-Powered Interview Prep'),
            React.createElement(Text, {
              style: {
                fontSize: '14px',
                color: '#ffffff',
                margin: '0',
                opacity: '0.95',
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
        style: { marginBottom: '24px' }
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
                fontSize: '20px',
                fontWeight: '700',
                color: colors.textWhite,
                margin: '0 0 6px 0',
              }
            }, '🏢 Company Intelligence'),
            React.createElement(Text, {
              style: {
                fontSize: '13px',
                color: colors.textLight,
                margin: '0 0 12px 0',
                opacity: '0.8',
              }
            }, `What you need to know about ${aiPrepTips.company}`),
            React.createElement(Text, {
              style: {
                color: colors.textLight,
                fontSize: '14px',
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
        style: { marginBottom: '24px' }
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
                    padding: '12px 24px',
                    borderRadius: '20px',
                    fontWeight: '700',
                    fontSize: '14px',
                  }
                }, `⏱️ Suggested Prep: ${aiPrepTips.prepTime}`)
              )
            )
          )
        )
      ),

      // Focus Areas Section with 2-column layout
      aiPrepTips.focusAreas && aiPrepTips.focusAreas.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('table', {
          role: 'presentation',
          width: '100%',
          cellPadding: '0',
          cellSpacing: '0',
          border: '0',
          style: { marginBottom: '20px' }
        },
          React.createElement('tr', null,
            React.createElement('td', null,
              React.createElement(Text, { style: headingStyle }, '🎯 Critical Focus Areas'),
              React.createElement(Text, { style: subheadingStyle }, 'Master these topics to ace your interview')
            )
          )
        ),

        // Focus Areas Grid - 2 columns
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
            style: { marginBottom: '12px' }
          },
            React.createElement('tr', null,
              // Left column
              React.createElement('td', {
                width: '50%',
                style: { paddingRight: '8px', verticalAlign: 'top' }
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
                        style: { marginBottom: '8px' }
                      },
                        React.createElement('tr', null,
                          React.createElement('td', {
                            width: '48',
                            style: { verticalAlign: 'middle', paddingRight: '12px' }
                          },
                            React.createElement('table', {
                              role: 'presentation',
                              cellPadding: '0',
                              cellSpacing: '0',
                              border: '0'
                            },
                              React.createElement('tr', null,
                                React.createElement('td', {
                                  style: {
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    backgroundColor: rowIndex % 2 === 0 ? colors.coral : colors.coralLight,
                                    textAlign: 'center',
                                    lineHeight: '44px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: colors.bgDark,
                                  }
                                }, leftArea.icon || '●')
                              )
                            )
                          ),
                          React.createElement('td', { style: { verticalAlign: 'middle' } },
                            React.createElement(Text, {
                              style: {
                                fontSize: '16px',
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
                          fontSize: '13px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, leftArea.description)
                    )
                  )
                )
              ),
              
              // Right column
              rightArea ? React.createElement('td', {
                width: '50%',
                style: { paddingLeft: '8px', verticalAlign: 'top' }
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
                        style: { marginBottom: '8px' }
                      },
                        React.createElement('tr', null,
                          React.createElement('td', {
                            width: '48',
                            style: { verticalAlign: 'middle', paddingRight: '12px' }
                          },
                            React.createElement('table', {
                              role: 'presentation',
                              cellPadding: '0',
                              cellSpacing: '0',
                              border: '0'
                            },
                              React.createElement('tr', null,
                                React.createElement('td', {
                                  style: {
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    backgroundColor: (rowIndex * 2 + 1) % 2 === 0 ? colors.coral : colors.coralLight,
                                    textAlign: 'center',
                                    lineHeight: '44px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: colors.bgDark,
                                  }
                                }, rightArea.icon || '●')
                              )
                            )
                          ),
                          React.createElement('td', { style: { verticalAlign: 'middle' } },
                            React.createElement(Text, {
                              style: {
                                fontSize: '16px',
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
                          fontSize: '13px',
                          color: colors.textLight,
                          margin: '0',
                          lineHeight: '1.6',
                        }
                      }, rightArea.description)
                    )
                  )
                )
              ) : React.createElement('td', { width: '50%', style: { paddingLeft: '8px' } })
            )
          );
        })
      ),

      // Preparation Tips with 2-column layout
      aiPrepTips.tips && aiPrepTips.tips.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('table', {
          role: 'presentation',
          width: '100%',
          cellPadding: '0',
          cellSpacing: '0',
          border: '0',
          style: { marginTop: '32px', marginBottom: '20px' }
        },
          React.createElement('tr', null,
            React.createElement('td', null,
              React.createElement(Text, { style: headingStyle }, '💡 Preparation Tips'),
              React.createElement(Text, { style: subheadingStyle }, 'Essential tips to maximize your preparation')
            )
          )
        ),

        // Tips Grid - 2 columns
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
            style: { marginBottom: '12px' }
          },
            React.createElement('tr', null,
              React.createElement('td', {
                width: '50%',
                style: { paddingRight: '8px', verticalAlign: 'top' }
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
                        borderLeft: `3px solid ${colors.coralLight}`,
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
                style: { paddingLeft: '8px', verticalAlign: 'top' }
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
                        borderLeft: `3px solid ${colors.coralLight}`,
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
              ) : React.createElement('td', { width: '50%', style: { paddingLeft: '8px' } })
            )
          );
        })
      ),

      // Preparation Roadmap
      aiPrepTips.roadmap && aiPrepTips.roadmap.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('table', {
          role: 'presentation',
          width: '100%',
          cellPadding: '0',
          cellSpacing: '0',
          border: '0',
          style: { marginTop: '32px', marginBottom: '20px' }
        },
          React.createElement('tr', null,
            React.createElement('td', null,
              React.createElement(Text, { style: headingStyle }, '🗺️ Your Preparation Roadmap'),
              React.createElement(Text, { style: subheadingStyle }, 'Follow these steps to ace your interview')
            )
          )
        ),

        ...aiPrepTips.roadmap.map((step, idx) =>
          React.createElement('table', {
            key: `step-${idx}`,
            role: 'presentation',
            width: '100%',
            cellPadding: '0',
            cellSpacing: '0',
            border: '0',
            style: { marginBottom: '12px' }
          },
            React.createElement('tr', null,
              React.createElement('td', { width: '32', style: { verticalAlign: 'top', paddingTop: '2px' } },
                React.createElement('table', {
                  role: 'presentation',
                  cellPadding: '0',
                  cellSpacing: '0',
                  border: '0'
                },
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        width: '28px',
                        height: '28px',
                        backgroundColor: colors.coral,
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '14px',
                        textAlign: 'center',
                        borderRadius: '6px',
                        lineHeight: '28px',
                      }
                    }, (idx + 1).toString())
                  )
                )
              ),
              React.createElement('td', { style: { paddingLeft: '12px' } },
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
                          fontSize: '14px',
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
        style: { marginTop: '32px' }
      },
        React.createElement('tr', null,
          React.createElement('td', {
            style: {
              backgroundColor: colors.coral,
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
            }
          },
            React.createElement(Text, {
              style: {
                fontSize: '28px',
                fontWeight: '800',
                color: '#ffffff',
                margin: '0 0 8px 0',
              }
            }, "🚀 You've Got This!"),
            React.createElement(Text, {
              style: {
                fontSize: '14px',
                color: '#ffffff',
                margin: '0',
                opacity: '0.95',
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
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
        paddingTop: '24px',
        marginTop: '32px',
      }
    },
      React.createElement('tr', null,
        React.createElement('td', { style: { textAlign: 'center' } },
          React.createElement(Text, {
            style: {
              fontSize: '13px',
              color: colors.textLight,
              margin: '0',
              lineHeight: '1.5',
            }
          },
            React.createElement('span', { style: { fontWeight: '600', color: colors.textWhite } }, '💡 Pro Tip: '),
            'Set multiple reminders to never miss important deadlines'
          )
        )
      )
    )
  );
}

module.exports = { default: ReminderEmail };