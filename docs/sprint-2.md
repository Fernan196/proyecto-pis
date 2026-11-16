---
type: Sprint
title: Planificación y seguimiento del Sprint 2 — Michis Explosivos
description: Objetivo del Sprint 2, diseño del juego Michis Explosivos, desglose de categorías, PBIs, hitos y estado de deuda técnica del Sprint 1.
timestamp: 2026-11-16
---

# Sprint 2 — Michis Explosivos Online

## Objetivo del Sprint 2

Diseñar, implementar, probar y desplegar el motor de juego multijugador en tiempo real (**Michis Explosivos**, de 2 a 4 jugadores con Socket.IO) sobre la arquitectura en 3 capas del Sprint 1, cerrando además los requisitos parciales y pendientes heredados del Sprint 1 y cumpliendo el flujo **GitHub Flow** estricto (1 rama por PBI, PR con CI en verde, merge a `main` y etiqueta por hito).

## Diseño del juego (MVP sin bloqueo entre turnos)

- **Temática**: *Michis Explosivos*, adaptación con nombres originales libre de derechos y cartas SVG de estética cartoon/neón.
- **Reparto inicial** (para 2 a 4 jugadores): cada jugador recibe **7 cartas del mazo + 1 `DEFUSE` (Puntero Láser)**; a continuación se insertan **$N - 1$ cartas `BOMB` (Michi Explosivo)** y se baraja el mazo.
- **Catálogo de cartas del mazo**:

| Código interno | Nombre en *Michis Explosivos* | Copias base | Efecto en el motor |
| :--- | :--- | :--- | :--- |
| `BOMB` | Michi Explosivo | $N - 1$ | Al robarla, si el jugador tiene `DEFUSE`, se consume automáticamente y reintroduce la bomba en el mazo en la posición elegida; si no, queda eliminado. |
| `DEFUSE` | Puntero Láser | $1$ por jugador + $2$ en mazo | Desactiva una `BOMB` robada evitando la eliminación. |
| `SKIP` | Salto Gatuno | $4$ | Termina el turno actual sin robar carta (descuenta 1 turno pendiente si estaba bajo emboscada). |
| `ATTACK` | Emboscada Felina | $4$ | Termina el turno sin robar y obliga al siguiente jugador vivo a jugar 2 turnos seguidos. |
| `SEE_FUTURE` | Visión Felina | $5$ | Muestra en privado al jugador las 3 primeras cartas del mazo sin alterar su orden. |
| `SHUFFLE` | Terremoto en el Arenero | $4$ | Baraja aleatoriamente el mazo de robo. |
| `FAVOR` | Soborno de Atún | $4$ | Elige a un rival vivo y le roba 1 carta aleatoria de su mano. |
| `CAT_1..4` | Michi Cósmico, Ninja, Pirata y Zombie | $4 \times 4 = 16$ | Jugadas en pareja idéntica, roban 1 carta aleatoria de la mano de un rival vivo elegido. |

## Estructura del tablero en Donetonic (4 categorías y 8 PBIs)

