# Reminder System Fixes - Complete Overhaul

## Problems Identified

### 1. **Ugly Email Design** ❌
Current reminder email looks basic and unprofessional

### 2. **Time Zone Bug** 🐛
- Email shows "October 25, 2025 at 04:04 PM" but user set it for 19:04
- Backend stores in UTC, displays in UTC, ignores user's timezone
- Logs also show UTC time, confusing for users

### 3. **Spam Bug** 🐛
- Sends same reminder EVERY MINUTE for an hour
- Root cause: `should_send_notification()` has 5-minute tolerance window
- Once within 5 minutes, sends repeatedly until marked `sent: true`
- But database commit happens AFTER sending, so parallel worker runs resend

### 4. **Poor UX - Inflexible Notification Schedule** 🎯
Current system: "X hours/days/weeks before"
- Not intuitive for users
- Can't set specific date/time
- Can't set recurring reminders
- Example: User wants "remind me at 9 AM on the day of interview"

## Solutions

### 1. **Beautiful Email Design** ✨
Redesign reminder email with:
- Larger, more prominent event info
- Better color coding by urgency
- Clearer date/time display
- Add Google Calendar button
- Professional card-based layout

### 2. **Fix Time Zone** 🌍
Two-part fix:
1. Store user's timezone when creating reminder
2. Convert UTC to user's timezone when displaying/sending emails

Changes needed:
- Add `user_timezone` field to Reminder model (migration)
- Capture timezone in frontend (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Worker: Convert due_date from UTC to user_timezone before formatting
- Email: Display in user's local time

### 3. **Fix Spam Bug** 🛑
Problem: Worker checks every 5 minutes, sends if within tolerance
Solution: **Mark as sent BEFORE checking next notification**

Changes:
- Wrap send + DB commit in transaction
- Mark `sent: true` immediately after successful send
- Add `sending_lock` to prevent parallel workers

Better approach: Check `last_notification_sent` timestamp
- If sent within last 10 minutes for this notification time, skip
- Prevents duplicate sends even if `sent` flag isn't updated yet

### 4. **Better Notification UX** 🎨

#### New Design Options:

**Option A: Simple + Flexible (Recommended)**
```
When should we remind you?
○ Specific date & time  [Date Picker] [Time Picker]
○ Before the event:
   [1] [hours ▾] before
   + Add another reminder time
```

**Option B: Advanced + Powerful**
```
Notification Schedule:
┌─────────────────────────────────────┐
│ Type: ● One-time  ○ Recurring       │
├─────────────────────────────────────┤
│ If One-time:                        │
│   • Specific time: [Date] [Time]    │
│   • Before event: [1][hours▾]       │
│                                     │
│ If Recurring:                       │
│   Repeat: [Daily▾]                  │
│   Starting: [Date]                  │
│   Until: ● Event date ○ Custom      │
│   Time: [09:00 AM]                  │
└─────────────────────────────────────┘
```

**Option C: Preset + Custom (Best UX)**
```
Quick presets:
[1 hour before] [1 day before] [1 week before]

Or create custom:
┌─────────────────────────────────────┐
│ ○ At specific time                  │
│    📅 Oct 24, 2025  🕐 6:00 PM     │
│                                     │
│ ○ Before the event                  │
│    [1] [hours ▾] before            │
│                                     │
│ ○ Daily reminder (last week)        │
│    Every day at [9:00 AM]           │
│    Starting 7 days before           │
└─────────────────────────────────────┘
+ Add another notification
```

## Implementation Priority

1. **Fix Spam Bug (Critical)** - Users getting annoyed
2. **Fix Time Zone** - Shows wrong time, confusing
3. **Better UX** - Current system is not user-friendly
4. **Better Email Design** - Polish

## Data Model Changes

```python
class Reminder:
    # ... existing fields ...
    user_timezone: str  # e.g., "America/New_York", "Asia/Jerusalem"
    
    notification_schedule: dict = {
        "type": "custom",  # "simple" | "custom" | "recurring"
        "notifications": [
            {
                "type": "specific",  # "specific" | "relative"
                "datetime": "2025-10-24T18:00:00",  # if type=specific
                "value": 1,  # if type=relative
                "unit": "hour",  # if type=relative
                "sent": false
            },
            {
                "type": "recurring",
                "frequency": "daily",
                "time": "09:00",
                "start_days_before": 7,
                "last_sent": null
            }
        ]
    }
```

## Next Steps

1. Create database migration for `user_timezone` field
2. Update CreateReminderModal with new UX (Option C recommended)
3. Fix worker to prevent spam (mark sent immediately)
4. Add timezone conversion in worker
5. Redesign email template
6. Test thoroughly with different timezones
