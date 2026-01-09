# Database Migration Guide - Critical Fix for Product Compass Workflow

## 🔴 CRITICAL: Apply This Migration Immediately

Your Product Compass application is missing **3 essential database tables** that are blocking the entire approval workflow. This migration file has been created and committed:

**File**: `supabase/migrations/20260109025921_add_missing_tables.sql`

---

## 📋 What This Migration Does

This migration creates 3 critical tables:

### 1. `code_changes` (HIGHEST PRIORITY)
- **Purpose**: Stores AI-generated code modifications before team approval
- **Why It's Critical**: Without this, the AI can't save changes for review
- **Impact**:
  - AI modifications are lost immediately
  - Preview panel's "Changes" tab is always empty
  - "Approve changes" button has nothing to approve
  - Deployment automation can't link to code changes

### 2. `invitations`
- **Purpose**: Manages team member invitation tokens
- **Why It's Critical**: Can't invite new team members
- **Impact**:
  - Invite modal fails silently when submitting
  - Team can't grow beyond initial owner
  - No way to share projects with collaborators

### 3. `change_requests`
- **Purpose**: Tracks approval workflows for team visibility
- **Why It's Critical**: Team can't see or coordinate on pending changes
- **Impact**:
  - No audit trail for approvals
  - No notifications to team members
  - No way to track who approved what

---

## 🚀 How to Apply the Migration

### Method 1: Via Supabase Dashboard (RECOMMENDED - 2 minutes)

1. **Go to your Supabase project dashboard**
   - Navigate to https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open the SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy the migration SQL**
   - Open the file: `supabase/migrations/20260109025921_add_missing_tables.sql`
   - Copy ALL contents (195 lines)

4. **Paste and run**
   - Paste into the SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - Wait for "Success" message (should take ~2 seconds)

5. **Verify tables were created**
   - Click "Table Editor" in sidebar
   - Look for these new tables:
     - ✅ `code_changes`
     - ✅ `invitations`
     - ✅ `change_requests`

---

### Method 2: Via Supabase CLI (If you have it installed)

```bash
# Navigate to project directory
cd /path/to/gemini-agents

# Link to your Supabase project (first time only)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push

# Or if installed globally
supabase db push
```

---

### Method 3: Via Local Development (For testing)

```bash
# Start local Supabase
npx supabase start

# Apply migration locally
npx supabase db reset

# When ready, push to remote
npx supabase db push
```

---

## ✅ Verification Steps

After applying the migration, verify everything works:

### 1. Check Tables Exist
In Supabase Dashboard → Table Editor, you should see:
- `code_changes` (with columns: id, project_id, file_path, status, original_content, modified_content, etc.)
- `invitations` (with columns: id, email, token, organization_id, role, status, etc.)
- `change_requests` (with columns: id, project_id, title, description, status, etc.)

### 2. Test Row Level Security (RLS)
All 3 tables should have:
- ✅ RLS enabled
- ✅ Multiple policies (select, insert, update)
- ✅ Realtime enabled (for `code_changes` and `change_requests`)

