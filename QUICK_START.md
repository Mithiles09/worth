# WorkLedger - Quick Start (5 Minutes)

## You Must Do This First

### 1. Execute SQL (2 minutes)

Open your Supabase dashboard:
- Go to SQL Editor
- Create new query
- Copy ALL from: `SETUP_DATABASE.sql`
- Click Run

That's it. All database tables will be created.

### 2. Start App (1 minute)

```bash
npm run dev
```

Visit: `http://localhost:3000/admin/signup`

### 3. Create Organization (1 minute)

Fill in:
- Admin Email: `admin@test.com`
- Password: `SecureTest123456`
- Name: `Test Organization`

Click Sign Up.

### 4. Access Dashboard (1 minute)

- You'll be redirected to admin dashboard
- Click on your organization
- You enter Director Dashboard
- Click "Institution Structure" tab
- You see OrgTreeBuilder component

**Done!** Everything is working.

---

## What Each Role Can Do

### Platform Admin (`/admin/signup` → `/admin/dashboard`)
- See all organizations they created
- Click organization to access as Director

### Director (in Organization)
- Build department structure in OrgTreeBuilder
- Invite team members
- Access Finance & Dean features

### Organization Lead (department lead)
- See team members in Lead Dashboard
- Create tasks for team
- Approve task completions

### Finance Admin
- View token pools
- See transaction ledger
- Execute month-end batch processing

### Team Member
- See assigned tasks
- Submit task work
- Request emergency loans
- Track token balance

---

## File Locations

- **Database Setup:** `SETUP_DATABASE.sql`
- **Setup Guide:** `DATABASE_SETUP_INSTRUCTIONS.md`
- **Complete Docs:** `BUILD_COMPLETE.md`
- **Full Architecture:** `V0_DEEP_CONTEXT_ANALYSIS.md`

---

## If It Breaks

**Error: "Table not found"**
→ You didn't run the SQL. Go do step 1 above.

**Error: "No organizations showing"**
→ Make sure you completed the signup. It creates organization in database.

**Error: "Permission denied"**
→ Re-run the SQL. Check RLS policies section.

**App won't start**
→ Check `.env.local` has Supabase URL and key
→ Run `npm install` first

---

## What Was Built

✅ All 5 role dashboards with real database queries  
✅ Organization hierarchy management  
✅ Team member invitation system  
✅ Task assignment workflow  
✅ Token wallet system  
✅ Approval workflow  
✅ Emergency loans  
✅ Financial ledger  
✅ Complete RLS security  

**No mock data anywhere - everything is real database queries.**

---

## Next Things to Try

1. Create departments in OrgTreeBuilder
2. Invite team members via "Manage Team"
3. Accept invitation and join organization
4. Get assigned a task
5. Submit task for approval
6. Check token balance

Enjoy! 🚀
