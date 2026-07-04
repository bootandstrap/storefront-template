# Ponytail Adoption In ecommerce-template

Fecha de referencia: `2026-06-19`

## Proposito

Adoptar el criterio de `Ponytail` en `ecommerce-template` como guardrail de ejecucion para agentes y sesiones de desarrollo, sin convertirlo en una excusa para:

- saltarse el zone map de `GEMINI.md`
- recortar validacion, seguridad o accesibilidad
- maquillar pasos manuales de provisioning como si fueran self-service
- rebajar los gates del tenant runtime

Referencia primaria del proyecto externo:

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/main)

## Decision

Se adopta una version repo-local de Ponytail mediante:

- `AGENTS.md` en la raiz de `ecommerce-template`

No se asume en esta sesion la instalacion global del plugin oficial en Codex como requisito para beneficiarse de la idea.

## Que significa aqui

Antes de escribir codigo nuevo, el agente debe agotar esta escalera:

1. no construir si no hace falta
2. usar stdlib si cubre el caso
3. usar plataforma nativa si ya resuelve el problema
4. reutilizar dependencia ya instalada antes de introducir otra
5. mantener el cambio en una rama local o una pieza pequena
6. solo entonces escribir codigo nuevo minimo

## Donde SI aplica

- customizaciones de storefront
- glue code de UI
- helpers pequenos
- tests focalizados
- simplificacion de componentes locales
- integraciones donde Next.js, React, Medusa o las dependencias ya instaladas cubren el caso

## Donde NO aplica como excusa

- auth y trust boundaries
- checkout y pagos
- enforcement de flags y limits
- panel owner semantics
- governance runtime contract
- release gate, build y auditorias
- documentacion de handoff u operativa real

## Regla del runtime

En `ecommerce-template`, Ponytail significa:

- menos codigo
- menos wrappers
- menos dependencias nuevas

Pero nunca:

- menos verdad operativa
- menos disciplina contra los paths bloqueados
- menos pruebas en flujos sensibles
- menos claridad sobre que partes siguen siendo manuales fuera del runtime

## Relacion con el harness de agentes

En el workspace compartido, la jerarquia efectiva queda asi:

1. `../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md`
2. `AGENTS.md` y `GEMINI.md` son adapters locales
3. `.agent/workflows/*.md`
4. docs de dominio

Fuera del workspace compartido, los adapters locales son el fail-safe y nunca
amplían ownership. Ponytail sigue sin poder vender runtime sano como plataforma
self-service completa.

## Impacto esperado

- menos sobreingenieria en sesiones futuras
- menor tendencia a introducir wrappers o dependencias por defecto
- mejor disciplina para resolver con primitives ya presentes en el runtime
- mas claridad al separar calidad de implementacion de promesas de producto

## Vias siguientes

1. mantener la adopcion repo-local con `AGENTS.md` + doc viva + test contractual
2. dejar que el test documental falle si alguien rompe la jerarquia harness → adapters → workflows
3. si el plugin oficial de Ponytail pasa a estar disponible en Codex, evaluarlo como ayuda operativa adicional, no como sustituto del zone map ni de los gates del runtime
4. usar [`2026-06-19-holistic-alignment-status.md`](./2026-06-19-holistic-alignment-status.md) como congelacion de estado para no volver a mezclar alineacion local del runtime con claims de plataforma

## Limites conocidos

- esta adopcion repo-local no instala por si sola hooks ni comandos del plugin oficial de Ponytail
- el comportamiento depende de que futuras sesiones respeten `AGENTS.md`
- no sustituye TDD ni verificacion fresca
- no cambia por si sola la operativa manual que exista fuera del storefront runtime

## No reabrir

- no usar Ponytail para justificar cortar seguridad, i18n o accesibilidad
- no usar Ponytail para tocar paths bloqueados sin evidencia
- no usar Ponytail para vender runtime sano como plataforma self-service completa
- no usar Ponytail para ocultar pasos manuales de provisioning, deploy o handoff