### 3. Check Indexes
In SQL Editor, run:
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('code_changes', 'invitations', 'change_requests')
ORDER BY tablename, indexname;
```

You should see indexes like:
- `idx_code_changes_project_id`
- `idx_code_changes_approved_at`
- `idx_invitations_token`
- `idx_change_requests_project_id`

---

## 🧪 Testing the Fixed Workflow

Once migration is applied, test the complete flow:

### Test 1: AI Code Changes
1. Go to a project in Product Compass
2. Switch AI to "Execute" mode
3. Send a message: "Add a comment to App.tsx"
4. **Expected behavior**:
   - AI reads the file
   - AI modifies and writes the file
   - **NEW**: Change appears in Preview → "Changes" tab
   - You see the diff with additions/deletions
   - "Approve changes" button is enabled

### Test 2: Approval Workflow
1. Click "Approve changes" button
2. **Expected behavior**:
   - Changes are marked as approved in database
   - GitHub commit is created on your user branch
   - Vercel deployment is automatically triggered
   - Activity log records the approval
   - Preview URL updates with new deployment

### Test 3: Team Invitations
1. Go to Settings → Team
2. Click "Invite member"
3. Enter email and role, click "Send invitation"
4. **Expected behavior**:
   - Success toast with invitation link
   - New row in `invitations` table
   - Invitation email sent (if email configured)
   - Invited user can sign up via link

---

## 🐛 Troubleshooting

### Problem: "RLS policy violation" errors
**Solution**: Make sure you're logged in as a user who is a member of the organization. The RLS policies require you to be in `user_roles` table for the organization.

### Problem: "code_changes table does not exist"
**Solution**: Migration wasn't applied. Go back to "How to Apply" section.

### Problem: "No pending changes to approve"
**Solution**: This is expected if:
1. AI hasn't made any changes yet in this session, OR
2. All changes have already been approved

Try making a new change via AI chat in Execute mode.

### Problem: Realtime updates not working
**Solution**: Check that realtime is enabled:
```sql
-- Run in SQL Editor
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('code_changes', 'change_requests');
```

Should return both table names. If not, re-run the migration.

---

## 📊 Migration File Details

**Location**: `supabase/migrations/20260109025921_add_missing_tables.sql`

**Size**: ~195 lines of SQL

**What it includes**:
- 3 table definitions with proper constraints
- 9 RLS policies across all tables
- 11 performance indexes
- 2 realtime publication entries
- 1 trigger for `updated_at` auto-update
- Comprehensive comments for documentation

**Safe to run**: Yes, this is a pure additive migration. It:
- ✅ Only creates new tables (doesn't modify existing ones)
- ✅ Uses `IF NOT EXISTS` where applicable
- ✅ Won't break existing data
- ✅ Can be run multiple times safely (idempotent for most operations)

---

## 🎯 Expected Results After Migration

### Before Migration (BROKEN)
- ❌ AI changes disappear after execution
- ❌ Preview "Changes" tab always empty
- ❌ Can't approve changes
- ❌ Can't invite team members
- ❌ No approval workflow
- ❌ Manual GitHub/Vercel management required

### After Migration (WORKING)
- ✅ AI changes saved to database
- ✅ Preview shows all pending changes
- ✅ One-click approval button works
- ✅ Team invitations functional
- ✅ Full approval workflow active
- ✅ Automated GitHub push + Vercel deploy
- ✅ Team notifications and activity log
- ✅ Multi-user collaboration enabled

---

## 🚨 IMPORTANT NOTES

1. **Backup First** (Optional but recommended)
   - Supabase has automatic backups, but you can create a manual one:
   - Dashboard → Database → Backups → "Create backup"

2. **Production vs Development**
   - Apply to **development/staging first** if you have one
   - Test thoroughly before applying to production
   - If you only have production, just apply it (it's safe)

3. **Permissions Required**
   - You need project **Owner** or **Admin** access in Supabase
   - SQL Editor requires these permissions to create tables

4. **No Downtime**
   - This migration causes **zero downtime**
   - Existing functionality continues to work
   - New features become available immediately

5. **Team Communication**
   - Notify your team after applying the migration
   - They may need to refresh their browser
   - Any in-progress AI chats should be restarted

---

## 📞 Still Having Issues?

If the migration succeeds but the workflow still doesn't work:

1. **Check browser console** (F12) for errors
2. **Check Supabase logs** (Dashboard → Logs)
3. **Verify environment variables** in edge functions:
   - `GITHUB_PAT` set correctly
   - `VERCEL_TOKEN` set correctly
   - `GOOGLE_SERVICE_ACCOUNT_JSON` set correctly

4. **Check the agent_sessions table**:
   ```sql
   SELECT * FROM agent_sessions WHERE user_id = auth.uid();
   ```
   Should show your current branch and session state

---

## Next Steps After Migration

1. ✅ Apply the migration
2. ✅ Verify tables exist
3. ✅ Test AI code changes workflow
4. ✅ Test team invitations
5. ✅ Monitor the activity log
6. 🎉 Start collaborating with your team!

---

**Migration created**: 2026-01-09
**Committed in**: `claude/explain-codebase-mk6a1m8nmi8wl6p4-BEHKf`
**File**: `supabase/migrations/20260109025921_add_missing_tables.sql`
