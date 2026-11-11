---
type: Proceso
title: Flujo de trabajo, Integración Continua y Despliegue Continuo
description: Proceso de desarrollo con ramas y Pull Requests, pipeline de GitHub Actions y despliegue en la nube.
timestamp: 2026-11-11
---

# Procesos de ingeniería

## 1. Flujo de trabajo (GitHub Flow)

El repositorio sigue de forma parcial el flujo **GitHub Flow** descrito en el apartado 7.1 de la especificación:

- **Ramas temáticas**: Se crearon ramas por funcionalidad o corrección (`feature/gestion-usuarios`, `feature/resto-usuarios`, `feature/sesiones-y-frontend`, `feature/persistencia-y-roles`, `feature/frontend-admin`, `feature/email-confirmation`, `feature/github-oauth`, `despliegue-gcp`, `upgrade/front-back`, `fix/test`, `fix/readme` y `feat/prueba-tecnica-sprint1`).
- **Integración mediante Pull Request**: Confirmado con `gh pr list --state all --limit 100`: existen **18 Pull Requests** en el repositorio:
  - **17 integrados (`MERGED`)**: `#1` a `#15` y `#17` durante el Sprint 1 (48 commits en `main` hasta `9c366fd`, 23 en `--first-parent`), más el PR `#18` (`feat/prueba-tecnica-sprint1`, merge [`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914) el `2026-10-15`, alcanzando 50 commits en `origin/main` y 24 en `--first-parent`).
  - **1 cerrado sin fusionar (`CLOSED`)**: el PR `#16` (`fix: readme actualizado`, rama `fix/readme`), cerrado el `2026-10-13` al fallar el CI y reemplazado por el PR `#17` tras añadir el contenedor de base de datos en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- **Desviaciones confirmadas con `gh`**:
  1. **Commits directos en `main` sin PR**: Se confirma que `0c9fa25`, `fe1e895`, `bfaa482` (2026-10-06) y `dec1000`, `522e821`, `4c2c036`, `1f4246f`, `9c366fd` (2026-10-13) se subieron directamente a `main` sin Pull Request (ninguno corresponde a un PR con *squash* o *rebase*), lo que además generó 2 commits de merge de sincronización (`9c01185` y `f89c2b1`).
  2. **Reutilización de ramas ya integradas**: La rama `feature/github-oauth` se reutilizó en los PR `#7`, `#8` y `#9`; la rama `upgrade/front-back` se reutilizó en los PR `#11`, `#12`, `#13` y `#14`.
- **Etiquetas de hitos**: El repositorio cuenta con las 4 etiquetas de cierre de hito (`hito-1`, `hito-2`, `hito-3` e `hito-4`).

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
  4. Ejecución de las pruebas unitarias en `./backend` (`npm test`, que invoca `jest`) inyectando las variables de entorno `CI`, `MONGODB_URI` y `JWT_SECRET` para el entorno de test.
- **Historial de ejecuciones (confirmado con `gh run list --limit 50`)**:
  - Se registran **24 ejecuciones** en total: **16 exitosas (`success`)** y **8 fallidas (`failure`)**.
  - **PR `#6` (`feature/email-confirmation`)**: tuvo 2 ejecuciones fallidas (`37651162484` y `37695886898`) que se corrigieron con los commits [`9072f04`](https://github.com/Fernan196/proyecto-pis/commit/9072f04) y [`d6ab9fa`](https://github.com/Fernan196/proyecto-pis/commit/d6ab9fa) hasta pasar en verde (`37696413769`).
  - **PR `#11` a `#15` integrados con CI en rojo**: las ejecuciones de los PR `#11` (`38460806666`), `#12` (`38464447416`), `#13` (`38466673899`), `#14` (`38469154059`) y `#15` (`38470876567`) terminaron en `failure` (el workflow aún no levantaba el contenedor `mongo:6.0`) y, pese a ello, fueron integrados en `main`.
  - **Corrección en PR `#16` / `#17`**: el PR `#16` también falló (`38472422243`) y se cerró sin fusionar; en el PR `#17` se añadió el servicio `mongo:6.0` ([`1255d01`](https://github.com/Fernan196/proyecto-pis/commit/1255d01)), pasando el CI a verde (`38472932217` y `38473006240`).

## 3. Despliegue Continuo (CD)

El repositorio no incluye pasos de despliegue dentro de [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), sino que delega el despliegue continuo en la integración directa de los proveedores cloud con GitHub (opción contemplada en el apartado 7.2 de la especificación y descrita en el [apartado 1 y apartado 2.2 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas)):

- **Frontend (Vercel)**: Configurado mediante [`frontend/vercel.json`](../frontend/vercel.json) (regla `rewrites` hacia `/index.html` para rutas de React Router) y publicado en `https://proyecto-pis.vercel.app`. Confirmado mediante `gh api repos/Fernan196/proyecto-pis/deployments`: existen **26 despliegues** registrados en los entornos `Production` y `Preview`.
- **Backend (Google Cloud Run)**: Ejecuta `npm start` (`node index.js`, definido en [`backend/package.json`](../backend/package.json)) escuchando en `0.0.0.0` y el puerto `process.env.PORT || 8080` ([`backend/index.js`](../backend/index.js), líneas 11 y 149), publicado en `https://proyecto-pis-814769346481.europe-southwest1.run.app` mediante trigger automático en Google Cloud Build/Run al actualizar `main`.
