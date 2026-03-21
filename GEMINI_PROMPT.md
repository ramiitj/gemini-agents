# GetHolocron - Codebase Documentation & AI Context Guide

## Product Overview

GetHolocron is a **collaborative web development platform** that enables teams to experiment with UI/UX ideas, preview them live in production-like environments, and ship changes safely. It combines AI-assisted development, branch management, live previews, and team collaboration workflows.

**Core Philosophy:** "Experiment, Preview, Share, Ship" - each team member works in isolation with real-time production previews before sharing with the team.

**Key Value Propositions:**
- Private experiment spaces - personal branches for risk-free experimentation
- Live production previews - real-time changes on real Vercel deployments
- AI-powered development - multiple agent modes (code generation, design, search)
- Visual editing - click-to-edit UI elements directly in the preview
- Team collaboration - share previews, get feedback, manage approvals
- Zero-config deployment - automatic PR/commit creation, one-click merging

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix UI primitives) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Edge Functions | Deno runtime |
| State Management | TanStack Query (React Query) + Supabase Realtime |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Charts | Recharts |
| Notifications | Sonner (toast) |
| Onboarding | React Joyride |
| Theming | next-themes (dark/light mode) |

---

## Project Structure

```
/src
  /pages              - Route-level page components
  /components
    /activity          - Activity feed and logs
    /admin             - Admin panel pages (dashboard, users, billing, etc.)
    /approvals         - Approval workflow UI
    /auth              - Auth forms (sign in, sign up, reset)
    /brand             - Branding customization
    /chat              - Chat UI, message rendering, search results, design panels
    /dashboard         - Dashboard views (project grid, org switcher)
    /landing           - Public landing page (Hero, Features, HowItWorks, etc.)
    /layout            - AppSidebar, TeamSidebar
    /notifications     - Notification components
    /onboarding        - Onboarding tours and welcome modals
    /preview           - Preview iframe, diff viewer, visual editing overlay
    /settings          - GitHub/Vercel connection settings
    /team              - Team collaboration (chat, members, actions)
    /ui                - shadcn/ui component library
  /hooks               - React hooks for data fetching and state
  /lib                 - Utilities (message parsing, visual editing, syntax highlighting)
  /types               - TypeScript interfaces
  /integrations/supabase - Supabase client + auto-generated types

/supabase
  /functions           - Deno edge functions
    /_shared           - Shared auth middleware
    /ai-agent          - Main AI execution engine
    /github-*          - GitHub API operations
    /vercel-*          - Vercel deployment operations
    /stitch-generate   - Google Stitch design generation
    /capture-screenshot - Screenshot via Puppeteer
    /create-user-branch - Branch creation for new members
    /generate-diff     - Diff generation
    /team-agent-action - Team action execution
  /migrations          - Database schema migrations
  /config.toml         - Supabase configuration

/public                - Static assets
```

---

## Routing Structure

### Public Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Index` | Landing page (Hero, Features, How It Works) |
| `/auth` | `Auth` | Sign In / Sign Up with pending invitation detection |
| `/auth/reset-password` | `ResetPassword` | Password reset flow |

### Authenticated Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard` | `Dashboard` | Project listing & organization management |
| `/project/:id` | `Project` | Project workspace (chat + preview split view) |
| `/settings` | `Settings` | Organization & team settings |
| `/accept-invite/:token` | `AcceptInvite` | Team invitation acceptance |

### Admin Routes (Protected)
| Path | Description |
|------|-------------|
| `/admin` | Admin authentication portal |
| `/admin/dashboard` | Platform overview (user/project/org stats) |
| `/admin/users` | User management |
| `/admin/branding` | Platform branding customization |
| `/admin/models` | LLM model configuration |
| `/admin/behavior` | Agent behavior settings |
| `/admin/billing` | Billing & subscription management |
| `/admin/logs` | System activity logs |

