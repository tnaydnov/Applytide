# AI Interview Preparation Tips - Quick Start Guide

## 🚀 Quick Deployment

```bash
# 1. Run the database migration
cd backend
alembic upgrade head

# 2. Restart the backend server
# (Ctrl+C to stop, then restart with your usual command)

# 3. Restart the frontend
# (Ctrl+C in frontend terminal, then restart)
```

That's it! The feature is now live.

---

## 🧪 Testing

### Test as Pro/Premium User

1. **Login** as a user with Pro or Premium subscription
2. **Go to Reminders** page
3. **Click "Create Reminder"**
4. **Select an application** from dropdown
5. **Choose event type** (e.g., "Technical Interview")
6. **Fill in details** (title, date, notes)
7. **Check the AI prep tips checkbox** ✅ 🤖 Receive AI-powered preparation tips 💎 PRO
8. **Submit**
9. **Check your email** - You should receive immediate email with AI-generated tips!

### Test as Starter User

1. **Login** as Starter plan user
2. **Create reminder**
3. **See locked AI checkbox**: 🔒 AI preparation tips available for Pro/Premium users
4. **Cannot enable** the feature

---

## 📧 What to Expect in Email

Subject: **Reminder: [Your Event Title]**

Body will include:
- Standard reminder details
- **NEW: Beautiful blue gradient section** with:
  - 🤖 AI-Powered Preparation Tips header
  - Company insights and research
  - Key focus areas for the interview
  - Specific, actionable preparation tips
  - Recommended preparation checklist
  - Estimated prep time
  - 💎 Pro Feature badge

---

## 🎨 New Event Types

The event type dropdown now has **9 specific types**:

**Interview Types:**
- Technical Interview
- Behavioral Interview
- HR Screen
- Phone Screen
- Final Round

**Other Events:**
- Follow-up
- Deadline
- Onboarding
- Custom

These specific types help the AI generate more targeted preparation advice!

---

## 🔍 What the AI Analyzes

When generating preparation tips, the AI considers:

1. **Job Details**:
   - Company name
   - Job title
   - Job description
   - Job URL

2. **Your Documents**:
   - Resume/CV (if uploaded)
   - Cover letter (if attached)

3. **Event Type**:
   - Technical interview → Focus on coding, system design
   - Behavioral interview → Focus on STAR method, past experiences
   - HR Screen → Focus on culture fit, salary expectations
   - etc.

4. **AI generates**:
   - Company research insights
   - Role-specific preparation areas
   - Personalized tips based on your experience
   - Specific questions you might face
   - Recommended preparation checklist
   - Estimated prep time

---

## 💰 Cost Estimate

- **Model**: GPT-4o-mini
- **Cost per email**: ~$0.001 - $0.002 (very cheap!)
- **Tokens**: 2500 max tokens per generation
- **Example**: 1000 AI tip emails = ~$1-2

---

## 🐛 Troubleshooting

### "AI checkbox is disabled"
- **Cause**: You're on Starter plan
- **Solution**: Upgrade to Pro or Premium

### "Email not received"
- **Check spam folder**
- **Verify application has job details** (company, title, description)
- **Check backend logs** for errors

### "AI tips section missing in email"
- **Cause**: AI generation failed (logged in backend)
- **Check**: OPENAI_API_KEY is set correctly
- **Check**: Backend logs for error details

### "Generic tips not specific enough"
- **Ensure job description is detailed**
- **Upload resume for better personalization**
- **Choose specific event type** (not "Custom")

---

## 📝 Database Check

To verify AI tips are being cached:

```sql
SELECT 
  id,
  title,
  event_type,
  ai_prep_tips_enabled,
  ai_prep_tips_generated_at,
  LENGTH(ai_prep_tips_generated) as response_length
FROM reminders
WHERE ai_prep_tips_enabled = true
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Key Features

✅ **Immediate Delivery** - Email sent instantly when reminder created
✅ **Professional Prompt** - 20+ years expert persona for high-quality tips
✅ **Comprehensive Analysis** - Job + Company + Resume + Event Type
✅ **Pro/Premium Only** - Feature access control enforced
✅ **Graceful Degradation** - Reminder created even if AI fails
✅ **Response Caching** - AI tips stored in database
✅ **Beautiful UI** - Gradient Pro styling with clear branding
✅ **9 Event Types** - Specific types for better AI analysis

---

## 🔗 Important Files

**Backend**:
- AI Service: `backend/app/infra/external/ai_preparation_service.py`
- Integration Logic: `backend/app/domain/reminders/service.py` (search for `_generate_and_send_ai_tips`)
- Email Template: `backend/app/infra/notifications/email_templates.py`

**Frontend**:
- Reminder Modal: `frontend/features/reminders/components/modals/CreateReminderModal.jsx`

**Migration**:
- `backend/app/db/migrations/versions/20251103_ai_prep_tips.py`

---

## 📊 Monitoring

Check backend logs for:
- `"Generating AI preparation tips for reminder"` - Feature triggered
- `"AI tips generated successfully"` - AI call succeeded
- `"AI preparation tips email sent successfully"` - Email delivered
- `"AI tips cached in database"` - Response stored

---

## ✅ Checklist

Before going live:
- [ ] Run migration (`alembic upgrade head`)
- [ ] Verify `OPENAI_API_KEY` is set
- [ ] Test with Pro/Premium account
- [ ] Verify email received
- [ ] Check email content quality
- [ ] Test with Starter account (should be blocked)
- [ ] Monitor OpenAI usage in first 24 hours

---

## 🎉 You're All Set!

The AI Interview Preparation Tips feature is ready to use. Pro and Premium users will love receiving personalized, actionable interview advice right when they create their reminders! 🚀
