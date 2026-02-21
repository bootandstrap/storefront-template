# Owner Panel Runbook (2026-02-12)

## Objetivo
Runbook operativo para validar Owner Panel en producción con enfoque startup/pyme: UX simple, rutas esenciales, aislamiento tenant y conexión Medusa estable.

## Pre-flight
- Verificar `TENANT_ID` y `MEDUSA_BACKEND_URL` en runtime.
- Verificar `MEDUSA_ADMIN_PASSWORD` y `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
- Confirmar mapping en `tenant_medusa_scope` para el tenant desplegado.

## Smoke Checklist
1. Login owner en `/es/login` y redirección a `/es/panel`.
2. Dashboard carga métricas esenciales sin error.
3. Navegación visible: Catálogo, Pedidos, Clientes, Tienda.
4. Módulos avanzados bloqueados por URL directa cuando owner lite está activo.
5. Crear producto y categoría respeta límites de plan server-side.
6. Pedidos: fulfill/cancel solo para pedidos del tenant scope.

## Troubleshooting rápido
- Error `Medusa tenant scope is required`:
  - Revisar fila en `tenant_medusa_scope` para `tenant_id`.
- Error `Order does not belong to current tenant scope`:
  - Verificar metadata/sales channel del pedido y mapeo del tenant.
- Panel vacío o sin configuración:
  - Confirmar `TENANT_ID` en entorno y tablas `config`, `feature_flags`, `plan_limits`.

## Rollback funcional
- Activar `owner_lite_enabled=true` y `owner_advanced_modules_enabled=false` para reducir superficie.
- Si falla integración Medusa, limitar operaciones de pedidos/catalogo temporalmente y mantener acceso de lectura.
