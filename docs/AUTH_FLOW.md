# Auth Flow — Flag-Driven Providers

## Overview

Supabase Auth handles all customer-facing authentication. Medusa receives a custom Auth Provider that validates Supabase JWTs. **Auth providers and registration requirements are feature-flag driven** — configurable per client without code changes.

## Feature Flags for Auth

| Flag | Default | Effect |
|------|---------|--------|
| `enable_email_auth` | `true` | Show email/password login form |
| `enable_google_auth` | `true` | Show "Continuar con Google" OAuth button |
| `enable_user_registration` | `true` | Show registration page |
| `enable_guest_checkout` | `true` | Allow checkout without account |
| `require_auth_to_order` | `false` | Force login before checkout |

## Customer Auth Flow

```
1. User visits storefront (Next.js 16)
2. Clicks "Iniciar Sesión"
3. Login page renders available providers from feature flags:
   - Email/password form (if enable_email_auth)
   - Google OAuth button (if enable_google_auth)
   - Future: any additional provider follows same pattern
4. Supabase returns JWT + sets httpOnly cookie via @supabase/ssr
5. proxy.ts reads cookie → validates session via getClaims()
6. Server Actions use Supabase server client (authenticated)
7. Medusa API calls include Supabase JWT in Authorization header
8. Medusa custom "supabase-auth" provider validates JWT
9. Medusa creates/finds AuthIdentity linked to Supabase user_id
```

## Admin Auth Flow

```
1. Admin navigates to Medusa Admin (:9000/app)
2. Medusa Admin uses its own built-in auth (email/password)
3. Admin operations go directly to Medusa API
4. Supabase admin operations use service_role key via Server Actions
```

## Route Protection (proxy.ts)

Next.js 16 uses `proxy.ts` (replaces deprecated `middleware.ts`):

| Route Pattern | Access |
|---------------|--------|
| `/[lang]/`, `/[lang]/productos/**` | Public — always accessible |
| `/[lang]/login`, `/[lang]/registro`, `/auth/**` | Public — auth pages |
| `/[lang]/checkout/**` | Conditional — protected if `require_auth_to_order` is `true` |
| `/[lang]/cuenta/**` | Protected — requires login (customer/owner/admin) |
| `/[lang]/panel/**` | Protected — requires `owner` or `super_admin` role |

## Implementation

### Supabase Clients

| Client | Location | Use |
|--------|----------|-----|
| Browser client | `lib/supabase/client.ts` | Client Components (anon key) |
| Server client | `lib/supabase/server.ts` | Server Components & Actions (cookies) |

### Medusa Custom Auth Provider (`apps/medusa/src/modules/supabase-auth/`)

```
supabase-auth/
├── index.ts          # ModuleProvider(Modules.AUTH, ...)
└── service.ts        # AbstractAuthModuleProvider implementation
```

The `authenticate()` method:
1. Extracts JWT from `Authorization: Bearer <token>` header or body
2. Validates via `supabase.auth.getUser(token)`
3. Creates or retrieves `AuthIdentity` linked to Supabase `user_id`
4. Returns `{ success: true, authIdentity }`

### Adding a New Auth Provider

1. Add flag: `enable_github_auth` to `feature_flags` table
2. Configure GitHub OAuth in Supabase Auth dashboard
3. Add button in login page gated by `featureFlags.enable_github_auth`
4. Auth callback route handles all OAuth providers automatically
