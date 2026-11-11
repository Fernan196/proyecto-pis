---
type: Sprint
title: Planificación inicial del Sprint 2
description: Objetivo del Sprint 2 y relación de requisitos parciales o pendientes que pasan desde el Sprint 1.
timestamp: 2026-11-11
---

# Sprint 2

## Objetivo del Sprint 2

Por definir.

## Requisitos que pasan del Sprint 1

De acuerdo con la matriz de trazabilidad en [`requisitos.md`](./requisitos.md), pasan al Sprint 2 todos los requisitos en estado **parcial** o **pendiente**:

| ID | Requisito | Estado al cierre del Sprint 1 | Qué falta por completar |
| :--- | :--- | :--- | :--- |
| `ARQ-01` | Separación cliente-servidor y mismo origen | parcial | Hacer que el backend sirva el frontend bajo el mismo origen o acordar formalmente la excepción del despliegue desacoplado (Vercel + Google Cloud Run). |
| `RF-10` | Creación del primer administrador | parcial | Documentar en [`README.md`](../README.md) cómo acceder como administrador para la revisión (el procedimiento de promoción manual y el blindaje de `rol: 'user'` en el registro público ya están implementados y documentados en [`decisiones.md`](./decisiones.md#d-12-creación-del-primer-administrador-y-gestión-de-roles)). |
| `RNF-02` | Secretos fuera del código y .env.example | parcial | Añadir en [`backend/.env.example`](../backend/.env.example) los nombres de las variables `EMAIL_USER`, `EMAIL_PASS` y `FRONTEND_URL`. |
| `RNF-06` | Pruebas unitarias de la lógica (5 o más) | parcial | Documentar en [`README.md`](../README.md) las instrucciones de ejecución en local y el comando único para lanzar las pruebas automatizadas (eliminados en [`9c366fd`](https://github.com/Fernan196/proyecto-pis/commit/9c366fd)). |
| `RNF-08` | Registro de actividad (log) | pendiente | Implementar el registro (log) de la actividad relevante del sistema (altas, inicios de sesión, confirmaciones, cambios de rol y bajas de usuarios). |
| `PRO-01` | Flujo de trabajo GitHub Flow | parcial | Integrar todos los cambios exclusivamente mediante ramas nuevas por tarea y Pull Requests sin commits directos en `main` ni reutilización de ramas ya fusionadas. |
| `PRO-02` | Integración continua | parcial | No fusionar ningún Pull Request cuando el workflow de GitHub Actions esté en estado `failure` (rojo), como ocurrió en los PR `#11` a `#15`. |

## Cambios posteriores al cierre del Sprint 1

- El `2026-10-15` se integró en `origin/main` el PR `#18` (`feat/prueba-tecnica-sprint1`, commits [`61503ed`](https://github.com/Fernan196/proyecto-pis/commit/61503ed) y [`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914)) con la validación de dominios de correo permitidos (`variante3`).
