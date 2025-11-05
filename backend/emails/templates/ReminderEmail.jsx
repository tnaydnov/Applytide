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
    now: { label: 'URGENT', symbol: '●' },
    today: { label: 'TODAY', symbol: '◆' },
    tomorrow: { label: 'Tomorrow', symbol: '◆' },
    week: { label: 'THIS WEEK', symbol: '◇' },
    future: { label: 'UPCOMING', symbol: '○' }
  };
  const config = urgencyConfig[urgency] || urgencyConfig.future;

  const subCopy = {
    now: `Hey ${name}, this is happening now or any minute.`,
    today: `Hey ${name}, this is happening today.`,
    tomorrow: `Hey ${name}, this is coming up tomorrow!`,
    week: `Hey ${name}, this is happening this week.`,
    future: `Hey ${name}, here's a heads-up for your upcoming event.`
  };

  // Small reusable “section title” (no emoji)
  const SectionTitle = ({ title, subtitle }) =>
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '18px' } },
      React.createElement(Text, { style: {
        fontSize: '26px', fontWeight: 800, color: colors.textWhite, margin: '0 0 6px 0', letterSpacing: '-0.4px'
      }}, title),
      subtitle && React.createElement(Text, { style: { fontSize: '14px', color: colors.textLight, margin: 0 }}, subtitle)
    );

  // Reusable card
  const cardStyle = {
    backgroundColor: colors.bgDarkSecondary,
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'left'
  };

  return React.createElement(BaseEmail, { previewText: `${title} - ${config.label.toUpperCase()}` },

    // HERO
    React.createElement(Section, { style: { textAlign: 'center', margin: '8px 0 32px 0' } },
      React.createElement('div', {
        style: {
          display: 'inline-block',
          background: colors.coralLight,
          color: colors.bgDark,
          padding: '8px 18px',
          borderRadius: '999px',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.6px',
          marginBottom: '14px',
        }
      }, `${config.symbol} ${config.label}`),

      React.createElement(Text, {
        style: {
          fontSize: '34px',
          fontWeight: 800,
          color: colors.textWhite,
          margin: '0 0 10px 0',
          lineHeight: '1.25',
          letterSpacing: '-0.6px',
        }
      }, title),

      React.createElement(Text, { style: { fontSize: '16px', color: colors.textLight, margin: 0, fontWeight: 400 } },
        subCopy[urgency] || subCopy.future)
    ),

    // MAIN EVENT CARD (bigger date/time tiles)
    React.createElement(Section, {
      style: {
        backgroundColor: colors.bgDarkSecondary,
        borderRadius: '20px',
        padding: '32px 22px',
        marginBottom: '32px',
        border: '1px solid rgba(255,255,255,0.06)',
      }
    },
      description && React.createElement(Text, {
        style: {
          color: colors.textLight, textAlign: 'center', lineHeight: '1.6', fontSize: '15px',
          margin: '0 0 26px 0', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto',
        }
      }, description),

      // Calendar-style tiles
      React.createElement('table', { role: 'presentation', className: 'stack', style: { width: '100%', borderSpacing: 0, tableLayout: 'fixed' } },
        React.createElement('tbody', null,
          React.createElement('tr', null,
            // DUE DATE tile
            React.createElement('td', { style: { width: '50%', paddingRight: '8px' } },
              React.createElement('div', {
                style: {
                  backgroundColor: colors.bgDark,
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  textAlign: 'center',
                  overflow: 'hidden'
                }
              },
                // “calendar header” band
                React.createElement('div', {
                  style: {
                    background: 'linear-gradient(135deg, #F58F7C, #F2C4CE)',
                    padding: '8px 10px'
                  }
                },
                  React.createElement(Text, { style: {
                    margin: 0, fontSize: '11px', fontWeight: 800, color: colors.bgDark, letterSpacing: '1px'
                  }}, 'DUE DATE')
                ),
                // date text
                React.createElement('div', { style: { padding: '18px 12px' } },
                  React.createElement(Text, { style: { color: colors.textWhite, fontSize: '20px', fontWeight: 800, margin: 0, lineHeight: 1.3 } }, dueDate)
                )
              )
            ),
            // TIME LEFT tile
            React.createElement('td', { style: { width: '50%', paddingLeft: '8px' } },
              React.createElement('div', {
                style: {
                  backgroundColor: colors.bgDark,
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  textAlign: 'center',
                  overflow: 'hidden'
                }
              },
                React.createElement('div', {
                  style: {
                    background: 'linear-gradient(135deg, #F58F7C, #F2C4CE)',
                    padding: '8px 10px'
                  }
                },
                  React.createElement(Text, { style: {
                    margin: 0, fontSize: '11px', fontWeight: 800, color: colors.bgDark, letterSpacing: '1px'
                  }}, 'TIME LEFT')
                ),
                React.createElement('div', { style: { padding: '18px 12px' } },
                  React.createElement(Text, { style: { color: colors.textWhite, fontSize: '20px', fontWeight: 800, margin: 0, lineHeight: 1.3 } }, timeUntil)
                )
              )
            )
          )
        )
      )
    ),

    // CTA
    React.createElement(Section, { style: { textAlign: 'center', marginBottom: '40px' } },
      React.createElement(Link, {
        href: actionUrl,
        style: {
          display: 'inline-block',
          backgroundColor: colors.coral,
          color: colors.textWhite,
          padding: '16px 48px',
          borderRadius: '28px',
          fontWeight: 700,
          fontSize: '15px',
          textDecoration: 'none',
          letterSpacing: '0.2px',
        }
      }, 'View Application →')
    ),

    // AI PREP (no emoji squares; clean headers)
    aiPrepTips && React.createElement(React.Fragment, null,

      // Header chip (no icon)
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '20px',
          padding: '28px 22px',
          textAlign: 'center',
          marginBottom: '28px',
          border: '1px solid rgba(0,0,0,0.06)'
        }
      },
        React.createElement(Text, {
          style: {
            fontSize: '24px', fontWeight: 800, color: colors.bgDark, margin: '0 0 6px 0', letterSpacing: '-0.3px'
          }
        }, 'AI-Powered Interview Prep'),
        React.createElement(Text, {
          style: { fontSize: '14px', color: colors.bgDarkSecondary, margin: 0, fontWeight: 600 }
        }, 'Personalized insights generated just for you')
      ),

      // Company Intelligence (no emoji tile)
      aiPrepTips.company && React.createElement(Section, {
        style: {
          backgroundColor: colors.bgDarkSecondary,
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '28px',
          border: '1px solid rgba(255,255,255,0.06)',
        }
      },
        React.createElement(Text, { style: { fontSize: '18px', fontWeight: 700, color: colors.textWhite, margin: '0 0 6px 0' } }, 'Company Intelligence'),
        React.createElement(Text, { style: { fontSize: '13px', color: colors.textLight, margin: '0 0 12px 0', opacity: 0.85 } },
          `What you need to know about ${aiPrepTips.company}`),
        aiPrepTips.companyInfo && React.createElement(Text, {
          style: {
            color: colors.textLight, fontSize: '14px', lineHeight: '1.7', margin: 0
          }
        }, aiPrepTips.companyInfo)
      ),

      // Prep time badge (no icon)
      aiPrepTips.prepTime && React.createElement(Section, { style: { textAlign: 'center', marginBottom: '28px' } },
        React.createElement('div', {
          style: { display: 'inline-block', backgroundColor: colors.coralLight, padding: '10px 20px', borderRadius: '999px', fontWeight: 700, color: colors.bgDark, fontSize: '13px' }
        }, `Suggested Prep: ${aiPrepTips.prepTime}`)
      ),

      // Critical Focus Areas (unchanged layout, cleaned)
      aiPrepTips.focusAreas && aiPrepTips.focusAreas.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(SectionTitle, { title: 'Critical Focus Areas', subtitle: 'Master these topics to ace your interview' }),
        React.createElement(Section, { style: { marginBottom: '36px' } },
          React.createElement('table', { style: { width: '100%', borderSpacing: '16px' }, className: 'stack' },
            React.createElement('tbody', null,
              ...aiPrepTips.focusAreas.reduce((rows, area, index) => {
                if (index % 2 === 0) {
                  const nextArea = aiPrepTips.focusAreas[index + 1];
                  rows.push(
                    React.createElement('tr', { key: `fa-${index}` },
                      React.createElement('td', { style: { width: '50%', padding: '4px' } },
                        React.createElement('div', { style: { ...cardStyle, borderLeft: `3px solid ${colors.coral}` } },
                          React.createElement(Text, { style: { fontSize: '16px', fontWeight: 700, color: colors.textWhite, margin: '0 0 6px 0' } }, area.title),
                          React.createElement(Text, { style: { fontSize: '13px', color: colors.textLight, margin: 0, lineHeight: 1.6 } }, area.description)
                        )
                      ),
                      nextArea
                        ? React.createElement('td', { style: { width: '50%', padding: '4px' } },
                            React.createElement('div', { style: { ...cardStyle, borderLeft: `3px solid ${colors.coral}` } },
                              React.createElement(Text, { style: { fontSize: '16px', fontWeight: 700, color: colors.textWhite, margin: '0 0 6px 0' } }, nextArea.title),
                              React.createElement(Text, { style: { fontSize: '13px', color: colors.textLight, margin: 0, lineHeight: 1.6 } }, nextArea.description)
                            )
                          )
                        : React.createElement('td', { style: { width: '50%', padding: '4px' } })
                    )
                  );
                }
                return rows;
              }, [])
            )
          )
        )
      ),

      // Preparation Tips — now same block design (NO numbering)
      aiPrepTips.tips && aiPrepTips.tips.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(SectionTitle, { title: 'Preparation Tips', subtitle: 'Essential tips to maximize your preparation' }),
        React.createElement(Section, { style: { marginBottom: '36px' } },
          React.createElement('table', { style: { width: '100%', borderSpacing: '16px' }, className: 'stack' },
            React.createElement('tbody', null,
              ...aiPrepTips.tips.reduce((rows, tip, index) => {
                if (index % 2 === 0) {
                  const next = aiPrepTips.tips[index + 1];
                  rows.push(
                    React.createElement('tr', { key: `tiprow-${index}` },
                      React.createElement('td', { style: { width: '50%', padding: '4px' } },
                        React.createElement('div', { style: { ...cardStyle, borderLeft: `3px solid ${colors.coral}` } },
                          React.createElement(Text, { style: { color: colors.textLight, fontSize: '14px', margin: 0, lineHeight: 1.6 } }, tip)
                        )
                      ),
                      next
                        ? React.createElement('td', { style: { width: '50%', padding: '4px' } },
                            React.createElement('div', { style: { ...cardStyle, borderLeft: `3px solid ${colors.coral}` } },
                              React.createElement(Text, { style: { color: colors.textLight, fontSize: '14px', margin: 0, lineHeight: 1.6 } }, next)
                            )
                          )
                        : React.createElement('td', { style: { width: '50%', padding: '4px' } })
                    )
                  );
                }
                return rows;
              }, [])
            )
          )
        )
      ),

      // Preparation Roadmap — centered numbers
      aiPrepTips.roadmap && aiPrepTips.roadmap.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(SectionTitle, { title: 'Your Preparation Roadmap', subtitle: 'Follow these steps to ace your interview' }),
        React.createElement(Section, { style: { marginBottom: '40px' } },
          ...aiPrepTips.roadmap.map((step, index) =>
            React.createElement('div', { key: `step-${index}`, style: { marginBottom: index < aiPrepTips.roadmap.length - 1 ? '12px' : '0' } },
              React.createElement('table', { role: 'presentation', style: { width: '100%' } },
                React.createElement('tbody', null,
                  React.createElement('tr', null,
                    React.createElement('td', { style: { width: '36px', verticalAlign: 'top' } },
                      React.createElement('div', {
                        style: {
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: colors.coral,
                          color: colors.textWhite,
                          fontWeight: 800,
                          fontSize: '14px',
                          textAlign: 'center',
                          lineHeight: '28px' // <-- centers number vertically
                        }
                      }, (index + 1).toString())
                    ),
                    React.createElement('td', { style: { paddingLeft: '12px' } },
                      React.createElement('div', { style: { ...cardStyle } },
                        React.createElement(Text, { style: { color: colors.textLight, fontSize: '14px', lineHeight: 1.6, margin: 0 } }, step)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Success Footer (no emoji)
      React.createElement(Section, {
        style: {
          background: `linear-gradient(135deg, ${colors.coral}, ${colors.coralLight})`,
          borderRadius: '20px',
          padding: '28px 22px',
          textAlign: 'center',
          marginBottom: '12px'
        }
      },
        React.createElement(Text, { style: { fontSize: '24px', fontWeight: 800, color: colors.bgDark, margin: '0 0 6px 0' } }, "You've Got This!"),
        React.createElement(Text, { style: { fontSize: '14px', color: colors.bgDarkSecondary, margin: 0, fontWeight: 600 } }, 'Follow this plan and nail your interview')
      )
    ),

    // Footer Tip
    React.createElement(Section, {
      style: {
        borderTop: `1px solid ${colors.bgDarkSecondary}`,
        paddingTop: '22px',
        marginTop: '20px',
        textAlign: 'center',
      }
    },
      React.createElement(Text, {
        style: { fontSize: '14px', color: colors.textLight, margin: 0, lineHeight: '1.5' }
      },
        React.createElement('span', { style: { fontWeight: 700, color: colors.textWhite } }, 'Pro Tip: '),
        'Set multiple reminders to never miss important deadlines'
      )
    )
  );
}

module.exports = { default: ReminderEmail };
