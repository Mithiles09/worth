# WorkLedger Database Setup Instructions

## Critical: Must Run BEFORE Application Works

The application requires database schema changes before it can function. Follow these steps exactly.

### Step 1: Execute SQL Queries in Supabase

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Copy ALL content from `/vercel/share/v0-project/SETUP_DATABASE.sql`
5. Paste into the SQL editor
6. Click "Run" button
7. Wait for all queries to complete successfully

**Important:** All queries must complete without errors. If you see errors related to missing tables or columns, the schema structure differs from expectations.

### Step 2: Verify Database Setup

Run these verification queries in Supabase SQL editor:

```sql
-- Check organizations table has creator_id
SELECT column_name FROM information_schema.columns 
WHERE table_name='organizations' AND column_name='creator_id';

-- Check org_units table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name='org_units';

-- Check invitations table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name='invitations';

-- Check RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
AND tablename IN ('organizations', 'org_units', 'users', 'invitations')
ORDER BY tablename;
```

### Step 3: Environment Variables

Ensure `.env.local` file contains:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These should already be set if you created the project via v0 integration.

### Step 4: Test the Application

1. Run: `npm run dev`
2. Navigate to `http://localhost:3000/admin/signup`
3. Try creating a test organization
4. If successful, you'll see organization created in dashboard
5. Click "Manage Organization" to access the OrgTreeBuilder

## Troubleshooting

### Error: "Could not find the table 'public.organizations' in the schema cache"
- **Solution:** Run the SQL setup queries again. The table exists but Supabase cache needs refresh.
- Try running: `SELECT * FROM organizations LIMIT 1;` in SQL editor to refresh cache.

### Error: "creator_id column does not exist"
- **Solution:** The ALTER TABLE command didn't execute properly. Run only this in SQL editor:
  ```sql
  ALTER TABLE organizations ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  CREATE INDEX idx_organizations_creator_id ON organizations(creator_id);
  ```

### Error: Permission denied on invitations
- **Solution:** Check that RLS policies were created properly. Re-run section 7 of SETUP_DATABASE.sql.

### Application runs but no organizations show
- **Solution:** 
  1. Verify you've completed the admin signup successfully
  2. Check that creator_id was saved for that organization
  3. Run in SQL: `SELECT * FROM organizations WHERE creator_id = '<your_user_id>';`

## Next Steps After Setup

Once database is ready:

1. Sign up at `/admin/signup` - creates organization as creator
2. Login to `/admin/dashboard` - see your created organizations
3. Click organization to access `/director` dashboard
4. Use OrgTreeBuilder to create departments
5. Invite team members via InviteMembersModal
6. Team members accept invites and join departments

## Important Notes

- Do NOT modify any SQL queries unless you understand the schema differences
- RLS policies protect data isolation between organizations
- All tables are encrypted with Supabase's built-in field-level encryption if enabled
- Keep `.env.local` secure - never commit to git

