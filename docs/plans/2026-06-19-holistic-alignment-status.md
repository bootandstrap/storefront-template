# Holistic Alignment Status

Fecha de referencia: `2026-06-19`

## Scope real de esta pasada

Esta sesion alineo `ecommerce-template` a nivel holistico en tres capas:

1. guardrails de agente repo-local (`AGENTS.md` / Ponytail)
2. docs IA y docs de soporte que describen la verdad del runtime
3. suites de tests del storefront y contratos estructurales conectados a `BOOTANDSTRAP_WEB`

No convirtio el runtime en control plane SaaS self-service. No debe usarse esta evidencia para afirmar que ya existe alta one-click de tenant, provisioning completo o admin plane cerrado.

## Estado verificado

### ecommerce-template

- `AGENTS.md`, `GEMINI.md`, `README.md` y `docs/README.md` quedaron alineados con el uso repo-local de Ponytail y con la jerarquia documental real.
- El contrato de configuracion por modulos fue rebasado a la SSOT actual:
  - `src/lib/registries/module-config-schemas.ts`
  - `src/app/[lang]/(panel)/panel/modulos/[module]/ModuleConfigClient.tsx`
- Los contratos de seguridad y panel se rebasaron a rutas, flags y ownership reales actuales.
- Se corrigio una guardia funcional real:
  - `src/app/api/panel/email-domain/verify/route.ts` ahora exige `enable_custom_email_domain`, igual que las rutas `GET/POST`.

### Suites storefront

Verificacion ejecutada:

```bash
pnpm --filter storefront test:run
```

Resultado:

- `95/95` archivos de test verdes
- `1389/1389` tests verdes

Esto confirma coherencia interna entre runtime, contratos, docs IA y guardrails repo-locales del storefront.

### BOOTANDSTRAP_WEB

Verificacion focal ejecutada en esta sesion:

```bash
npm run test:run -- src/__tests__/governance/governance-hub-drift.test.ts src/__tests__/governance/governance-hub-pricing.test.ts src/__tests__/governance/contract-import-paths.test.ts src/__tests__/doc-sync/doc-contracts.test.ts src/__tests__/supabase/ground-truth-alignment.test.ts
```

Resultado:

- `61` tests verdes

Esto valida que la parte documental/ground-truth que consume `ecommerce-template` no estaba desfasada en esos puntos y que `BOOTANDSTRAP_WEB` ya no está mezclando surfaces activas de governance con la copia legacy del contrato. No equivale a certificacion completa del control plane.

## Lo que SI significa

- el repo local de `ecommerce-template` ya no tiene drift rojo entre docs IA, Ponytail repo-local y suites del storefront
- los contratos que estaban fallando por rutas antiguas, nombres de flags viejos o expectativas congeladas quedaron rebasados a la arquitectura actual
- `BOOTANDSTRAP_WEB` ya fuerza que governance hub, pricing hub y generación de admin schemas lean el contrato generado actual, no la copia legacy
- `BOOTANDSTRAP_WEB` ya tiene `scheduled termination` mínimo operativo: request/cancel desde UI, backup pre-termination y ejecución por cron al vencer el cooling
- `BOOTANDSTRAP_WEB` ya no finge one-click repo/deploy cuando falta GitHub: esa rama queda marcada como manual-required con error explícito
- el runtime storefront vuelve a tener una base coherente para seguir desarrollando sin falsos rojos

## Lo que NO significa

- no prueba plataforma SaaS multitenant self-service completa
- no prueba alta, materializacion, deploy, credenciales y handoff automatizados desde admin plane
- no cierra por si solo el roadmap de control plane en `BOOTANDSTRAP_WEB`
- no elimina pasos manuales fuera del runtime tenant

## Señales residuales que no son blocker

- algunos tests imprimen logs de degradacion o de fallos esperados de email/rate limit; forman parte de escenarios de fail-safe y no rompen la suite
- sigue existiendo compatibilidad legacy en columnas/tipos generados de BD para `max_pos_kiosk_devices`, pero ya no aparece en presets vivos de demo/provisioning ni en el contrato canonico

## No reabrir sin evidencia

- no volver a usar rutas antiguas como verdad contractual si la implementacion canonica ya cambio
- no reintroducir `enable_custom_domain_email`; la clave valida actual es `enable_custom_email_domain`
- no vender `storefront` verde como prueba de control plane completo
- no usar Ponytail como excusa para relajar auth, governance, limits o documentacion operativa

## Siguiente uso correcto

La siguiente sesion que vuelva al frente de plataforma debe partir de aqui:

- storefront runtime y contratos IA alineados
- Ponytail repo-local adoptado como guardrail de ejecucion
- claims de self-service siguen pendientes y deben demostrarse en `BOOTANDSTRAP_WEB`, no inferirse desde este repo
