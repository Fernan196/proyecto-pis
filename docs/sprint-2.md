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
| **Hito 3** *(Sem. 3)* | **3. Tiempo real y Persistencia** | **PBI-6**: Reconexión tras recarga y estadísticas/ranking de jugadores | `feature/estadisticas-y-reconexion` | Estadísticas en `userModel.js`, `GET /api/ranking`, `GET /api/sesion-juego/activa`, recuperación de sala/partida activa tras recargar y ampliación a 26 pruebas en `gameLogic.test.js`. | **4 h** | En curso (implementado en rama) |
| **Hito 4** *(Sem. 4)* | **4. Interfaz de juego (Frontend) y Cierre** | **PBI-7**: Interfaz de Lobby y Tablero de juego con cartas SVG | `feature/ui-lobby-y-tablero` | Sección de Salas y Ranking en `dashboard.jsx` y componente `gameBoard.jsx` con mesa, rivales, mano SVG y registro de jugadas. | **6 h** | Pendiente |
| **Hito 4** *(Sem. 4)* | **4. Interfaz de juego (Frontend) y Cierre** | **PBI-8**: Modales interactivos y actualización del bundle OKF del Sprint 2 | `feature/modales-y-cierre-sprint2` | Modales para `SEE_FUTURE`, índice de reinserción de `BOMB` y selección de rival; cierre OKF del Sprint 2. | **3 h** | Pendiente |

## Requisitos heredados del Sprint 1

Estado actualizado durante el **PBI-1** (rama `fix/deuda-sprint1-y-logger`):

| ID | Requisito | Estado heredado | Estado actual (PBI-1) | Resolución / Qué falta |
| :--- | :--- | :--- | :--- | :--- |
| `ARQ-01` | Separación cliente-servidor y mismo origen | parcial | parcial | Se mantiene la arquitectura desacoplada Vercel + Google Cloud Run justificada en [`README.md`](../README.md#22-justificación-del-despliegue-desacoplado-vercel--google-cloud-run). |
| `RF-10` | Creación del primer administrador | parcial | hecho | Documentado en [`README.md`](../README.md#7-creación-y-acceso-como-administrador) el procedimiento de promoción manual, el blindaje de `rol: 'user'` en registro y el acceso para revisión. |
| `RNF-02` | Secretos fuera del código y .env.example | parcial | hecho | Completado [`backend/.env.example`](../backend/.env.example) con todas las variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `FRONTEND_URL` y `ALLOWED_DOMAINS`). |
| `RNF-06` | Pruebas unitarias de la lógica (5 o más) | parcial | hecho | Documentada la ejecución local y el comando único `npm test` en [`README.md`](../README.md#6-ejecución-de-las-pruebas-automatizadas) y añadido el script en [`package.json`](../package.json). |
| `RNF-08` | Registro de actividad (log) | pendiente | hecho | Implementado [`backend/logic/logger.js`](../backend/logic/logger.js), integrado en [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) y [`backend/index.js`](../backend/index.js) con endpoint `GET /api/logs` (solo `admin`) y 4 pruebas en [`backend/logic/logger.test.js`](../backend/logic/logger.test.js). |
| `PRO-01` | Flujo de trabajo GitHub Flow | parcial | en curso | Aplicado estrictamente desde el Sprint 2 (1 rama por PBI, sin commits directos en `main`). |
| `PRO-02` | Integración continua | parcial | en curso | No fusionar ningún Pull Request cuando el workflow de GitHub Actions esté en rojo (`failure`). |

## Cambios previos al arranque del Sprint 2

- El `2026-10-15` se integró en `origin/main` el PR `#18` (`feat/prueba-tecnica-sprint1`, commits [`61503ed`](https://github.com/Fernan196/proyecto-pis/commit/61503ed) y [`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914)) con la validación de dominios permitidos (`ALLOWED_DOMAINS` / `POST /api/prueba/dominio`).
- El `2026-11-11` se integró el PR `#19` (`docs/okf-sprint1`, commits [`125d3fd`](https://github.com/Fernan196/proyecto-pis/commit/125d3fd) y [`e6f1b55`](https://github.com/Fernan196/proyecto-pis/commit/e6f1b55)) y se creó la etiqueta `hito-4`.
