# Admin Signup - Quick Reference

## For Testing

### Admin Signup Page
- **URL:** `http://localhost:3000/admin/signup`
- **Form Fields:**
  - Organization Name (required)
  - First Name (required)
  - Last Name (required)
  - Email Address (required, must be valid)
  - Password (required, 12+ chars)
  - Confirm Password (required, must match)

### Password Requirements (All 5 Required)
- ✅ At least 12 characters
- ✅ One uppercase letter (A-Z)
- ✅ One lowercase letter (a-z)
- ✅ One number (0-9)
- ✅ One special character (!@#$%^&*)

### Example Valid Password
```
TestPassword123!
```

### What Happens on Submit
1. Form validates locally
2. Password strength checked (must be 5/5)
3. Passwords must match
4. POST to `/api/admin/signup`
5. API validates email/org name uniqueness
6. Creates in atomic transaction:
   - auth.users account
   - organizations record
   - users profile (PLATFORM_ADMIN role)
   - organization_members record
7. Success page shows
8. Auto-redirects to /admin/dashboard after 1.5 seconds

### Test Data
```
Organization Name: "State University"
First Name: "Alice"
Last Name: "Smith"
Email: "alice.smith@stateuniversity.edu"
Password: "SecurePassword2024!"
```

---

## For Debugging

### Check if Organization Created
```sql
SELECT * FROM organizations 
WHERE name = 'State University';
```

### Check if User Profile Created
```sql
SELECT user_id, email, first_name, last_name, role, org_id, status
FROM users 
WHERE email = 'alice.smith@stateuniversity.edu';
```

### Check if Membership Created
```sql
SELECT * FROM organization_members 
WHERE org_id = (SELECT org_id FROM organizations WHERE name = 'State University');
```

### Check Webhook Logs (Supabase)
- Go to Supabase dashboard
- Edge Functions → Logs
- Look for `user.created` events
- Verify HMAC signature passed
- Verify public.users profile created

### Check API Logs (Vercel)
- Go to Vercel project
- Functions → Logs
- Look for `/api/admin/signup` POST requests
- Check for errors or success messages

---

## Environment Variables Needed

Add to `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
WEBHOOK_SIGNATURE_SECRET=xxxxx
```

Or in Vercel project settings for production.

---

## Common Issues & Fixes

### "Email already registered"
- Email already exists in auth.users
- Use different email address
- Or delete user in Supabase dashboard first

### "Organization name already taken"
- Someone already created this org
- Use different organization name

### "Password does not meet security requirements"
- Password strength meter must show 5/5 green
- Add uppercase, lowercase, number, and special char
- Must be at least 12 characters

### "Passwords do not match"
- Confirm Password field must exactly match Password field
- Recheck both fields

### Signup succeeds but no profile created
- Check webhook is configured in Supabase
- Verify WEBHOOK_SIGNATURE_SECRET matches
- Check webhook logs for errors
- Webhook may take a few seconds

### Can't login after signup
- Check user exists in public.users
- Check auth.users in Supabase
- Verify email/password correct
- Try logout completely first

### Organization created but admin redirect fails
- Check /admin/dashboard exists
- Check database connection working
- Check logs for dashboard load errors

---

## API Response Examples

### Success (201)
```json
{
  "success": true,
  "message": "Organization created successfully",
  "org_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "987fcdeb-51a2-43e1-92b9-7f14a8d71234"
}
```

### Email Already Exists (400)
```json
{
  "error": "Email already registered"
}
```

### Org Name Taken (400)
```json
{
  "error": "Organization name already taken"
}
```

### Server Error (500)
```json
{
  "error": "Failed to create authentication account"
}
```

---

## Related Pages

- Admin Login: `/admin/login`
- Admin Dashboard: `/admin/dashboard`
- Tenant Login: `/login`
- Invite Acceptance: `/accept-invite?token=XXX`
- Director Settings: `/director/settings`

---

## Files Modified

- `app/admin/signup/page.tsx` - New signup page
- `app/api/admin/signup/route.ts` - New API endpoint
- `app/api/webhooks/supabase/route.ts` - Webhook handler
- `app/admin/login/page.tsx` - Added signup link
- `lib/security.ts` - Added webhook verification

---

## Next Steps

1. ✅ Admin can signup
2. ✅ Admin can login
3. ✅ Webhooks map users to profiles
4. ⏳ Email integration (pending)
5. ⏳ Password reset (pending)
6. ⏳ Task marketplace (pending)

See `agentscontext.md` for full roadmap.
