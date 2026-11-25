---
type: Arquitectura
title: Arquitectura del sistema (Sprints 1–3)
description: Organización en capas del backend y del frontend, frontera entre módulos y catálogo de endpoints HTTP y eventos Socket.IO.
timestamp: 2026-11-25
---

# Arquitectura del sistema

La justificación de las tecnologías seleccionadas y del modelo de despliegue desacoplado (Vercel + Google Cloud Run) se encuentra en el [apartado 1 y apartado 2.2 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas).

## 1. Capas del backend

El servidor (`backend/`) se organiza en tres capas distribuidas en archivos independientes:

1. **Capa API (presentación del servidor y composición)**:
   - [`backend/index.js`](../backend/index.js): raíz de composición e inicialización del servidor HTTP de Express y Socket.IO; configura CORS y el parseo JSON, conecta Mongoose, instancia los adaptadores externos (`createMailer` y `createGoogleAuth` con `BACKEND_URL`) e inyecta `userRepo`, `mailer` y `logger` en `createUserLogic`, exponiendo los endpoints HTTP, los callbacks OAuth (GitHub y Google) y la difusión de cambios al canal `lobby`.
   - [`backend/logic/authMiddleware.js`](../backend/logic/authMiddleware.js): middleware HTTP que verifica la cabecera `Authorization: Bearer <credencial>` y adjunta `req.user` (devuelve `401` si falta o no es válida).
   - [`backend/logic/adminMiddleware.js`](../backend/logic/adminMiddleware.js): middleware HTTP que comprueba `req.user.rol === 'admin'` (devuelve `403` en caso contrario).
2. **Capa de servicios externos**:
   - [`backend/services/mailer.js`](../backend/services/mailer.js): adaptador SMTP (`createMailer` y `construirCorreoConfirmacion`) basado en `nodemailer`; permite inyectar un `transporter` doble en pruebas y construye el correo HTML/texto de activación con la URL base `BACKEND_URL`.
   - [`backend/services/googleAuth.js`](../backend/services/googleAuth.js): adaptador OAuth 2.0 de Google (`createGoogleAuth`); construye la URL de autorización e intercambia el código por el perfil del usuario usando `fetchFn` inyectable en pruebas.
