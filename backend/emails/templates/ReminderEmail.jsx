const React = require('react');
const { BaseEmail, colors } = require('./BaseEmail.jsx');
const { Text, Section, Link } = require('@react-email/components');

// Professional icon replacements using Unicode and shapes
const iconStyles = {
  container: {
    width: '40px',
    height: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '18px',
    letterSpacing: '-0.5px',
  },
  containerLarge: {
    width: '56px',
    height: '56px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '24px',
  }
};

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
  
  // Urgency badge config
  const urgencyConfig = {
    'now': { label: 'URGENT', symbol: '●' },
    'today': { label: 'TODAY', symbol: '◆' },
    'tomorrow': { label: 'Tomorrow', symbol: '◆' },
    'week': { label: 'THIS WEEK', symbol: '◇' },
    'future': { label: 'UPCOMING', symbol: '○' }
  };

  const config = urgencyConfig[urgency] || urgencyConfig['future'];

  return React.createElement(BaseEmail, { 
    previewText: `${title} - ${config.label.toUpperCase()}` 
  },
    // Hero Section
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '48px' } },
      // Badge
      React.createElement('div', {
        style: {
          display: 'inline-block',
          background: colors.coralLight,
          color: colors.bgDark,
          padding: '10px 24px',
          borderRadius: '24px',
          fontWeight: '600',
          fontSize: '12px',
          letterSpacing: '0.5px',
          marginBottom: '20px',
        }
      }, `${config.symbol} ${config.label}`),
      
      React.createElement(Text, {
        style: {
          fontSize: '32px',
          fontWeight: '700',
          color: colors.textWhite,
          margin: '0 0 16px 0',
          lineHeight: '1.3',
          letterSpacing: '-0.5px',
        }
      }, title),
      
      React.createElement(Text, {
        style: {
          fontSize: '17px',
          color: colors.textLight,
          margin: 0,
          fontWeight: '400',
        }
      }, `Hey ${name}, this is coming up tomorrow!`)
    ),

    // Main Event Card
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '20px',
        padding: '40px 32px',
        marginBottom: '48px',
        border: `1px solid rgba(255,255,255,0.05)`,
      }
    },
      // Logo
      React.createElement('div', { 
        style: { 
          textAlign: 'center', 
          marginBottom: '24px' 
        } 
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '64px',
            height: '64px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${colors.coral} 0%, ${colors.coralLight} 100%)`,
            padding: '8px',
          }
        },
          React.createElement('img', {
            src: 'https://applytide.com/images/logomark.png',
            alt: 'Applytide',
            width: '48',
            height: '48',
            style: {
              display: 'block',
              width: '48px',
              height: '48px',
            }
          })
        )
      ),

      // Description (shorter version for email)
      React.createElement(Text, {
        style: {
          color: colors.textLight,
          textAlign: 'center',
          lineHeight: '1.6',
          fontSize: '15px',
          marginBottom: '36px',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }
      }, description),

      // Stats Grid (Due Date & Time Left)
      React.createElement('table', {
        style: { 
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          borderSpacing: '12px',
        }
      },
        React.createElement('tbody', null,
          React.createElement('tr', null,
          React.createElement('td', { 
            style: { 
              width: '50%', 
              textAlign: 'center', 
            } 
          },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDark,
                borderRadius: '12px',
                padding: '24px 16px',
                border: `1px solid rgba(255,255,255,0.05)`,
              }
            },
              React.createElement('div', {
                style: { 
                  marginBottom: '8px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '36px',
                    height: '36px',
                    backgroundColor: colors.coral,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                },
                  React.createElement('div', {
                    style: {
                      width: '10px',
                      height: '10px',
                      backgroundColor: colors.bgDark,
                      borderRadius: '50%',
                    }
                  })
                )
              ),
              React.createElement(Text, {
                style: {
                  color: colors.textLight,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '6px',
                  letterSpacing: '1px',
                  opacity: 0.7,
                }
              }, 'Due Date'),
              React.createElement(Text, {
                style: {
                  color: colors.textWhite,
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: 0,
                  lineHeight: '1.4',
                }
              }, dueDate)
            )
          ),
          React.createElement('td', { 
            style: { 
              width: '50%', 
              textAlign: 'center', 
            } 
          },
            React.createElement('div', {
              style: {
                backgroundColor: colors.bgDark,
                borderRadius: '12px',
                padding: '24px 16px',
                border: `1px solid rgba(255,255,255,0.05)`,
              }
            },
              React.createElement('div', {
                style: { 
                  marginBottom: '8px',
                }
              },
                React.createElement('div', {
                  style: {
                    width: '36px',
                    height: '36px',
                    backgroundColor: colors.coralLight,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                },
                  React.createElement('div', {
                    style: {
                      width: '10px',
                      height: '10px',
                      backgroundColor: colors.bgDark,
                      borderRadius: '50%',
                    }
                  })
                )
              ),
              React.createElement(Text, {
                style: {
                  color: colors.textLight,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '6px',
                  letterSpacing: '1px',
                  opacity: 0.7,
                }
              }, 'Time Left'),
              React.createElement(Text, {
                style: {
                  color: colors.textWhite,
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: 0,
                  lineHeight: '1.4',
                }
              }, timeUntil)
            )
          )
        )
        )
      )
    ),

    // CTA Button
    React.createElement(Section, { 
      style: { 
        textAlign: 'center', 
        marginBottom: '56px' 
      } 
    },
      React.createElement(Link, {
        href: actionUrl,
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '16px 48px',
          borderRadius: '28px',
          fontWeight: '600',
          fontSize: '15px',
          textDecoration: 'none',
          letterSpacing: '0.2px',
        }
      }, 'View Application →')
    ),

    // AI Prep Section (if provided)
    aiPrepTips && React.createElement(React.Fragment, null,
      // AI Prep Header
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '20px',
          padding: '36px 32px',
          textAlign: 'center',
          marginBottom: '48px',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '52px',
            height: '52px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            backgroundColor: colors.bgDark,
            marginBottom: '16px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.coral,
          }
        }, '✦'), // Professional star
        React.createElement(Text, {
          style: {
            fontSize: '28px',
            fontWeight: '700',
            color: colors.bgDark,
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
          }
        }, 'AI-Powered Interview Prep'),
        React.createElement(Text, {
          style: {
            fontSize: '15px',
            color: colors.bgDarkSecondary,
            margin: 0,
            fontWeight: '500',
          }
        }, 'Personalized insights generated just for you')
      ),

      // Company Intelligence
      aiPrepTips.company && React.createElement(Section, {
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '48px',
          border: `1px solid rgba(255,255,255,0.05)`,
        }
      },
        React.createElement('table', { style: { width: '100%' } },
          React.createElement('tbody', null,
            React.createElement('tr', null,
            React.createElement('td', { 
              style: { 
                verticalAlign: 'top', 
                width: '48px',
                paddingRight: '16px',
              } 
            },
              React.createElement('div', {
                style: {
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  backgroundColor: colors.coral,
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: colors.bgDark,
                }
              }, '▣') // Professional building/company icon
            ),
            React.createElement('td', { style: { verticalAlign: 'top' } },
              React.createElement('div', null,
                React.createElement(Text, {
                  style: {
                    fontSize: '18px',
                    fontWeight: '600',
                    color: colors.textWhite,
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.2px',
                  }
                }, 'Company Intelligence'),
                React.createElement(Text, {
                  style: {
                    fontSize: '13px',
                    color: colors.textLight,
                    margin: 0,
                    opacity: 0.8,
                  }
                }, `What you need to know about ${aiPrepTips.company}`)
              )
            )
          )
        )
        ),
        aiPrepTips.companyInfo && React.createElement(Text, {
          style: {
            color: colors.textLight,
            fontSize: '14px',
            lineHeight: '1.7',
            marginTop: '18px',
            margin: '18px 0 0 0',
          }
        }, aiPrepTips.companyInfo)
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
            display: 'inline-block',
            backgroundColor: colors.coralLight,
            padding: '12px 28px',
            borderRadius: '24px',
          }
        },
          React.createElement('table', { 
            style: { 
              margin: 0,
              padding: 0,
            } 
          },
            React.createElement('tbody', null,
              React.createElement('tr', null,
              React.createElement('td', { 
                style: { 
                  verticalAlign: 'middle',
                  paddingRight: '10px',
                } 
              },
                React.createElement('span', { 
                  style: { 
                    fontSize: '16px',
                    lineHeight: 1,
                    color: colors.bgDark,
                    fontWeight: 'bold',
                  } 
                }, '◷')
              ),
              React.createElement('td', { 
                style: { 
                  verticalAlign: 'middle',
                } 
              },
                React.createElement(Text, {
                  style: {
                    color: colors.bgDark,
                    fontWeight: '600',
                    margin: 0,
                    fontSize: '14px',
                  }
                }, `Suggested Prep: ${aiPrepTips.prepTime}`)
              )
            )
            )
          )
        )
      ),

      // Focus Areas Section
      aiPrepTips.focusAreas && aiPrepTips.focusAreas.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(Section, { 
          style: { 
            textAlign: 'center', 
            marginBottom: '36px' 
          } 
        },
          React.createElement(Text, {
            style: {
              fontSize: '28px',
              fontWeight: '700',
              color: colors.textWhite,
              margin: '0 0 12px 0',
              letterSpacing: '-0.5px',
            }
          }, 'Critical Focus Areas'),
          React.createElement(Text, {
            style: {
              fontSize: '15px',
              color: colors.textLight,
              margin: 0,
            }
          }, 'Master these topics to ace your interview')
        ),

        // Focus Areas Grid (2 columns)
        React.createElement(Section, { style: { marginBottom: '52px' } },
          React.createElement('table', { style: { width: '100%', borderSpacing: '16px' } },
            React.createElement('tbody', null,
              ...aiPrepTips.focusAreas.reduce((rows, area, index) => {
              if (index % 2 === 0) {
                const nextArea = aiPrepTips.focusAreas[index + 1];
                rows.push(
                  React.createElement('tr', { key: `row-${index}` },
                    React.createElement('td', { 
                      style: { 
                        width: '50%', 
                        verticalAlign: 'top',
                        padding: '4px',
                      } 
                    },
                      React.createElement('div', {
                        style: {
                          backgroundColor: colors.bgDarkSecondary,
                          borderRadius: '12px',
                          padding: '22px 20px',
                          border: `1px solid rgba(255,255,255,0.05)`,
                        }
                      },
                        React.createElement('table', { style: { width: '100%', marginBottom: '12px' } },
                          React.createElement('tbody', null,
                            React.createElement('tr', null,
                            React.createElement('td', {
                              style: {
                                verticalAlign: 'middle',
                                width: '40px',
                                paddingRight: '12px',
                              }
                            },
                              React.createElement('div', {
                                style: {
                                  ...iconStyles.container,
                                  backgroundColor: index % 2 === 0 ? colors.coral : colors.coralLight,
                                  color: colors.bgDark,
                                }
                              }, area.icon || '▪')
                            ),
                            React.createElement('td', { style: { verticalAlign: 'middle' } },
                              React.createElement(Text, {
                                style: {
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: colors.textWhite,
                                  margin: 0,
                                  letterSpacing: '-0.2px',
                                }
                              }, area.title)
                            )
                          )
                          )
                        ),
                        React.createElement(Text, {
                          style: {
                            fontSize: '13px',
                            color: colors.textLight,
                            margin: 0,
                            lineHeight: '1.5',
                            opacity: 0.9,
                          }
                        }, area.description)
                      )
                    ),
                    nextArea ? React.createElement('td', { 
                      style: { 
                        width: '50%', 
                        verticalAlign: 'top',
                        padding: '4px',
                      } 
                    },
                      React.createElement('div', {
                        style: {
                          backgroundColor: colors.bgDarkSecondary,
                          borderRadius: '12px',
                          padding: '22px 20px',
                          border: `1px solid rgba(255,255,255,0.05)`,
                        }
                      },
                        React.createElement('table', { style: { width: '100%', marginBottom: '12px' } },
                          React.createElement('tbody', null,
                            React.createElement('tr', null,
                            React.createElement('td', {
                              style: {
                                verticalAlign: 'middle',
                                width: '40px',
                                paddingRight: '12px',
                              }
                            },
                              React.createElement('div', {
                                style: {
                                  ...iconStyles.container,
                                  backgroundColor: (index + 1) % 2 === 0 ? colors.coral : colors.coralLight,
                                  color: colors.bgDark,
                                }
                              }, nextArea.icon || '▪')
                            ),
                            React.createElement('td', { style: { verticalAlign: 'middle' } },
                              React.createElement(Text, {
                                style: {
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: colors.textWhite,
                                  margin: 0,
                                  letterSpacing: '-0.2px',
                                }
                              }, nextArea.title)
                            )
                          )
                          )
                        ),
                        React.createElement(Text, {
                          style: {
                            fontSize: '13px',
                            color: colors.textLight,
                            margin: 0,
                            lineHeight: '1.5',
                            opacity: 0.9,
                          }
                        }, nextArea.description)
                      )
                    ) : React.createElement('td', { style: { width: '50%' } })
                  )
                );
              }
              return rows;
            }, [])
            )
          )
        )
      ),

      // Preparation Tips Section
      aiPrepTips.tips && aiPrepTips.tips.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(Section, { 
          style: { 
            textAlign: 'center', 
            marginBottom: '36px' 
          } 
        },
          React.createElement(Text, {
            style: {
              fontSize: '28px',
              fontWeight: '700',
              color: colors.textWhite,
              margin: '0 0 12px 0',
              letterSpacing: '-0.5px',
            }
          }, 'Preparation Tips'),
          React.createElement(Text, {
            style: {
              fontSize: '15px',
              color: colors.textLight,
              margin: 0,
            }
          }, 'Essential tips to maximize your preparation')
        ),

        React.createElement(Section, { style: { marginBottom: '52px' } },
          ...aiPrepTips.tips.map((tip, index) =>
            React.createElement('div', {
              key: `tip-${index}`,
              style: {
                marginBottom: index < aiPrepTips.tips.length - 1 ? '14px' : '0',
              }
            },
              React.createElement('table', { style: { width: '100%' } },
                React.createElement('tbody', null,
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        verticalAlign: 'top',
                        width: '52px',
                        paddingRight: '14px',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          width: '36px',
                          height: '36px',
                          backgroundColor: colors.coral,
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '6px',
                        }
                      },
                        React.createElement('div', {
                          style: {
                            width: '10px',
                            height: '10px',
                            backgroundColor: colors.bgDark,
                            borderRadius: '50%',
                          }
                        })
                      )
                    ),
                    React.createElement('td', {
                      style: {
                        verticalAlign: 'center',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          backgroundColor: colors.bgDarkSecondary,
                          borderRadius: '12px',
                          padding: '18px 20px',
                          border: `1px solid rgba(255,255,255,0.05)`,
                        }
                      },
                        React.createElement(Text, {
                          style: {
                            color: colors.textLight,
                            fontSize: '14px',
                            lineHeight: '1.6',
                            margin: 0,
                          }
                        }, tip)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Preparation Roadmap
      aiPrepTips.roadmap && aiPrepTips.roadmap.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(Section, { 
          style: { 
            textAlign: 'center', 
            marginBottom: '36px' 
          } 
        },
          React.createElement(Text, {
            style: {
              fontSize: '28px',
              fontWeight: '700',
              color: colors.textWhite,
              margin: '0 0 12px 0',
              letterSpacing: '-0.5px',
            }
          }, 'Your Preparation Roadmap'),
          React.createElement(Text, {
            style: {
              fontSize: '15px',
              color: colors.textLight,
              margin: 0,
            }
          }, 'Follow these steps to ace your interview')
        ),

        // Roadmap Steps
        React.createElement(Section, { style: { marginBottom: '52px' } },
          ...aiPrepTips.roadmap.map((step, index) =>
            React.createElement('div', {
              key: `step-${index}`,
              style: {
                marginBottom: index < aiPrepTips.roadmap.length - 1 ? '14px' : '0',
              }
            },
              React.createElement('table', { style: { width: '100%' } },
                React.createElement('tbody', null,
                  React.createElement('tr', null,
                    React.createElement('td', {
                      style: {
                        verticalAlign: 'top',
                        width: '52px',
                        paddingRight: '14px',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: index % 2 === 0 ? colors.coral : colors.coralLight,
                          color: index % 2 === 0 ? colors.textWhite : colors.bgDark,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '18px',
                        }
                      }, (index + 1).toString())
                    ),
                    React.createElement('td', {
                      style: {
                        verticalAlign: 'center',
                      }
                    },
                      React.createElement('div', {
                        style: {
                          backgroundColor: colors.bgDarkSecondary,
                          borderRadius: '12px',
                          padding: '18px 20px',
                          border: `1px solid rgba(255,255,255,0.05)`,
                        }
                      },
                        React.createElement(Text, {
                          style: {
                            color: colors.textLight,
                            fontSize: '14px',
                            lineHeight: '1.6',
                            margin: 0,
                          }
                        }, step)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Success Footer
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '20px',
          padding: '36px 32px',
          textAlign: 'center',
        }
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex',
            width: '52px',
            height: '52px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            backgroundColor: colors.bgDark,
            marginBottom: '16px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.coral,
          }
        }, '◎'), // Target symbol
        React.createElement(Text, {
          style: {
            fontSize: '26px',
            fontWeight: '700',
            color: colors.bgDark,
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px',
          }
        }, "You've Got This!"),
        React.createElement(Text, {
          style: {
            fontSize: '15px',
            color: colors.bgDarkSecondary,
            margin: 0,
            fontWeight: '500',
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
          fontSize: '14px',
          color: colors.textLight,
          margin: 0,
          lineHeight: '1.5',
        }
      },
        React.createElement('span', { style: { fontWeight: '600', color: colors.textWhite } }, 'Pro Tip: '),
        'Set multiple reminders to never miss important deadlines'
      )
    )
  );
}

module.exports = { default: ReminderEmail };
