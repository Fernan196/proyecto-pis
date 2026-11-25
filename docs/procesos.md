---
type: Proceso
title: Flujo de trabajo, Integración Continua y Despliegue Continuo
description: Proceso de desarrollo con ramas y Pull Requests, pipeline de GitHub Actions y despliegue en la nube (Sprints 1–3).
timestamp: 2026-11-25
---

# Procesos de ingeniería

## 1. Flujo de trabajo (GitHub Flow)

El repositorio siguió de forma parcial el flujo **GitHub Flow** durante el Sprint 1 y pasó a aplicarlo de forma **estricta** durante todo el Sprint 2 y el arranque del Sprint 3:

- **Ramas temáticas**:
  - **Sprint 1**: Se crearon ramas por funcionalidad o corrección (`feature/gestion-usuarios`, `feature/resto-usuarios`, `feature/sesiones-y-frontend`, `feature/persistencia-y-roles`, `feature/frontend-admin`, `feature/email-confirmation`, `feature/github-oauth`, `despliegue-gcp`, `upgrade/front-back`, `fix/test`, `fix/readme`, `feat/prueba-tecnica-sprint1` y `docs/okf-sprint1`).
  - **Sprint 2**: Se creó exactamente **una rama nueva por cada PBI** (`fix/deuda-sprint1-y-logger`, `feature/salas-lobby`, `feature/motor-mazo-y-robo`, `feature/cartas-accion`, `feature/tiempo-real-socketio`, `feature/estadisticas-y-reconexion`, `feature/ui-lobby-y-tablero` y `feature/modales-y-cierre-sprint2`).
  - **Sprint 3**: En curso con rama por PBI (`fix/limpieza-refactor-y-correo` para PBI-1, `feature/google-oauth` para PBI-2, `feature/landing-y-auth-ui` para PBI-3 y `feature/carta-stop-nope` para PBI-4).