3. **Capa de lógica de negocio**:
   - [`backend/logic/userLogic.js`](../backend/logic/userLogic.js): exporta la fábrica `createUserLogic({ userRepo, mailer, logger })`, completamente desacoplada de Mongoose, HTTP y proveedores externos, implementando `registrarUsuario`, `loginUsuario`, `confirmarCuenta`, `listarUsuarios`, `comprobarActivo`, `cambiarRolUsuario`, `eliminarUsuario`, `procesarLoginGitHub`, `procesarLoginGoogle` y `obtenerRanking`.
   - [`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js): implementa la gestión de salas del lobby (`generarCodigoSala`, `crearSala`, `listarSalasDisponibles`, `obtenerSala`, `obtenerSalaActivaJugador`, `unirseASala`, `salirDeSala`, `marcarSalaEnCurso`).
   - [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js): implementa el motor de reglas de *Michis Explosivos* (`construirMazoInicial`, `iniciarPartidaDirecta`, `iniciarPartidaDesdeSala`, `obtenerPartida`, `obtenerVistaJugador`, `obtenerPartidaVistaJugador`, `obtenerSesionJuegoActiva`, `avanzarTurno`, `robarCarta`, `reinsertarBomba`, `jugarCarta`).
   - [`backend/logic/socketManager.js`](../backend/logic/socketManager.js): gestiona el servidor Socket.IO (`autenticarSocketMiddleware`, `configurarSocketIO`, `emitirActualizacionLobby`, `emitirActualizacionSala`, `emitirSalaEliminada`, `emitirEstadoPartidaPorJugador`, `emitirCartasFuturoPrivadas`).
   - [`backend/logic/logger.js`](../backend/logic/logger.js): módulo de registro estructurado de actividad del sistema (`registrarEvento`, `registrarError`, `obtenerLogs`, `limpiarLogs`).
   - [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js), [`backend/services/googleAuth.test.js`](../backend/services/googleAuth.test.js), [`backend/services/mailer.test.js`](../backend/services/mailer.test.js), [`backend/logic/logger.test.js`](../backend/logic/logger.test.js), [`backend/logic/roomLogic.test.js`](../backend/logic/roomLogic.test.js), [`backend/logic/gameLogic.test.js`](../backend/logic/gameLogic.test.js) y [`backend/logic/socketManager.test.js`](../backend/logic/socketManager.test.js): baterías de pruebas unitarias automatizadas con Jest (`21`, `4`, `4`, `4`, `10`, `26` y `7` pruebas respectivamente, **76 en total**).
4. **Capa de acceso a datos**:
   - [`backend/data/userModel.js`](../backend/data/userModel.js): define el esquema `userSchema` (`username`, `email`, `confirmado`, `rol`, `githubId`, `googleId`, `partidasJugadas`, `partidasGanadas` y credencial con hash) y expone funciones de repositorio agnósticas (`esIdValido`, `crearUsuarioDatos`, `buscarPorEmail`, `buscarPorId`, `listarUsuariosDatos`, `actualizarUsuarioDatos`, `contarPorRol`, `eliminarPorId`, `limpiarUsuarios`, `registrarResultadoPartidaUsuarios`, `obtenerRankingUsuarios`, `limpiarEstadisticasMemoria`) sobre Mongoose con respaldo automático en memoria cuando no hay conexión activa.
   - [`backend/data/roomModel.js`](../backend/data/roomModel.js): define el esquema `roomSchema` (`codigo`, `nombre`, `hostId`, `hostUsername`, `maxJugadores`, `estado`, `jugadores`, `partidaId`) y expone funciones de repositorio (`crearSalaDatos`, `buscarPorCodigo`, `buscarSalaActivaPorJugador`, `listarSalasPorEstado`, `actualizarSalaDatos`, `eliminarPorCodigo`, `limpiarSalas`) sobre Mongoose con respaldo automático en memoria cuando no hay conexión activa.
   - [`backend/data/gameModel.js`](../backend/data/gameModel.js): define el esquema `gameSchema` (`codigoSala`, `estado`, `jugadores`, `mazo`, `descartes`, `turnoActualIndex`, `turnoActualUserId`, `turnosPendientes`, `jugadorDesactivando`, `ganadorId`, `ganadorUsername`, `historialAcciones`) y expone funciones de repositorio (`crearPartidaDatos`, `buscarPorCodigoSala`, `buscarPartidaActivaPorJugador`, `actualizarPartidaDatos`, `eliminarPorCodigoSala`, `limpiarPartidas`) sobre Mongoose con respaldo en memoria.

## 2. Capas del frontend

La aplicación cliente (`frontend/src/`) separa la interfaz gráfica de la comunicación con el servidor:

1. **Capa de presentación (GUI)**:
   - [`frontend/src/main.jsx`](../frontend/src/main.jsx) y [`frontend/src/App.jsx`](../frontend/src/App.jsx): punto de entrada y enrutador (`BrowserRouter`) con las rutas `/`, `/login`, `/register`, `/dashboard` y `/partida/:codigo`.
   - [`frontend/src/login.jsx`](../frontend/src/login.jsx): formulario de acceso local, lectura de parámetros de retorno OAuth/confirmación y botones de redirección a Google y GitHub OAuth.
   - [`frontend/src/register.jsx`](../frontend/src/register.jsx): formulario de registro local con validación de campos en cliente y accesos directos de OAuth con Google y GitHub.
   - [`frontend/src/dashboard.jsx`](../frontend/src/dashboard.jsx): panel de usuario autenticado, Lobby en tiempo real de *Michis Explosivos* (crear/unirse/salir/iniciar sala), aviso de reconexión tras recarga, tabla de Ranking de jugadores y panel de administración para el rol `admin`.
   - [`frontend/src/gameBoard.jsx`](../frontend/src/gameBoard.jsx): tablero interactivo de partida en `/partida/:codigo` con vista de rivales, mazo con riesgo de bomba, descartes, mano del jugador, controles de `DEFUSE` / `SEE_FUTURE` / objetivo rival e historial lateral.
   - [`frontend/src/michiCard.jsx`](../frontend/src/michiCard.jsx): componente reutilizable de cartas SVG originales de estilo neón/cartoon (`INFO_CARTAS`).
   - [`frontend/src/protectedRoutes.jsx`](../frontend/src/protectedRoutes.jsx): componente de guarda que redirige a `/login` si no existe credencial de sesión en `localStorage`.
   - Estilos en [`frontend/src/index.css`](../frontend/src/index.css) y [`frontend/src/App.css`](../frontend/src/App.css).
2. **Cliente de comunicación**:
   - [`frontend/src/services/api.js`](../frontend/src/services/api.js): concentra las llamadas `fetch` hacia la API REST (autenticación, usuarios, salas del lobby, partidas, reconexión y ranking).
   - [`frontend/src/services/socket.js`](../frontend/src/services/socket.js): encapsula el cliente `socket.io-client` autenticado mediante JWT para suscribirse a salas y enviar o recibir jugadas en tiempo real.

## 3. Frontera exacta entre capas

- **Frontera Presentación ↔ Cliente de comunicación (Frontend)**:
  - Los componentes React (`login.jsx`, `register.jsx`, `dashboard.jsx`, `gameBoard.jsx`) importan las funciones y URLs expuestas por [`frontend/src/services/api.js`](../frontend/src/services/api.js) (incluyendo `getGoogleAuthUrl` y `getGithubAuthUrl`) y [`frontend/src/services/socket.js`](../frontend/src/services/socket.js), recibiendo objetos JavaScript deserializados o excepciones `Error(mensaje)`.
- **Frontera Cliente ↔ Servidor**:
  - Cliente y servidor se despliegan en orígenes distintos (Vercel y Google Cloud Run) y se comunican únicamente mediante peticiones HTTP/JSON y redirecciones OAuth/confirmación con políticas CORS en [`backend/index.js`](../backend/index.js) (línea 14). El backend no sirve los archivos estáticos del frontend (véase `ARQ-01` en [`requisitos.md`](./requisitos.md)).
- **Frontera API ↔ Lógica de negocio (Backend)**:
  - [`backend/index.js`](../backend/index.js) extrae parámetros de `req.body`, `req.params` y `req.user`, invoca las funciones exportadas por [`backend/logic/userLogic.js`](../backend/logic/userLogic.js), [`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js), [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js), [`backend/logic/socketManager.js`](../backend/logic/socketManager.js) y [`backend/logic/logger.js`](../backend/logic/logger.js) y traduce el resultado o la excepción a códigos de estado HTTP (`200`, `201`, `302`, `400`, `401`, `403`, `404`, `500`).
  - Nota de ubicación de archivos: [`authMiddleware.js`](../backend/logic/authMiddleware.js) y [`adminMiddleware.js`](../backend/logic/adminMiddleware.js) están dentro de la carpeta `backend/logic/`, aunque operan sobre los objetos `req` y `res` de Express en la capa API.