| Hito / Semana | Categoría | PBI | Rama de trabajo | Tareas | Estimación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hito 1** *(Sem. 1)* | **1. Deuda técnica y Salas (Lobby)** | **PBI-1**: Cierre de deuda técnica del Sprint 1 y Logger (`RF-10`, `RNF-02`, `RNF-06`, `RNF-08`) | `fix/deuda-sprint1-y-logger` | Completar `backend/.env.example`, documentar ejecución local/tests/admin en `README.md`, crear `backend/logic/logger.js` + `GET /api/logs` + tests y actualizar `docs/`. | **4 h** | Hecho ([PR `#20`](https://github.com/Fernan196/proyecto-pis/commit/de5c44c)) |
| **Hito 1** *(Sem. 1)* | **1. Deuda técnica y Salas (Lobby)** | **PBI-2**: Gestión de salas (Lobby) de 2 a 4 jugadores | `feature/salas-lobby` | Modelo `roomModel.js`, lógica `roomLogic.js`, endpoints `/api/salas` en `backend/index.js` y 10 pruebas unitarias en `roomLogic.test.js`. | **6 h** | Hecho ([PR `#21`](https://github.com/Fernan196/proyecto-pis/commit/91a451c), tag `sprint2-hito-1`) |
| **Hito 2** *(Sem. 2)* | **2. Motor del juego y mazo (Backend)** | **PBI-3**: Mazo, reparto inicial, robo, explosión y Puntero Láser (`DEFUSE`) | `feature/motor-mazo-y-robo` | Modelo `gameModel.js`, `iniciarPartidaDirecta`/`iniciarPartidaDesdeSala`, `robarCarta`, `reinsertarBomba`, eliminación, victoria, endpoints `/api/partidas*` y 10 pruebas en `gameLogic.test.js`. | **6 h** | Hecho ([PR `#22`](https://github.com/Fernan196/proyecto-pis/commit/7e8129e)) |
| **Hito 2** *(Sem. 2)* | **2. Motor del juego y mazo (Backend)** | **PBI-4**: Cartas de acción (`SKIP`, `ATTACK`, `SEE_FUTURE`, `SHUFFLE`, `FAVOR`, parejas) y vista segura | `feature/cartas-accion` | `jugarCarta`, `obtenerVistaJugador` / `obtenerPartidaVistaJugador`, endpoint `POST /api/partidas/:codigo/jugar` y ampliación a 20 pruebas en `gameLogic.test.js`. | **6 h** | Hecho ([PR `#23`](https://github.com/Fernan196/proyecto-pis/commit/8159dbd), tag `sprint2-hito-2`) |
| **Hito 3** *(Sem. 3)* | **3. Tiempo real y Persistencia** | **PBI-5**: Sincronización en tiempo real con Socket.IO autenticada con JWT | `feature/tiempo-real-socketio` | Integrar `socket.io` en `backend/index.js` + `socketManager.js` con validación JWT, crear `frontend/src/services/socket.js`, ampliar `api.js` y 6 pruebas en `socketManager.test.js`. | **5 h** | Hecho ([PR `#24`](https://github.com/Fernan196/proyecto-pis/commit/4c11d4d)) |
| **Hito 3** *(Sem. 3)* | **3. Tiempo real y Persistencia** | **PBI-6**: Reconexión tras recarga y estadísticas/ranking de jugadores | `feature/estadisticas-y-reconexion` | Estadísticas en `userModel.js`, `GET /api/ranking`, `GET /api/sesion-juego/activa`, recuperación de sala/partida activa tras recargar y ampliación a 26 pruebas en `gameLogic.test.js`. | **4 h** | Hecho ([PR `#25`](https://github.com/Fernan196/proyecto-pis/commit/e4c8b32), tag `sprint2-hito-3`) |
| **Hito 4** *(Sem. 4)* | **4. Interfaz de juego (Frontend) y Cierre** | **PBI-7**: Interfaz de Lobby y Tablero de juego con cartas SVG | `feature/ui-lobby-y-tablero` | Cartas SVG en `michiCard.jsx`, tablero en `gameBoard.jsx`, Lobby + Ranking + reconexión en `dashboard.jsx`, ruta `/partida/:codigo` en `App.jsx` y estilos en `index.css`. | **6 h** | Hecho ([PR `#26`](https://github.com/Fernan196/proyecto-pis/commit/ed7f496)) |
| **Hito 4** *(Sem. 4)* | **4. Interfaz de juego (Frontend) y Cierre** | **PBI-8**: Modales interactivos y actualización del bundle OKF del Sprint 2 | `feature/modales-y-cierre-sprint2` | Modales interactivos (`DEFUSE`, `SEE_FUTURE`, selección de rival, fin de partida y guía de reglas/cartas), `README.md` y cierre OKF del Sprint 2. | **3 h** | Hecho (en rama; etiqueta `sprint2-hito-4` tras merge) |

## Requisitos heredados del Sprint 1

Estado final al cierre del **Sprint 2** (desglose completo en [`requisitos.md`](./requisitos.md)):

| ID | Requisito | Estado heredado (Sprint 1) | Estado final (Sprint 2) | Resolución / Observación |
| :--- | :--- | :--- | :--- | :--- |
| `ARQ-01` | Separación cliente-servidor y mismo origen | parcial | parcial | Se mantiene la arquitectura desacoplada Vercel + Google Cloud Run justificada en [`README.md`](../README.md#22-justificación-del-despliegue-desacoplado-vercel--google-cloud-run). |
| `RF-10` | Creación del primer administrador | parcial | hecho | Documentado en [`README.md`](../README.md#7-creación-y-acceso-como-administrador) el procedimiento de promoción manual, el blindaje de `rol: 'user'` en registro y el acceso para revisión. |
| `RNF-02` | Secretos fuera del código y .env.example | parcial | hecho | Completado [`backend/.env.example`](../backend/.env.example) con todas las variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `FRONTEND_URL` y `ALLOWED_DOMAINS`). |
| `RNF-06` | Pruebas unitarias de la lógica (5 o más) | parcial | hecho | Documentada la ejecución local y el comando único `npm test` en [`README.md`](../README.md#6-ejecución-de-las-pruebas-automatizadas) y ampliada la suite hasta **66 pruebas** totales con `--runInBand`. |
| `RNF-08` | Registro de actividad (log) | pendiente | hecho | Implementado [`backend/logic/logger.js`](../backend/logic/logger.js), integrado en [`backend/logic/userLogic.js`](../backend/logic/userLogic.js), [`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js), [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js) y [`backend/index.js`](../backend/index.js) con endpoint `GET /api/logs` (solo `admin`) y 4 pruebas en [`backend/logic/logger.test.js`](../backend/logic/logger.test.js). |
| `PRO-01` | Flujo de trabajo GitHub Flow | parcial | hecho (Sprint 2) | En el Sprint 2 (PR `#20` a `#26`) se cumplió estrictamente: **7 PRs integrados**, **1 rama nueva por PBI**, **0 commits directos en `main`** y etiquetas `sprint2-hito-1` a `sprint2-hito-4`. |
| `PRO-02` | Integración continua | parcial | hecho (Sprint 2) | De las **15 ejecuciones** de CI registradas en el Sprint 2 (`14` `success`, `1` `failure` en PR `#22` resuelta con `--runInBand` antes del merge), **ningún PR se integró con CI en rojo**. |

## Seguimiento de los 4 Hitos del Sprint 2

### Hito 1 (Sprint 2): Deuda técnica y Salas (Lobby)
- **Objetivo**: Cerrar los requisitos parciales/pendientes del Sprint 1 (`RF-10`, `RNF-02`, `RNF-06`, `RNF-08`), planificar el Sprint 2 e implementar la gestión de salas multijugador (2 a 4 jugadores).
- **Qué se hizo**:
  - `PBI-1`: [`backend/.env.example`](../backend/.env.example) completo, actualización de [`README.md`](../README.md), script `npm test` raíz, módulo [`backend/logic/logger.js`](../backend/logic/logger.js) + `GET /api/logs` + 4 pruebas en [`backend/logic/logger.test.js`](../backend/logic/logger.test.js) y planificación en [`docs/sprint-2.md`](./sprint-2.md).
  - `PBI-2`: Modelo [`backend/data/roomModel.js`](../backend/data/roomModel.js), lógica [`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js) (crear sala, unirse por código, salir, marcar listo e iniciar partida), endpoints `/api/salas*` en [`backend/index.js`](../backend/index.js) y 10 pruebas en [`backend/logic/roomLogic.test.js`](../backend/logic/roomLogic.test.js).
- **PR y etiqueta**: PR `#20` ([`de5c44c`](https://github.com/Fernan196/proyecto-pis/commit/de5c44c)) y PR `#21` ([`91a451c`](https://github.com/Fernan196/proyecto-pis/commit/91a451c)) · Etiqueta `sprint2-hito-1` en [`91a451c`](https://github.com/Fernan196/proyecto-pis/commit/91a451c).
- **Desviaciones del flujo**: Ninguna.

### Hito 2 (Sprint 2): Motor del juego y mazo (Backend)
- **Objetivo**: Implementar el motor completo de *Michis Explosivos* en servidor con reparto inicial, robo, desactivación, todas las cartas de acción, parejas de gatos y vista segura filtrada por jugador.
- **Qué se hizo**:
  - `PBI-3`: Modelo [`backend/data/gameModel.js`](../backend/data/gameModel.js), inicialización del mazo (`7 + DEFUSE`, $N-1$ `BOMB`), `robarCarta`, `reinsertarBomba`, explosión/victoria, endpoints `/api/partidas*`, ejecución `--runInBand` en [`backend/package.json`](../backend/package.json) ([`aa8f16f`](https://github.com/Fernan196/proyecto-pis/commit/aa8f16f)) y 10 pruebas iniciales en [`backend/logic/gameLogic.test.js`](../backend/logic/gameLogic.test.js).
  - `PBI-4`: Cartas `SKIP`, `ATTACK`, `SEE_FUTURE`, `SHUFFLE`, `FAVOR` y parejas `CAT_1..4`, función antitrampas `obtenerVistaJugador`, endpoint `POST /api/partidas/:codigo/jugar` y ampliación a 20 pruebas en [`backend/logic/gameLogic.test.js`](../backend/logic/gameLogic.test.js).
- **PR y etiqueta**: PR `#22` ([`7e8129e`](https://github.com/Fernan196/proyecto-pis/commit/7e8129e)) y PR `#23` ([`8159dbd`](https://github.com/Fernan196/proyecto-pis/commit/8159dbd)) · Etiqueta `sprint2-hito-2` en [`8159dbd`](https://github.com/Fernan196/proyecto-pis/commit/8159dbd).
- **Desviaciones del flujo**: Ninguna (el fallo `43959694629` en PR `#22` se corrigió antes de fusionar a `main`).

### Hito 3 (Sprint 2): Tiempo real y Persistencia
- **Objetivo**: Sincronizar salas y partidas en tiempo real con Socket.IO autenticado con JWT, garantizar la reconexión tras recarga del navegador y persistir el ranking global de jugadores.
- **Qué se hizo**:
  - `PBI-5`: Integración de `socket.io` en [`backend/index.js`](../backend/index.js) y [`backend/logic/socketManager.js`](../backend/logic/socketManager.js) con autenticación JWT y canales privados `user:<userId>`, cliente [`frontend/src/services/socket.js`](../frontend/src/services/socket.js), ampliación de [`frontend/src/services/api.js`](../frontend/src/services/api.js), decisión `D-13` y 6 pruebas en [`backend/logic/socketManager.test.js`](../backend/logic/socketManager.test.js).
  - `PBI-6`: Campos `partidasJugadas` y `partidasGanadas` + métodos de ranking/actualización en [`backend/data/userModel.js`](../backend/data/userModel.js), endpoints `GET /api/ranking` y `GET /api/sesion-juego/activa`, y ampliación a 26 pruebas en [`backend/logic/gameLogic.test.js`](../backend/logic/gameLogic.test.js).
- **PR y etiqueta**: PR `#24` ([`4c11d4d`](https://github.com/Fernan196/proyecto-pis/commit/4c11d4d)) y PR `#25` ([`e4c8b32`](https://github.com/Fernan196/proyecto-pis/commit/e4c8b32)) · Etiqueta `sprint2-hito-3` en [`e4c8b32`](https://github.com/Fernan196/proyecto-pis/commit/e4c8b32).
- **Desviaciones del flujo**: Ninguna.

### Hito 4 (Sprint 2): Interfaz de juego (Frontend) y Cierre OKF
- **Objetivo**: Construir el Lobby, Ranking y Tablero gráfico con cartas SVG, añadir modales interactivos y guía de reglas/cartas, actualizar `README.md` y cerrar el bundle OKF del Sprint 2.
- **Qué se hizo**:
  - `PBI-7`: Cartas vectoriales SVG en [`frontend/src/michiCard.jsx`](../frontend/src/michiCard.jsx), tablero en tiempo real en [`frontend/src/gameBoard.jsx`](../frontend/src/gameBoard.jsx), Lobby + Ranking + banner de reconexión en [`frontend/src/dashboard.jsx`](../frontend/src/dashboard.jsx), ruta `/partida/:codigo` en [`frontend/src/App.jsx`](../frontend/src/App.jsx) y estilos en [`frontend/src/index.css`](../frontend/src/index.css).
  - `PBI-8`: Conversión de las interacciones críticas en **5 modales superpuestos** en [`frontend/src/gameBoard.jsx`](../frontend/src/gameBoard.jsx) y [`frontend/src/index.css`](../frontend/src/index.css) (reinserción de `BOMB` con slider, `SEE_FUTURE`, selector de rival objetivo, victoria final y guía de reglas/cartas), actualización de [`README.md`](../README.md) y cierre del bundle OKF en [`docs/`](./index.md) (decisión `D-14`).
- **PR y etiqueta**: PR `#26` ([`ed7f496`](https://github.com/Fernan196/proyecto-pis/commit/ed7f496)) y PR de cierre `feature/modales-y-cierre-sprint2` · Etiqueta `sprint2-hito-4` al integrar el cierre.
- **Desviaciones del flujo**: Ninguna.

## Retrospectiva del Sprint 2

### Hechos
- Hasta la integración del PR `#26` ([`ed7f496`](https://github.com/Fernan196/proyecto-pis/commit/ed7f496)), el repositorio acumula **67 commits** en `main` (`32` en `--first-parent`, frente a `52` commits y `25` en `--first-parent` al cierre del Sprint 1 en `hito-4`), **26 Pull Requests** totales (`25` `MERGED` y `1` `CLOSED` heredado del Sprint 1) y **43 despliegues** registrados en GitHub (`Production` y `Preview` en Vercel), además del servicio desplegado en Google Cloud Run.
- En el Sprint 2 (PR `#20` a `#26`) se ejecutaron **7 PRs** con **1 rama nueva por PBI**, **0 commits directos en `main`** y **15 ejecuciones de CI** (**14** `success` y **1** `failure` en PR `#22` corregida con `--runInBand` antes del merge), logrando un **100 % de merges con CI en verde** (`41` ejecuciones totales acumuladas en el historial del repositorio: `32` `success` y `9` `failure`).
- La batería automatizada pasó de **20 pruebas** al final del Sprint 1 a **66 pruebas unitarias** (`20` en `userLogic.test.js`, `4` en `logger.test.js`, `10` en `roomLogic.test.js`, `26` en `gameLogic.test.js` y `6` en `socketManager.test.js`).

### Qué funcionó
- **Documentación OKF incremental PBI a PBI**: Aplicando la mejora detectada en la retrospectiva del Sprint 1, actualizar [`sprint-2.md`](./sprint-2.md), [`log.md`](./log.md), [`arquitectura.md`](./arquitectura.md) y [`decisiones.md`](./decisiones.md) dentro de cada PBI evitó cuellos de botella en el Hito 4.
- **Disciplina estricta de GitHub Flow**: Abrir una rama limpia por cada PBI y esperar al CI en verde evitó regresiones en `main` (el único fallo de CI por concurrencia en MongoDB durante el PR `#22` fue detectado y resuelto en rama antes del merge).
- **Desacoplamiento progresivo y respaldo en memoria**: Permitir que `logger`, `roomLogic`, `gameLogic` y `socketManager` funcionen tanto con MongoDB como con respaldo en memoria aceleró enormemente la verificación local sin perder pruebas reales contra `mongo:6.0` en GitHub Actions.

### Qué cambiaría
- **Incluir el build del frontend en GitHub Actions**: Actualmente [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) solo ejecuta `npm test` del backend; para un siguiente ciclo convendría añadir un job para `npm --prefix frontend run build` (y ESLint si se configura) de forma que errores de importación o sintaxis en React se detecten automáticamente en cada PR.
- **Pruebas de extremo a extremo (E2E) multiusuario**: Añadir pruebas automatizadas con Playwright o Socket.IO cliente sobre dos sesiones simultáneas permitiría validar de forma automatizada en CI la sincronización de modales entre varios jugadores reales.

## Cambios previos al arranque del Sprint 2

- El `2026-10-15` se integró en `origin/main` el PR `#18` (`feat/prueba-tecnica-sprint1`, commits [`61503ed`](https://github.com/Fernan196/proyecto-pis/commit/61503ed) y [`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914)) con la validación de dominios permitidos (`ALLOWED_DOMAINS` / `POST /api/prueba/dominio`).
- El `2026-11-11` se integró el PR `#19` (`docs/okf-sprint1`, commits [`125d3fd`](https://github.com/Fernan196/proyecto-pis/commit/125d3fd) y [`e6f1b55`](https://github.com/Fernan196/proyecto-pis/commit/e6f1b55)) y se creó la etiqueta `hito-4`.