### Catch-All
| Path | Component | Description |
|------|-----------|-------------|
| `*` | `NotFound` | 404 page |

---

## Data Models (Supabase Tables)

### Core Domain
- **`organizations`** - Team/workspace (id, name, slug, created_at)
- **`projects`** - Individual projects (id, name, organization_id, github_repo, vercel_project_id)
- **`profiles`** - User profiles (id, user_id, full_name, username, avatar_url)

### Users & Access Control
- **`user_roles`** - Organization membership (user_id, organization_id, role: owner/admin/editor/viewer, custom_role_id, custom_permissions)
- **`custom_roles`** - Organization-defined roles (id, organization_id, name, permissions JSON)
- **`project_members`** - Project-level membership (user_id, project_id, role, branch_name)
- **`invitations`** - Team invitations (email, organization_id, project_id, token, status: pending/accepted, expires_at, role)
- **`admin_users`** - Admin permissions (user_id, role: admin/super_admin)

### Agent & Conversation
- **`conversations`** - Chat histories (id, project_id, created_by, title)
- **`messages`** - Chat messages (id, conversation_id, role: user/assistant/system, content, code_changes JSON, status)
- **`agent_sessions`** - Per-user agent state (project_id, user_id, github_owner, github_repo, current_branch, staged_files, vercel_project_id, agent_mode)
- **`agent_runs`** - Execution tracking (conversation_id, project_id, status, current_step, error_message, metadata)
- **`agent_activity`** - Activity logging (activity_type, conversation_id, project_id, status, details)

### Code & Changes
- **`code_changes`** - File modifications (project_id, conversation_id, file_path, status: added/modified/deleted, original_content, modified_content, diff_content, approved_at)
- **`change_requests`** - PR/merge requests (project_id, branch_name, files, summary, pr_url, created_by)

### Collaboration
- **`team_actions`** - Team activity (project_id, action_type: approval_request/approved/rejected/merge_request/merged, branch_name, preview_url, initiated_by, acted_by)
- **`team_comments`** - Comments on changes (conversation_id/team_action_id, user_id, content)
- **`team_notifications`** - User notifications
- **`unread_messages`** - Message read status

### Design & Gallery
- **`design_gallery`** - Saved designs (id, name, code, image_url, medium: web/app, tags, project_id, organization_id, created_by)

### Deployment & Integration
- **`deployments`** - Vercel deployment records (project_id, branch_name, deployment_id, status, url)
- **`github_integrations`** - GitHub connections (user_id, project_id, access_token, repo, owner)
- **`vercel_integrations`** - Vercel connections (project_id, access_token, team_id)

### Logging
- **`activity_log`** - User action logs (action, organization_id, project_id, user_id, metadata)
- **`admin_activity_log`** - Admin action logs (action, admin_user_id, entity_type, entity_id, details)

### Enums
- `app_role` = "owner" | "admin" | "editor" | "viewer"
- `agent_mode` = "execution" | "chat" | "web_search" | "image_search" | "design"

---

## Authentication Flow

### Sign Up
1. User enters email, password, name, username
2. System checks for pending invitations (case-insensitive email match)
3. If invitation exists, displays org name and auto-join info
4. Password validated against HaveIBeenPwned API (rejected if compromised)
5. Account created via Supabase Auth + profiles table
6. Auto-creates organization on first signup (if none exist)

### Sign In
1. Email + password authentication via Supabase Auth
2. Auto-accept pending organization invitations
3. Auto-create personal branch for any invited projects
4. Redirect to dashboard

### Session Management
- JWT tokens with auto-refresh
- Event listeners for TOKEN_REFRESHED / SIGNED_OUT
- Persistent session in localStorage

### Admin Auth
- Separate `/admin` login endpoint
- Checks `admin_users` table for privileges
- Only "admin" or "super_admin" roles can access admin routes

---

## Feature Modules

### 1. Chat & AI Agent

