# Owner Panel Metrics (2026-02-12)

## KPIs de producto
- `owner_login_success_rate` = logins owner exitosos / intentos.
- `owner_panel_daily_active_tenants` = tenants con sesión owner diaria.
- `owner_task_completion_rate` = sesiones con acción crítica completada (crear producto, actualizar tienda, gestionar pedido).

## KPIs de calidad
- `owner_panel_error_rate` = errores UI/API owner por 1000 requests.
- `medusa_admin_failure_rate` = fallos de llamadas admin Medusa por endpoint.
- `tenant_scope_violation_attempts` = mutaciones bloqueadas por ownership guard.

## Señales de UX simplificada
- `time_to_first_product_create` (median).
- `time_to_fulfill_order` (median).
- `% sessions touching advanced modules` (debe ser bajo en modo lite).

## Umbrales operativos
- Error rate owner panel > 2%: investigar y activar rollback de módulos avanzados.
- Tenant scope violations > baseline esperado: revisar mapping `tenant_medusa_scope`.
- Login success < 95%: revisar auth providers/feature flags.
