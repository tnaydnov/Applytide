# Security Fixes Verification Checklist

Use this checklist after deploying to verify all security fixes are working.

## ✅ Pre-Deployment Checklist

- [ ] All code changes committed to git
- [ ] `.env.production` has all security settings
- [ ] Docker images rebuilt with `--no-cache`
- [ ] All containers restarted

## 🔍 Post-Deployment Verification

### **1. Security Headers Test**

Run this command:
```bash
curl -I https://applytide.com
```

**Expected Headers** (check each one):
- [ ] `server: nginx` (NO version number)
- [ ] `strict-transport-security: max-age=31536000; includeSubDomains; preload`
- [ ] `x-content-type-options: nosniff`
- [ ] `x-frame-options: DENY`
- [ ] `referrer-policy: strict-origin-when-cross-origin`
- [ ] `permissions-policy: geolocation=(), microphone=(), camera=()`
- [ ] `content-security-policy: default-src 'self'; ...`
- [ ] NO `x-powered-by` header (should be absent)

### **2. Browser Dev Tools Test**

1. Open https://applytide.com in Chrome
2. Press F12 → Network tab
3. Refresh page
4. Click on the first request (applytide.com)
5. Check "Response Headers" section

**Verify**:
- [ ] All headers from test #1 are present
- [ ] No `X-Powered-By` header visible

### **3. SSL/TLS Test**

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=applytide.com

**Expected Grade**: A or A+

**Check**:
- [ ] Certificate is valid
- [ ] HSTS enabled
- [ ] TLS 1.3 supported
- [ ] Strong ciphers only

### **4. Cookie Security Test**

1. Login to https://applytide.com
2. F12 → Application → Cookies → https://applytide.com
3. Find `access_token` cookie

**Verify Flags**:
- [ ] `Secure` = ✓ (checkmark)
- [ ] `HttpOnly` = ✓ (checkmark)
- [ ] `SameSite` = Lax

### **5. File Upload MIME Validation Test**

**Test 1: Upload fake file (should FAIL)**
```bash
# Create a fake PDF (it's actually just text)
echo "This is not a PDF file" > fake.pdf

# Try to upload via your app
# Expected: "File content validation failed"
```

- [ ] Fake PDF rejected with proper error message

**Test 2: Upload real file (should SUCCEED)**
```bash
# Upload a real PDF document
# Expected: Upload succeeds
```

- [ ] Real PDF accepted successfully

**Test 3: Upload renamed executable (should FAIL)**
```bash
# Rename a text file to .pdf
cp /etc/hosts malicious.pdf

# Try to upload
# Expected: "File extension doesn't match content"
```

- [ ] Mismatched file rejected

### **6. Security Headers Scanner**

Visit: https://securityheaders.com/?q=https://applytide.com

**Expected Grade**: A or A+

**Check**:
- [ ] Content-Security-Policy = Green
- [ ] X-Frame-Options = Green
- [ ] X-Content-Type-Options = Green
- [ ] Strict-Transport-Security = Green
- [ ] Referrer-Policy = Green

### **7. Mozilla Observatory**

Visit: https://observatory.mozilla.org/analyze/applytide.com

**Expected Score**: 80+ (B+ or higher)

**Check**:
- [ ] HTTP → HTTPS redirect works
- [ ] Security headers present
- [ ] No known vulnerabilities

### **8. Container Health Check**

```bash
# SSH to server
ssh root@applytide.com

# Check all containers running
docker ps

# Check backend logs for security middleware
docker logs applytide_api | grep -i "security"
```

**Expected Output**:
```
Security headers middleware enabled
```

- [ ] All containers running
- [ ] Security middleware log present
- [ ] No error messages

### **9. API Endpoint Test**

```bash
# Test API endpoint has headers
curl -I https://applytide.com/api/auth/me
```

**Verify**:
- [ ] Same security headers as homepage
- [ ] No 500 errors
- [ ] Proper CORS headers

### **10. File Size Limit Test**

```bash
# Try uploading 20MB file (should fail - limit is 16MB)
dd if=/dev/zero of=large.pdf bs=1M count=20

# Upload via app
# Expected: "File too large" or "Payload too large"
```

- [ ] Large file rejected properly

---

## 📊 **Verification Summary**

| Test | Status | Notes |
|------|--------|-------|
| Security Headers | ⬜ | curl -I test |
| Browser DevTools | ⬜ | F12 check |
| SSL Labs | ⬜ | A or A+ grade |
| Cookie Security | ⬜ | Secure + HttpOnly + SameSite |
| MIME Validation | ⬜ | Fake files rejected |
| Security Headers Scanner | ⬜ | A or A+ grade |
| Mozilla Observatory | ⬜ | 80+ score |
| Container Health | ⬜ | All running |
| API Endpoints | ⬜ | Headers present |
| File Size Limit | ⬜ | 16MB enforced |

---

## 🚨 **If Tests Fail**

### **Problem: Security headers missing**

**Solution**:
```bash
# Check middleware is enabled
docker logs applytide_api | grep -i security

# Rebuild containers
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait 30 seconds then test again
```

### **Problem: MIME validation not working**

**Solution**:
```bash
# Check python-magic installed
docker exec applytide_api pip list | grep magic

# Should show: python-magic 0.4.27

# If missing, rebuild:
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### **Problem: X-Powered-By still showing**

**Solution**:
```bash
# Rebuild frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Clear browser cache (Ctrl+Shift+R)
```

### **Problem: Nginx version still showing**

**Solution**:
```bash
# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx

# If still showing, rebuild:
docker-compose -f docker-compose.prod.yml build --no-cache nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

---

## ✅ **All Tests Passed?**

If all checkboxes are ✓, your security hardening is complete! 🎉

**Final Steps**:
1. Document the fixes (already done in SECURITY_FIXES_APPLIED.md)
2. Thank your friend for the security scan
3. Consider setting up automated security scanning (GitHub Actions)
4. Schedule regular security reviews (monthly)

---

## 📅 **Next Security Review**

Schedule next review for: **________________**

Set a reminder to:
- Run security scans again
- Update dependencies
- Check for new vulnerabilities
- Review access logs
