---
type: Sprint
title: Planificación y seguimiento del Sprint 3 — Pulido UX, OAuth Google, Carta Stop y Tablero 3D
description: Objetivo del Sprint 3, desglose de categorías, PBIs, estimaciones, hitos y seguimiento de ejecución.
timestamp: 2026-11-25
---

# Sprint 3 — Pulido UX, Google OAuth, Carta Stop y Tablero 3D

- **Periodo oficial**: `19/11/2026` – `10/12/2026` *(ejecución en repositorio desde `25/11/2026`)*
- **Flujo**: GitHub Flow estricto (1 rama por PBI, PR con CI en verde y etiqueta por hito).

## Objetivo del Sprint 3

Completar la experiencia de producto puliendo los flujos de acceso (correo de confirmación corporativo, eliminación del filtro de dominios, Google OAuth 2.0 y página de inicio), desacoplar completamente la capa lógica de usuarios del ODM y de servicios externos, ampliar el motor de *Michis Explosivos* con la carta `NOPE` (*¡Alto ahí! / Stop*) y las reglas avanzadas pendientes (`REVERSE`, `ATTACK` acumulable, combo 3x gatos y abandono limpio), y dotar al tablero de una presentación dinámica en 3D con animaciones.

## Estructura del tablero (3 categorías, 7 PBIs, 36 h)

| Hito / Fechas | Categoría | PBI | Rama de trabajo | Tareas principales | Estimación | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Hito 1** *(25/11 – 30/11)* | **1. Correcciones, Correo y Autenticación** | **PBI-1**: Limpieza de filtro de dominios, refactor de `userLogic.js` y correo de confirmación profesional | `fix/limpieza-refactor-y-correo` | Retirar `ALLOWED_DOMAINS` y `POST /api/prueba/dominio`; desacoplar `userLogic.js` (`createUserLogic`) con repositorio en memoria en `userModel.js`; mover `mailer.js` a `backend/services/` con `BACKEND_URL` y plantilla HTML de *Michis Explosivos*; tests (`68` totales) y planificación Sprint 3. | **6 h** | Hecho *(en rama, pendiente PR)* |
| **Hito 1** *(25/11 – 30/11)* | **1. Correcciones, Correo y Autenticación** | **PBI-2**: Inicio de sesión y registro con Google OAuth 2.0 | `feature/google-oauth` | Campo `googleId` en `userModel.js`, `procesarLoginGoogle` + tests, endpoints `GET /api/auth/google` y `/callback`, variables `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` y botón **"Continuar con Google"**. | **4 h** | Pendiente |
| **Hito 1** *(25/11 – 30/11)* | **1. Correcciones, Correo y Autenticación** | **PBI-3**: Página de Inicio (Landing) y rediseño de navegación, Login y Registro | `feature/landing-y-auth-ui` | Retirar `<nav>` superior de `App.jsx`, crear `home.jsx` en `/`, rediseñar `login.jsx` y `register.jsx` (etiqueta `sprint3-hito-1` tras merge). | **5 h** | Pendiente |
| **Hito 2** *(01/12 – 05/12)* | **2. Motor de juego avanzado (Stop y Combos)** | **PBI-4**: Carta `NOPE` (*¡Alto ahí! / Stop*) con ventana de reacción en tiempo real y contra-Stop | `feature/carta-stop-nope` | Estado `WAITING_NOPE_WINDOW` con temporizador en servidor (~5 s), encadenamiento `NOPE`/`YUP`, eventos Socket.IO, endpoint `/nope` y tests. | **6 h** | Pendiente |
| **Hito 2** *(01/12 – 05/12)* | **2. Motor de juego avanzado (Stop y Combos)** | **PBI-5**: Reglas avanzadas (`REVERSE`, `ATTACK` acumulable, combo 3x gatos y abandono limpio) | `feature/reglas-avanzadas-juego` | Carta `REVERSE`, acumulación de `ATTACK`, combo de 3 gatos iguales, `POST /api/partidas/:codigo/abandonar`, SVGs y tests (etiqueta `sprint3-hito-2` tras merge). | **5 h** | Pendiente |
| **Hito 3** *(06/12 – 10/12)* | **3. Interfaz 3D dinámica, Animaciones y Cierre** | **PBI-6**: Tablero 3D, mano en abanico interactivo y animaciones de partida | `feature/tablero-3d-animaciones` | Mano en abanico 3D, mazo apilado, *card flip*, cuenta atrás y botón **STOP**, modal combo 3x gatos, efectos de impacto y audio opcional. | **7 h** | Pendiente |
| **Hito 3** *(06/12 – 10/12)* | **3. Interfaz 3D dinámica, Animaciones y Cierre** | **PBI-7**: CI del frontend, verificación integral y cierre OKF del Sprint 3 | `docs/cierre-sprint3-y-ci` | Job `npm --prefix frontend run build` en CI, actualización completa de `README.md` y bundle OKF (etiqueta `sprint3-hito-3` tras merge). | **3 h** | Pendiente |