- **Integración mediante Pull Request**: Confirmado con `gh pr list --state all --limit 100`: existen **30 Pull Requests** en el repositorio (`#1`–`#27`, `#30`–`#32`):
  - **29 integrados (`MERGED`)**:
    - Sprint 1 (`#1`–`#15`, `#17`–`#19`): **18 integrados** (`52` commits en `main`, `25` en `--first-parent` en el tag `hito-4`, [`e6f1b55`](https://github.com/Fernan196/proyecto-pis/commit/e6f1b55)).
    - Sprint 2 (`#20`–`#27`, PBIs 1 a 8 completos): **8 integrados** alcanzando **69 commits** en `main` (**33** en `--first-parent` en [`9a26e33`](https://github.com/Fernan196/proyecto-pis/commit/9a26e33)).
    - Sprint 3 (`#30`, `#31` y `#32`, PBIs 1 a 3 — Hito 1 cerrado): **3 integrados** alcanzando **78 commits** en `main` (**36** en `--first-parent` en [`041a800`](https://github.com/Fernan196/proyecto-pis/commit/041a800)), con el **PBI-4** listo en `feature/carta-stop-nope` para iniciar el Hito 2.
  - **1 cerrado sin fusionar (`CLOSED`)**: el PR `#16` (`fix: readme actualizado`, rama `fix/readme`), cerrado el `2026-10-13` durante el Sprint 1 al fallar el CI y reemplazado por el PR `#17` tras añadir el contenedor de base de datos en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- **Desviaciones confirmadas con `gh`**:
  1. **Sprint 1 — Commits directos en `main` sin PR y reutilización de ramas**: Se registraron commits subidos directamente a `main` (`0c9fa25`, `fe1e895`, `bfaa482`, `dec1000`, `522e821`, `9c01185`, `4c2c036`, `1f4246f`, `f89c2b1` y `9c366fd`), además de reutilizarse `feature/github-oauth` (`#7`, `#8`, `#9`) y `upgrade/front-back` (`#11`–`#14`).
  2. **Sprint 2 y Sprint 3 — Cumplimiento estricto**: **0 commits directos en `main`** y **0 ramas reutilizadas** en los PR `#20`–`#27` y `#30`–`#32`.
- **Etiquetas de hitos**:
  - **Sprint 1**: `hito-1`, `hito-2`, `hito-3` e `hito-4` (`e6f1b55`).
  - **Sprint 2**: `sprint2-hito-1` (`91a451c`, PR `#21`), `sprint2-hito-2` (`8159dbd`, PR `#23`), `sprint2-hito-3` (`e4c8b32`, PR `#25`) y `sprint2-hito-4` (`9a26e33`, PR `#27`).
  - **Sprint 3**: `sprint3-hito-1` (`041a800`, PR `#32`); previstas `sprint3-hito-2` y `sprint3-hito-3`.

## 2. Integración Continua (CI)

El pipeline de CI está definido en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (`name: CI Pipeline`):

- **Disparadores (`on`)**: Se ejecuta en cada `push` a la rama `main` y en cada `pull_request` dirigido a `main` (en su versión inicial del commit [`2b3f876`](https://github.com/Fernan196/proyecto-pis/commit/2b3f876) solo se disparaba en `pull_request`; en [`1255d01`](https://github.com/Fernan196/proyecto-pis/commit/1255d01) se añadió `push` a `main`).
- **Entorno y servicios**:
  - Runner `ubuntu-latest` con Node.js `20` (`actions/setup-node` v4) y caché de `npm` apuntando a `backend/package-lock.json`.
  - Servicio contenedorizado `mongodb` con la imagen `mongo:6.0` expuesto en el puerto `27017` y comprobación de salud con `mongosh`.
- **Pasos ejecutados**:
  1. Descarga del repositorio (`actions/checkout` v4).
  2. Configuración de Node.js 20.
  3. Instalación de dependencias en `./backend` (`npm ci || npm install`).
  4. Ejecución de las pruebas unitarias en `./backend` (`npm test`, que invoca `jest --runInBand` desde el commit [`aa8f16f`](https://github.com/Fernan196/proyecto-pis/commit/aa8f16f) en PR `#22`) inyectando las variables de entorno `CI`, `MONGODB_URI` y `JWT_SECRET` para el entorno de test.
- **Historial de ejecuciones (confirmado con `gh run list --limit 100`)**:
  - Se registran **49 ejecuciones** acumuladas en el repositorio hasta el PR `#32`: **40 exitosas (`success`)** y **9 fallidas (`failure`)**.
  - **Sprint 1 (`#1`–`#19`, hasta `hito-4`)**: **26 ejecuciones** (**18** `success` y **8** `failure`). Destacaron las 2 correcciones del PR `#6` y los PR `#11`–`#15` integrados en rojo antes de incorporar el servicio `mongo:6.0` en el PR `#17` ([`1255d01`](https://github.com/Fernan196/proyecto-pis/commit/1255d01)).
  - **Sprint 2 (`#20`–`#27`, hasta `sprint2-hito-4`)**: **17 ejecuciones** (**16** `success` y **1** `failure`). La única ejecución fallida (`43959694629`, en `feature/motor-mazo-y-robo`) se debió a una condición de carrera entre suites ejecutándose en paralelo contra MongoDB; se resolvió antes del merge añadiendo `jest --runInBand` ([`aa8f16f`](https://github.com/Fernan196/proyecto-pis/commit/aa8f16f)), logrando el **100 % de PRs fusionados con el CI en verde** (`0` merges en rojo).
  - **Sprint 3 (hasta PR `#32`)**: **6 ejecuciones** (**6** `success`, **0** `failure`).

## 3. Despliegue Continuo (CD)

El repositorio no incluye pasos de despliegue dentro de [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), sino que delega el despliegue continuo en la integración directa de los proveedores cloud con GitHub (opción contemplada en el apartado 7.2 de la especificación y descrita en el [apartado 1 y apartado 2.2 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas)):

- **Frontend (Vercel)**: Configurado mediante [`frontend/vercel.json`](../frontend/vercel.json) (regla `rewrites` hacia `/index.html` para rutas de React Router) y publicado en `https://proyecto-pis.vercel.app`. Confirmado mediante `gh api repos/Fernan196/proyecto-pis/deployments?per_page=100`: existen **51 despliegues** registrados en los entornos `Production` y `Preview` hasta el PR `#32`.
- **Backend (Google Cloud Run)**: Ejecuta `npm start` (`node index.js`, definido en [`backend/package.json`](../backend/package.json)) escuchando en `0.0.0.0` y el puerto `process.env.PORT || 8080` ([`backend/index.js`](../backend/index.js)), publicado en `https://proyecto-pis-814769346481.europe-southwest1.run.app` mediante trigger automático en Google Cloud Build/Run al actualizar `main` (leyendo `BACKEND_URL` desde la configuración del servicio para generar los enlaces de confirmación).
