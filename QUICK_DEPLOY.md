# Quick Deployment Commands

Copy and paste these commands on your server to deploy all changes.

## 🚀 Full Deployment (5 minutes)

```bash
# 1. Connect to server
ssh root@applytide.com

# 2. Navigate to project
cd ~/Applytide

# 3. Pull latest code
git pull origin main

# 4. Run database migration
docker-compose -f docker-compose.prod.yml exec applytide_api alembic upgrade head

# 5. Restart services
docker-compose -f docker-compose.prod.yml restart applytide_api
docker-compose -f docker-compose.prod.yml restart applytide_frontend

# 6. Check migration worked
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide -c "\dt llm_usage"

# 7. Watch logs for errors
docker-compose -f docker-compose.prod.yml logs -f applytide_api
# Press Ctrl+C to stop watching logs
```

## ✅ Quick Verification

```bash
# Check if llm_usage table exists and has correct structure
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide -c "\d llm_usage"

# Check migration version
docker-compose -f docker-compose.prod.yml exec applytide_api alembic current

# Check for any startup errors
docker-compose -f docker-compose.prod.yml logs --tail=50 applytide_api | grep -i error
```

## 🧪 Test Pages

Open these URLs in your browser:

1. **Admin Dashboard**: https://applytide.com/admin
2. **Users List**: https://applytide.com/admin/users
3. **User Detail**: Click on any user
4. **Error Logs**: https://applytide.com/admin/errors
5. **Active Sessions**: https://applytide.com/admin/sessions
6. **LLM Usage**: https://applytide.com/admin/llm-usage ⭐ NEW
7. **Security**: https://applytide.com/admin/security ⭐ NEW

## 🐛 If Something Goes Wrong

### Migration fails
```bash
# Check current version
docker-compose -f docker-compose.prod.yml exec applytide_api alembic current

# Check migration history
docker-compose -f docker-compose.prod.yml exec applytide_api alembic history

# Try manual SQL (see MANUAL_MIGRATION.md)
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide
```

### Services won't restart
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Force recreate
docker-compose -f docker-compose.prod.yml up -d --force-recreate applytide_api applytide_frontend
```

### Pages show errors
```bash
# Check API logs
docker-compose -f docker-compose.prod.yml logs --tail=100 applytide_api

# Check frontend logs
docker-compose -f docker-compose.prod.yml logs --tail=100 applytide_frontend

# Restart everything
docker-compose -f docker-compose.prod.yml restart
```

## 📊 Monitor LLM Usage

After deployment:

1. **Trigger LLM call**: Generate a cover letter as a user
2. **Check LLM page**: Visit `/admin/llm-usage`
3. **Verify tracking**: Should see the API call with cost

```bash
# Check database directly
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide -c "SELECT COUNT(*) FROM llm_usage;"

# View recent entries
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide -c "SELECT timestamp, model, endpoint, total_tokens, estimated_cost FROM llm_usage ORDER BY timestamp DESC LIMIT 10;"
```

## 🎯 Success Indicators

- ✅ Migration completes without errors
- ✅ Services restart successfully
- ✅ No errors in logs
- ✅ All admin pages load
- ✅ User detail page has dark theme
- ✅ LLM Usage page loads (empty at first)
- ✅ Security page loads and shows events
- ✅ After generating cover letter, usage appears

## 💡 Tips

1. **Test in order**: Dashboard → Users → LLM Usage → Security
2. **Generate test data**: Create a cover letter to test LLM tracking
3. **Monitor costs**: Check LLM Usage page daily to track spending
4. **Watch security**: Check Security page for suspicious activity
5. **Export data**: Use CSV export on LLM Usage page for analysis

---

**Need more details?** See `DEPLOYMENT_GUIDE.md`  
**Manual migration?** See `MANUAL_MIGRATION.md`  
**Complete summary?** See `COMPLETION_SUMMARY.md`
