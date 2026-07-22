# Deployment Guide - Phase 2 Complete

## Quick Start (5 minutes)

### 1. Local Testing
```bash
# Start dev server
pnpm dev

# Test routes
- http://localhost:3000 → redirects based on auth
- http://localhost:3000/login → tenant login
- http://localhost:3000/admin/login → admin login
- http://localhost:3000/accept-invite?token=test → invite setup
```

### 2. Pre-Deployment Checks
```bash
# TypeScript check
pnpm tsc --noEmit
# Expected: No errors

# Build check
pnpm build
# Expected: Build succeeds
```

### 3. Deploy to Vercel
```bash
# Push to GitHub
git add .
git commit -m "Phase 2 complete: routing fixed, accept-invite, director invite, security, responsive"
git push

# Deploy via Vercel CLI or GitHub integration
# Set environment variables in Vercel dashboard
```

### 4. Environment Variables (Set in Vercel Dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

---

## Detailed Deployment Steps

### Step 1: Verify Everything Works Locally

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# In browser, verify each route:
```

**Routes to Test:**

| Route | Expected | Test Case |
|-------|----------|-----------|
| `/` | Redirects to `/login` (if logged out) | Not authenticated |
| `/login` | Tenant login form | Email + password |
| `/admin/login` | Admin login form | Admin credentials |
| `/admin/dashboard` | List of organizations | Admin logged in |
| `/accept-invite?token=test` | Invite setup form | Invited user |
| `/director/settings` | Team management UI | Director logged in |

---

### Step 2: TypeScript & Build Verification

```bash
# Check TypeScript
pnpm tsc --noEmit

# Build
pnpm build

# Check for errors - if clean, proceed to deployment
```

---

### Step 3: Prepare GitHub

```bash
# Ensure all changes are committed
git status

# Add all files
git add -A

# Commit
git commit -m "Phase 2: Accept-invite, director invite, security, responsive"

# Push to GitHub
git push origin main
```

---

### Step 4: Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Option B: Via GitHub Integration**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Configure build settings:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Install Command: `pnpm install`
5. Add environment variables (see below)
6. Click "Deploy"

---

### Step 5: Set Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```
3. Save

---

### Step 6: Test in Production

Once deployed, test each route:

```
https://your-domain.vercel.app/login
https://your-domain.vercel.app/admin/login
https://your-domain.vercel.app/accept-invite?token=test
https://your-domain.vercel.app/director/settings
```

---

## Post-Deployment

### Monitor Logs
```bash
vercel logs --prod
```

### Check for Errors
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for 404s or 500s

### Common Issues

**Issue: Blank page**
- Check browser console for JavaScript errors
- Verify environment variables are set
- Check Supabase connection

**Issue: 404 on routes**
- Verify routes exist in `/app` directory
- Check route group names (parentheses)
- Rebuild and redeploy

**Issue: CORS errors**
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Check Supabase CORS settings
- Clear browser cache

---

## Rollback Plan

If deployment has issues:

```bash
# Revert to previous version
vercel rollback

# Or redeploy current version
vercel --prod
```

---

## Security Checklist

Before going live, verify:

- [ ] No console errors/warnings
- [ ] Rate limiting working (test 6 failed logins)
- [ ] Password strength enforced (button disabled until 5/5 criteria)
- [ ] Email validation working
- [ ] Invitation tokens have 7-day expiry
- [ ] No sensitive data in logs
- [ ] Security headers sent (check DevTools Network)
- [ ] HTTPS enforced (should be automatic on Vercel)
- [ ] Supabase RLS policies enabled
- [ ] No hardcoded secrets in code

---

## Performance Monitoring

Once deployed, monitor:

```bash
# Core Web Vitals
vercel insights

# Metrics to track:
- LCP (Largest Contentful Paint) - target: < 2.5s
- FID (First Input Delay) - target: < 100ms
- CLS (Cumulative Layout Shift) - target: < 0.1
```

---

## Next Features to Deploy

After Phase 2 verification:

1. **Email Integration** (Next)
   - Wire Resend/Postmark
   - Send invitation emails
   - Deploy test

2. **Forgot Password** (Following)
   - Token-based reset
   - Email delivery

3. **Task Marketplace** (After)
   - Browse tasks
   - Self-nominate

---

## Troubleshooting

### Dev Server Won't Start
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Try again
pnpm dev
```

### TypeScript Errors
```bash
# Strict check
pnpm tsc --noEmit --strict

# Fix issues then retry
```

### Build Fails
```bash
# Check logs
pnpm build 2>&1 | tail -50

# Common issues:
# - Missing imports
# - Type errors
# - Environment variables not set
```

---

## Vercel Dashboard Setup

1. **Project Settings**
   - Build & Development Settings: Verify defaults
   - Environment Variables: Set SUPABASE keys

2. **Analytics**
   - Enable Web Analytics
   - Enable Speed Insights

3. **Integrations**
   - GitHub connected
   - Auto-deploy on push enabled

4. **Domains**
   - Configure custom domain (optional)
   - Add DNS records

---

## Support

If issues arise:

1. Check `BUILD_STATUS.md` for quick reference
2. See `PHASE_2_COMPLETE.md` for technical details
3. Review local logs: `pnpm dev`
4. Check Vercel logs: `vercel logs --prod`
5. Open issue on GitHub with logs

---

## Success Criteria

✅ Deployment is successful when:

- [ ] All routes respond (no 404s)
- [ ] Login works (tenant and admin)
- [ ] Accept-invite form displays
- [ ] Director settings page loads
- [ ] No console errors
- [ ] Performance scores > 80
- [ ] Mobile responsive (tested)
- [ ] Dark mode works

---

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Build | Done | ✅ Complete |
| Local Test | 5 min | Start here |
| Deploy | 10 min | Vercel CLI/GitHub |
| Production Test | 10 min | Verify routes |
| **Total** | **25 min** | |

---

**You're ready to deploy!** 🚀

Follow steps above and you'll be live in 25 minutes.

Questions? See documentation files in project root.

Built with Next.js 16 + React 19 + Supabase + TypeScript