- **Frontera Lógica de negocio ↔ Acceso a datos y servicios externos (Backend)**:
  - [`backend/logic/userLogic.js`](../backend/logic/userLogic.js), [`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js) y [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js) están completamente desacoplados de Mongoose y de servicios externos: `userLogic.js` recibe `userRepo`, `mailer` y `logger` inyectados desde [`backend/index.js`](../backend/index.js) mediante `createUserLogic` (véase [`D-16`](./decisiones.md#d-16-desacoplamiento-de-userlogicjs-mediante-inyección-de-dependencias-y-repositorio-en-memoria)), mientras que `roomLogic.js` y `gameLogic.js` invocan las funciones de repositorio de [`backend/data/roomModel.js`](../backend/data/roomModel.js) y [`backend/data/gameModel.js`](../backend/data/gameModel.js).

## 4. Tabla de endpoints de la API

Definidos en [`backend/index.js`](../backend/index.js):

| Método | Ruta | Quién puede invocarlo | Función en `logic/` | Respuesta principal |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/usuarios` | Público (sin sesión) | `userLogic.registrarUsuario({ username, email, password })` (fuerza `rol: 'user'`) | `201 Created` con `{ mensaje, userId }` o `400` |
| `POST` | `/api/login` | Público (cuenta confirmada) | `userLogic.loginUsuario(req.body)` | `200 OK` con credencial JWT y `user`, `403` si no confirmada o `401` |
| `GET` | `/api/usuarios/confirmar/:token` | Público (enlace de activación) | `userLogic.confirmarCuenta(req.params.token)` | `302 Redirect` a `/login?confirmed=true` o `/login?error=token_invalido` |
| `GET` | `/api/auth/github` | Público (sin sesión) | *(Redirección en capa API)* | `302 Redirect` a `https://github.com/login/oauth/authorize` |
| `GET` | `/api/auth/github/callback` | Público (retorno de GitHub) | `userLogic.procesarLoginGitHub(...)` | `302 Redirect` a `/login` con sesión OAuth o error |
| `GET` | `/api/auth/google` | Público (sin sesión) | `googleAuth.construirUrlAutorizacion()` | `302 Redirect` a `https://accounts.google.com/o/oauth2/v2/auth` |
| `GET` | `/api/auth/google/callback` | Público (retorno de Google) | `googleAuth.intercambiarCodigoPorPerfil` + `userLogic.procesarLoginGoogle` | `302 Redirect` a `/login` con sesión OAuth o error |
| `GET` | `/api/usuarios` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `userLogic.listarUsuarios()` | `200 OK` con array de usuarios sin hash de clave |
| `GET` | `/api/usuarios/:id/activo` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `userLogic.comprobarActivo(req.params.id)` | `200 OK` con `{ id, email, activo }` o `404` |
| `PATCH` | `/api/usuarios/:id/rol` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `userLogic.cambiarRolUsuario(id, nuevoRol)` | `200 OK` con `{ mensaje, usuario }` o `400` |
| `DELETE` | `/api/usuarios/:id` | Autenticado (`authMiddleware`): `admin` a cualquiera (salvo último `admin`); `user` solo a sí mismo | `userLogic.eliminarUsuario({ solicitanteId, solicitanteRol, objetivoId })` | `200 OK` con `{ mensaje }` o `400` / `403` / `404` |
| `GET` | `/api/logs` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `logger.obtenerLogs(limite)` | `200 OK` con lista de eventos recientes del sistema |
| `POST` | `/api/salas` | Autenticado (`authMiddleware`) | `roomLogic.crearSala(...)` | `201 Created` con la sala creada o `400` |
| `GET` | `/api/salas` | Autenticado (`authMiddleware`) | `roomLogic.listarSalasDisponibles()` | `200 OK` con array de salas en estado `WAITING` |
| `GET` | `/api/salas/:codigo` | Autenticado (`authMiddleware`) | `roomLogic.obtenerSala(req.params.codigo)` | `200 OK` con datos de la sala o `404` |
| `POST` | `/api/salas/:codigo/unirse` | Autenticado (`authMiddleware`) | `roomLogic.unirseASala(...)` | `200 OK` con sala actualizada o `400` / `404` |
| `POST` | `/api/salas/:codigo/salir` | Autenticado (`authMiddleware`) | `roomLogic.salirDeSala(...)` | `200 OK` con `{ eliminada, sala }` o `400` / `404` |
| `POST` | `/api/salas/:codigo/iniciar` | Autenticado, solo anfitrión (`authMiddleware` + comprobación `hostId`) | `gameLogic.iniciarPartidaDesdeSala(...)` | `200 OK` con sala en `IN_PROGRESS` y partida inicializada o `400` / `403` / `404` |
| `GET` | `/api/partidas/:codigo` | Autenticado (`authMiddleware`) | `gameLogic.obtenerPartidaVistaJugador(...)` | `200 OK` con vista segura de la partida (oculta mazo y manos rivales) o `404` |
| `POST` | `/api/partidas/:codigo/jugar` | Autenticado, en turno (`authMiddleware` + turno activo) | `gameLogic.jugarCarta(...)` | `200 OK` con evento (`CARTA_JUGADA`, `VISION_FUTURO`, `MAZO_BARAJADO`, `CARTA_ROBADA_RIVAL`) y `vistaJugador` o `400` / `403` / `404` |
| `POST` | `/api/partidas/:codigo/robar` | Autenticado, en turno (`authMiddleware` + turno activo) | `gameLogic.robarCarta(...)` | `200 OK` con evento (`CARTA_ROBADA`, `BOMBA_DESACTIVADA*`, `JUGADOR_ELIMINADO`) y `vistaJugador` o `400` / `403` / `404` |
| `POST` | `/api/partidas/:codigo/reinsertar-bomba` | Autenticado, jugador que desactiva (`authMiddleware`) | `gameLogic.reinsertarBomba(...)` | `200 OK` con evento `BOMBA_DESACTIVADA` y `vistaJugador` o `400` / `403` / `404` |
| `GET` | `/api/ranking` | Autenticado (`authMiddleware`) | `userLogic.obtenerRanking(limite)` | `200 OK` con clasificación de jugadores ordenada por victorias y porcentaje de éxito |
| `GET` | `/api/sesion-juego/activa` | Autenticado (`authMiddleware`) | `gameLogic.obtenerSesionJuegoActiva(req.user.id)` | `200 OK` con estado de sala o partida activa (`enCurso`, `tipo`, `codigoSala`, `sala`, `vistaJugador`) |

## 5. Eventos en tiempo real (Socket.IO)

Gestionados en [`backend/logic/socketManager.js`](../backend/logic/socketManager.js) con autenticación JWT obligatoria en el *handshake*:

| Evento | Dirección | Canal / Destino | Descripción |
| :--- | :--- | :--- | :--- |
| `room:subscribe` | Cliente → Servidor | `room:<CODIGO>` | Suscribe el socket a una sala del lobby y sincroniza `game:state` si la partida ya está `IN_PROGRESS` |
| `room:unsubscribe` | Cliente → Servidor | `room:<CODIGO>` | Desuscribe el socket de la sala |
| `game:play_card` | Cliente → Servidor | Privado + sala | Ejecuta `gameLogic.jugarCarta`, emite `game:state` a cada jugador y `game:future_cards` en privado si aplica |
| `game:draw_card` | Cliente → Servidor | Privado + sala | Ejecuta `gameLogic.robarCarta` y emite `game:state` por jugador |
| `game:insert_bomb` | Cliente → Servidor | Privado + sala | Ejecuta `gameLogic.reinsertarBomba` y emite `game:state` por jugador |
| `lobby:updated` | Servidor → Cliente | `lobby` | Emite la lista actualizada de salas en estado `WAITING` al crear, unirse, salir o iniciar partida |
| `room:updated` | Servidor → Cliente | `room:<CODIGO>` | Propaga cambios en la sala del lobby (unión, salida o inicio) |
| `room:deleted` | Servidor → Cliente | `room:<CODIGO>` | Notifica que una sala quedó vacía y fue eliminada |
| `game:state` | Servidor → Cliente | `user:<userId>` | Envía exclusivamente la `vistaJugador` segura de cada participante |
| `game:future_cards` | Servidor → Cliente | `user:<userId>` | Envía las 3 primeras cartas del mazo solo al jugador que jugó `SEE_FUTURE` |