**Agent Modes:**
- `execution` - Code generation & file modifications
- `chat` - General conversation & planning
- `web_search` - Research web docs, articles, patterns
- `image_search` - Find UI inspiration, icons, images
- `design` - Generate UI via Google Stitch integration

**Message Types:**
- User messages (with optional attachments: screenshots, files)
- Assistant responses (with code blocks, diffs, metadata)
- System messages (status updates)

**Context Attachments:**
- Screenshots from live preview
- File uploads (images, documents)
- Search results (pinned/unpinned)
- Design outputs (images + code)
- Visual element selection from preview

**Grounding Metadata:**
- Web search results with citations
- Search entry points for transparency
- Image search thumbnails

**Real-time Features:**
- Postgres realtime subscriptions on messages table
- Typing indicators for team members
- Live agent activity feed

### 2. Preview & Deployment

**Live Deployment:**
- Trigger builds on user branches via Vercel API
- Auto-deployments on code changes
- Branch-specific URLs

**Visual Editing:**
- Overlay system injected into iframe
- Click-to-edit element selection
- Displays computed styles, selectors, bounding boxes
- Send selected element + request to AI agent

**Preview Tabs:**
- **Preview** - Live Vercel deployment preview
- **Changes** - Diff viewer (file by file with hunks)
- **Files** - Explore modified files in repo

### 3. Code Changes & Approval

- Captures diffs, original/modified content
- Tracks additions/deletions line counts
- Stores conversation context per change
- Approval workflow (marked with approved_at, approved_by)
- Structured diff parsing with syntax highlighting

### 4. Team Collaboration

**Team Sidebar:**
- Organization members with avatars
- Project-specific collaborators
- Tabs: Discussions (chat), Members, Project Collaborators

**Team Chat:**
- Real-time messaging with unread badges
- Per-project/organization channels
- Comments on specific changes/PRs

**Notifications:**
- Unread message counts
- Team action notifications (approvals, merges)
- Activity feed

### 5. Team Management

**Members & Roles:**
- Invite members by email with token-based invitation links
- Default roles: owner, admin, editor, viewer
- Custom roles with permission matrices
- Role-based access control (RLS in Supabase)

**Permissions:**
- Owner: full control, billing
- Admin: manage team, settings
- Editor: create/modify projects
- Viewer: read-only access
- Custom roles with granular permissions

### 6. Design Studio

- Integration with Google Stitch for design generation
- Design Gallery: organize by tag, medium (web/app), search/filter
- Use designs as visual reference + code context in chat
- Chain multiple designs in workflow

### 7. Onboarding & Tours

- Dashboard tour for new users (org creation, project creation)
- Project tour on first visit (chat, preview, team sidebar)
- Welcome modals and creation wizards

---

## Edge Functions (Deno)

### GitHub Operations
| Function | Purpose |
|----------|---------|
| `github-clone-repo` | Clone repo to temp workspace with auth |
| `github-read-file` | Read file contents from repo |
| `github-commit-push` | Create blobs, tree, commit, push to branch |
| `github-create-pr` | Create PR from branch to main |
| `generate-diff` | Generate human-readable diffs |

### Vercel Integration
| Function | Purpose |
|----------|---------|
| `vercel-create-project` | Create new Vercel project linked to GitHub |
| `vercel-deploy` | Trigger deployment on branch/ref |
| `vercel-status` | Poll deployment status |
| `vercel-branch-status` | Check branch deployment state |
| `update-project-vercel` | Update project's Vercel integration |

### Core Agent
| Function | Purpose |
|----------|---------|
| `ai-agent` | Main AI execution engine with tool definitions (file ops, git ops, Vercel ops). Streams responses with tool calls/results |
| `team-agent-action` | Team action execution (approvals, merges, notifications) |

### AI Agent Tools
The `ai-agent` edge function has access to these tools:
- `github_clone_repo`, `file_read`, `file_write`, `file_delete`
- `list_directory`, `search_code`
- `analyze_dependencies`, `add_dependency`
- `generate_diff`, `git_add_commit_push`
- `vercel_create_project`, `vercel_trigger`, `vercel_status`

