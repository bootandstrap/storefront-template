# 🔄 Secrets Rotation Runbook

> **Last updated**: 9 Feb 2026
> **Rotation cadence**: Every 90 days (production) · On-demand for breaches

---

## 1. Supabase Keys

### Anon Key & Service Role Key

1. Go to [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/<PROJECT_REF>/settings/api)
2. Click "Generate new JWT secret" (rotates both keys)
3. Update in all deployment environments:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → storefront, admin panel
   - `SUPABASE_SERVICE_ROLE_KEY` → storefront, admin panel, medusa
4. Redeploy all services
5. Verify health endpoints: `GET /api/health`

> [!CAUTION]
> Rotating the JWT secret invalidates ALL existing sessions. Schedule during maintenance window.

### Database Password

1. Go to [Supabase Dashboard → Settings → Database](https://supabase.com/dashboard/project/<PROJECT_REF>/settings/database)
2. Click "Reset database password"
3. Update `SUPABASE_DB_URL` in Medusa environments
4. Restart Medusa server + worker
5. Verify: `GET /health` on Medusa API

---

## 2. Medusa Secrets

### Cookie Secret & JWT Secret

1. Generate new secrets: `openssl rand -hex 32`
2. Update in `.env`:
   - `COOKIE_SECRET=<new-value>`
   - `JWT_SECRET=<new-value>`
3. Redeploy Medusa server + worker
4. All existing admin sessions will be invalidated

---

## 3. Test Account Passwords

> [!IMPORTANT]
> Change ALL default passwords before production deployment.

1. **SuperAdmin account**: Update via Supabase Auth dashboard or SQL:
   ```sql
   -- Use Supabase Dashboard → Authentication → Users → Reset password
   ```
2. **Test customer**: Same process
3. **Medusa admin**: Use `npx medusa user --email admin@medusajs.com --password <new>` or Medusa Admin UI

---

## 4. Stripe Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Roll the secret key → Update `STRIPE_SECRET_KEY`
3. Roll the publishable key → Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. For webhooks: create new endpoint → Update `STRIPE_WEBHOOK_SECRET`
5. Redeploy storefront + medusa

---

## 5. Resend API Key

1. Go to [Resend Dashboard → API Keys](https://resend.com/api-keys)
2. Revoke old key, create new one
3. Update `RESEND_API_KEY` in deployment
4. Verify: send test email from admin panel

---

## 6. Sentry Auth Token

1. Go to [Sentry → Settings → Auth Tokens](https://sentry.io/settings/auth-tokens/)
2. Revoke old token, create new one
3. Update `SENTRY_AUTH_TOKEN` in CI and deployment
4. Verify: trigger test error, check Sentry dashboard

---

## 7. Post-Rotation Checklist

- [ ] All services restarted and healthy (`/api/health`)
- [ ] Login works (storefront + admin panel)
- [ ] Payments work (if Stripe rotated)
- [ ] Emails send (if Resend rotated)
- [ ] Error tracking active (if Sentry rotated)
- [ ] Old keys revoked/deleted from secret manager
- [ ] Rotation date logged in team channel

---

## 8. Emergency: Suspected Breach

1. **Immediately rotate** all secrets listed above
2. Review Supabase audit logs for unauthorized access
3. Check Stripe for unexpected charges
4. Invalidate all sessions (rotate Supabase JWT secret)
5. Review git history for accidentally committed secrets:
   ```bash
   git log --all --diff-filter=A -- '*.env' 'CREDENTIALS.md'
   ```
6. If secrets were committed: use `git filter-repo` or BFG to purge from history
7. Document incident and timeline
