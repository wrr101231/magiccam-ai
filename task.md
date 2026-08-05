# MagicCamAI — Supabase Migration Tasks

## Component 1: Supabase Database Schema
- [x] Create migration SQL with all 12 tables + RLS policies
- [x] Apply migration via MCP
- [x] Verify tables created

## Component 2: Supabase Client SDK
- [x] Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] Create `.env.local` with Supabase credentials
- [x] Create `src/lib/supabase/client.ts` (browser)
- [x] Create `src/lib/supabase/server.ts` (server)
- [x] Create `src/lib/supabase/admin.ts` (service-role)

## Component 3: Authentication Migration
- [x] Rewrite `src/lib/auth.ts`
- [x] Rewrite `api/auth/register/route.ts`
- [x] Rewrite `api/auth/login/route.ts`
- [x] Rewrite `api/auth/logout/route.ts`
- [x] Rewrite `api/auth/me/route.ts`
- [x] Create `src/proxy.ts` (updated to Next.js 16 convention)
- [x] Create `src/app/auth/callback/route.ts` (OAuth)

## Component 4: API Routes Migration
- [x] `api/licenses/route.ts`
- [x] `api/licenses/revoke/route.ts`
- [x] `api/purchases/create/route.ts`
- [x] `api/releases/route.ts`
- [x] `api/releases/[id]/route.ts`
- [x] `api/releases/upload/route.ts`
- [x] `api/downloads/request/route.ts`
- [x] `api/downloads/file/route.ts`
- [x] `api/downloads/history/route.ts`
- [x] `api/desktop/activate/route.ts`
- [x] `api/desktop/validate/route.ts`
- [x] `api/desktop/check-updates/route.ts`
- [x] `api/desktop/updates/route.ts`
- [x] `api/admin/overview/route.ts`
- [x] `api/admin/users/route.ts`
- [x] `api/admin/licenses/route.ts`
- [x] `api/admin/audit/route.ts`
- [x] `api/admin/storage/route.ts`

## Component 5: Desktop Application
- [x] Update `desktop/src/main/licensing.ts` portal URL
- [x] Update `desktop/src/main/config.json`

## Component 6: Realtime Subscriptions
- [x] Create `src/lib/supabase/realtime.ts`
- [x] Integrate into Dashboard page

## Component 7: Cleanup
- [x] Remove Prisma schema + SQLite database
- [x] Remove seed scripts
- [x] Remove `src/lib/db.ts`
- [x] Remove old dependencies from package.json

## Component 8: Vercel Deployment
- [x] Update `next.config.ts`
- [x] Create `vercel.json`
- [x] Create `.env.example`
- [x] Verify production build