### Design & Utility
| Function | Purpose |
|----------|---------|
| `stitch-generate` | Google Stitch design generation |
| `capture-screenshot` | Screenshot preview via Puppeteer |
| `create-user-branch` | Create personal branch for new project member |

### Shared
- `_shared/auth.ts` - JWT validation middleware for all functions

---

## React Hooks

### Authentication & Organization
| Hook | Purpose |
|------|---------|
| `useAuth()` | User session, signIn/signUp/signOut |
| `useOrganization()` | Current org, org list, auto-invitation acceptance |
| `useAdminAuth()` | Admin status checking |

### Project & Team
| Hook | Purpose |
|------|---------|
| `useProjects()` | Projects list, create project |
| `useTeam()` | Team members, roles, permissions |
| `useProjectMembers()` | Project-specific members |
| `usePermissions()` | Check user permissions |
| `useUserRole()` | Current user role, canMerge/canEdit checks |

### Agent & Conversation
| Hook | Purpose |
|------|---------|
| `useConversation()` | Fetch/create conversation, send messages, real-time subscriptions |
| `useAgentSession()` | Agent state (current_branch, staged_files, agent_mode), mode updates |
| `useAgentActivity()` | Agent activity feed for project |
| `useCodeChanges()` | Code changes fetch, approval workflow |
| `useChangeRequests()` | PR/change request creation |

### Deployment & Integration
| Hook | Purpose |
|------|---------|
| `useDeployment()` | Vercel deployment trigger, status polling |
| `useBranchDeployment()` | Branch-specific deployment status |

### Collaboration
| Hook | Purpose |
|------|---------|
| `useTeamActions()` | Parse/manage team actions (approvals, merges) |
| `useTeamComments()` | Comments on changes |
| `useUnreadMessages()` | Unread message count |
| `useTypingIndicator()` | Who's typing indicator |

### UI & Features
| Hook | Purpose |
|------|---------|
| `useDesignGallery()` | Save/load design gallery |
| `useOnboardingTour()` | Tour completion tracking |
| `useAdminSettings()` | Admin settings management |
| `useCustomRoles()` | Organization custom roles |
| `usePasswordCheck()` | Check if password is pwned (HaveIBeenPwned API) |

### Utility
| Hook | Purpose |
|------|---------|
| `use-toast()` | Toast notification API |
| `use-mobile()` | Mobile breakpoint detection |

---

## Key Components

### Layout
- **`AppSidebar`** - Main navigation (projects, settings, logout)
- **`TeamSidebar`** - Team/collaboration panel (3 tabs: chat, members, project collaborators)
- **`AdminLayout`** - Admin page wrapper with navigation

### Chat System
- **`ChatContainer`** - Main chat orchestrator (modes, context, subscriptions)
- **`ChatInput`** - Message input with attachments, mode toggle
- **`MessageList`** - Scrolling message history with real-time updates
- **`MessageBubble`** - Individual message rendering with block parsing

### Chat Message Blocks
- `PhaseHeader` - "# Phase 1:" style headers
- `SectionHeader` - Numbered section headers
- `CodeBlockEnhanced` - Syntax-highlighted code with copy/action
- `FileReference` - File path references
- `ActionBlock` - Agent/user action status (pending/in-progress/complete)
- `NoteBlock` - Info/warning/important notes
- `ListBlock` - Bullet-point lists

### Search & Results
- `SearchResultsPanel` - Web search results with pins
- `SearchResultCard` - Individual result with snippet
- `ImageResultsGrid` - Image search results gallery
- `DesignResultsPanel` - Design outputs with variants

