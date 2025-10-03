# 🔥 URGENT: Import Error Fix

## Error
```
ModuleNotFoundError: No module named 'app.infra.security.password'
```

## Cause
Wrong import path - the file is `passwords.py` (plural) not `password.py`

## Fixed Files
1. ✅ `backend/app/api/deps_auth.py` - Changed import to `passwords.py`
2. ✅ `backend/app/api/routers/admin.py` - Changed import to `passwords.py`
3. ✅ `backend/app/infra/cache/__init__.py` - Created (was missing)

## Deploy to Production

```bash
# 1. Commit and push
git add .
git commit -m "Fix: Import error - passwords.py not password.py"
git push origin main

# 2. On production server
cd ~/Applytide
git pull origin main

# 3. Restart API
sudo systemctl restart applytide-api

# Or if Docker:
docker-compose restart api

# Or if PM2:
pm2 restart applytide-api
```

## Verify Fix

```bash
# Check logs - should start without errors
sudo journalctl -u applytide-api -f

# Or Docker:
docker logs -f applytide-api

# Or PM2:
pm2 logs applytide-api
```

## Test API

```bash
curl https://applytide.com/api/health
# Should return: {"status": "ok"}
```

---

## What Was Wrong

I mistakenly used:
```python
from ..infra.security.password import verify_password  # ❌ Wrong
```

Should have been:
```python
from ..infra.security.passwords import verify_password  # ✅ Correct
```

The file in your project is called `passwords.py` (plural), not `password.py`.

---

## Files Changed

```
backend/app/api/deps_auth.py          - Fixed import
backend/app/api/routers/admin.py      - Fixed import  
backend/app/infra/cache/__init__.py   - Created (missing)
```

---

All fixed! Just commit, push, pull on production, and restart the API.
