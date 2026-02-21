# Owner Panel Rollout Strategy (2026-02-12)

## Flags de rollout
- `owner_lite_enabled`: activa navegación esencial simplificada.
- `owner_advanced_modules_enabled`: habilita módulos avanzados por tenant.

## Estrategia
1. Fase 0: `owner_lite_enabled=true`, `owner_advanced_modules_enabled=false` en todos los tenants nuevos.
2. Fase 1: habilitar avanzados solo en tenants piloto con soporte activo.
3. Fase 2: apertura gradual por cohortes con monitoreo diario de errores y adopción.

## Kill switch
- Desactivar avanzados de inmediato: `owner_advanced_modules_enabled=false`.
- Volver al baseline minimalista en incidentes UX o seguridad.

## Criterio de avance
- Sin errores críticos de auth/scoping por 7 días.
- Cumplimiento de flujos críticos owner (login, catálogo, pedidos, tienda).