### Preview System
- **`PreviewPanel`** - Main preview orchestrator (tabs, status, mode toggle)
- **`PreviewFrame`** - Iframe renderer with visual edit overlay
- **`DiffViewer`** - File-by-file diff browser
- **`FileList`** - Repository file explorer
- **`ElementInfoPanel`** - Selected element details
- **`VisualEditOverlay`** - Click detection + highlighting

### Design
- `DesignStudioPanel` - Design gallery + Stitch import UI
- `DesignGalleryModal` - Browse/manage saved designs
- `StitchImportModal` - Import Stitch design form

### Team
- `InviteMemberModal` - Send invitations form
- `MemberCard` - Team member display
- `ProjectCollaborators` - Project-specific members
- `TeamChat` - In-project messaging
- `ChangeShareDialog` - Share preview with team for review

---

## Lib Utilities

### `message-parser.ts`
Parses AI response text into structured `MessageBlock[]` objects. Detects: phase headers, section headers, code blocks, file references, agent actions, user actions, notes, and lists. Preserves code blocks and prevents re-parsing.

### `visual-edit-injector.ts`
Injects scripts into the preview iframe for element selection. Creates an overlay system (highlight + selection), generates CSS selectors for elements, captures computed styles, bounding boxes, and attributes. Returns `ElementInfo` with full DOM node details.

### `syntax-highlighter.tsx`
Tokenizes code line-by-line and applies syntax highlighting. Supports keywords, types, strings, comments, numbers, and operators. Returns React components for colored code display.

---

## Key Workflows

### Execution Workflow
1. User enters prompt in chat
2. Switch to "execution" mode if needed
3. Send message to `ai-agent` edge function
4. Agent reads repo, analyzes dependencies, generates code
5. Writes files, commits to user's branch
6. Vercel auto-deploys branch
7. Preview updates in real-time
8. Agent streams response with diff, file changes
9. Code changes recorded in database
10. Team can review, request changes, or approve merge

### Team Review Workflow
1. User shares preview branch with team
2. Creates team action (`approval_request`)
3. Team sees preview URL, file list, summary
4. Can comment on changes
5. Admin/owner reviews diffs
6. Approves/rejects changes
7. Once approved, one-click merge to main
8. Main branch auto-deploys to production

### Search & Research Workflow
1. User switches to `web_search` or `image_search` mode
2. Types query
3. Agent performs search
4. Results displayed with thumbnails/snippets
5. User pins relevant results
6. Pinned results become context for execution mode

### Design Workflow
1. User switches to "design" mode
2. Opens Google Stitch design tool
3. Designs UI in Stitch
4. Exports design (image + code)
5. Imports into GetHolocron
6. Agent generates code from design
7. Iterates with agent or moves to execution

---

## Security & Access Control

### Row-Level Security (RLS)
- All tables protected with RLS policies
- Users see only their organization's data
- Custom role permissions enforced at database level

### Authentication
- JWT tokens from Supabase Auth with auto-refresh
- Admin-specific auth routes with separate privilege checking
- Password validation against HaveIBeenPwned API

### API Security
- Edge functions validate auth via JWT (`_shared/auth.ts`)
- Role-based access checks (editor+ for commits, admin+ for management)
- Environment variables for secrets (GitHub PAT, Vercel tokens)

---

## Real-time Features

### Postgres Changes Subscriptions
- Messages (append-only in conversations)
- Agent sessions (mode changes)
- Code changes (new diffs/approvals)
- Team actions (approvals/merges)
- Typing indicators

### WebSocket Channels
- Per-conversation message channel
- Per-project agent session channel
- Per-project code changes channel
- Per-conversation typing indicators

---

## Deployment Architecture

| Component | Platform |
|-----------|----------|
| Frontend | Vite + React deployed to Vercel / static host |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Preview Deployments | Per-branch Vercel deployments |

**Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**External Integrations:**
- GitHub API (clone, read, commit, PR creation)
- Vercel API (project creation, deployment, status)
- Google Stitch (design generation)
- Google Custom Search (web search)
- HaveIBeenPwned API (password security)

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```
