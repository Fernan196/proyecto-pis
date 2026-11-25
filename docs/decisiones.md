---
type: Decisiones
title: Decisiones de diseño y arquitectura (Sprints 1–3)
description: Registro de decisiones técnicas tomadas a lo largo del proyecto y cambios de enfoque verificados en el historial de Git.
timestamp: 2026-11-25
---

# Decisiones de diseño

## D-01: Elección de Node.js con Express y React con Vite

- **Qué se decidió**: Implementar el backend con Node.js y Express (`backend/`) y la interfaz de usuario con React empaquetado con Vite (`frontend/`).
- **Por qué**: Según el commit [`fe1e895`](https://github.com/Fernan196/proyecto-pis/commit/fe1e895) y el [apartado 1 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas), Node.js y Express se eligen por su modelo asíncrono no bloqueante y por compartir el ecosistema JavaScript entre cliente y servidor; React y Vite se eligen por su arquitectura modular de componentes para separar la GUI de la comunicación y la rapidez de compilación.
- **Estado**: Vigente.

## D-02: Almacenamiento inicial de usuarios en memoria

- **Qué se decidió**: Almacenar los usuarios en un array en memoria (`let users = []`) dentro de `backend/logic/userLogic.js` durante los Hitos 1 y 2 (commits [`1e23454`](https://github.com/Fernan196/proyecto-pis/commit/1e23454) y [`2b3f876`](https://github.com/Fernan196/proyecto-pis/commit/2b3f876)).
- **Por qué**: Seguir la planificación incremental de los Hitos 1 y 2 del apartado 10 de la especificación antes de introducir persistencia real en el Hito 3.
- **Estado**: Sustituida por [D-03](#d-03-persistencia-con-mongoose-y-base-de-datos-en-la-nube).

## D-03: Persistencia con Mongoose y base de datos en la nube

- **Qué se decidió**: Sustituir el array en memoria por una base de datos documental gestionada en la nube accedida mediante el ODM Mongoose en [`backend/data/userModel.js`](../backend/data/userModel.js) (introducido en el commit [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e)).
- **Por qué**: Según el [apartado 1 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas), garantiza la persistencia real con alta disponibilidad y asegura la integridad de los datos mediante validaciones de esquema y tipado en la capa de datos.
- **Estado**: Vigente.

## D-04: Sesiones sin estado con JWT en `localStorage` y hash `bcrypt`

- **Qué se decidió**: Cifrar las claves de acceso con `bcrypt` (10 rondas de *salt*) y gestionar la sesión mediante credenciales firmadas con `jsonwebtoken` (caducidad de `2h` en [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e), ampliada a `8h` en [`a12c662`](https://github.com/Fernan196/proyecto-pis/commit/a12c662)) almacenadas en el `localStorage` del navegador.
- **Por qué**: Según el [apartado 1 y apartado 3 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas), permite emitir y verificar sesiones sin estado (*stateless*) que se mantienen entre recargas y proteger las claves frente a ataques de fuerza bruta y tablas arcoíris.
- **Estado**: Vigente.

## D-05: Despliegue inicial del backend en Render

- **Qué se decidió**: Apuntar inicialmente las URLs de producción del cliente hacia `https://proyecto-pis-backend.onrender.com/api` en el commit [`dec1000`](https://github.com/Fernan196/proyecto-pis/commit/dec1000).
- **Por qué**: Inicialmente se eligió Render ya que yo (alumno) había usado anteriormente para otro proyecto Render y había quedado contento, pero debido a problemas con el envío de correos para la confirmación de las cuentass (Render los bloqueaba) se decidió cambiar a Google Cloud Run. También se elige migrar a Google Cloud Run porque es el que el profesor usa en clase y es más fácil de seguir.
- **Estado**: Sustituida por [D-06](#d-06-despliegue-desacoplado-en-vercel-y-google-cloud-run).

## D-06: Despliegue desacoplado en Vercel y Google Cloud Run

- **Qué se decidió**: Desplegar el frontend estático en Vercel (`https://proyecto-pis.vercel.app`) y el backend en Google Cloud Run (`https://proyecto-pis-814769346481.europe-southwest1.run.app`), habilitando CORS entre ambos orígenes (commits [`aaf793a`](https://github.com/Fernan196/proyecto-pis/commit/aaf793a) y [`4c2c036`](https://github.com/Fernan196/proyecto-pis/commit/4c2c036)).
- **Por qué**: Según el [apartado 2.2 del `README.md`](../README.md#22-justificación-del-despliegue-desacoplado-vercel--google-cloud-run), permite servir los estáticos desde una CDN global (Vercel) y ejecutar la API en microcontenedores que escalan desde cero con puertos de red libres para salida SMTP (Google Cloud Run).
- **Estado**: Vigente.

## D-07: Envío de correo por SMTP con Brevo en puerto 2525

- **Qué se decidió**: Cambiar temporalmente la configuración de `nodemailer` en [`backend/logic/mailer.js`](../backend/logic/mailer.js) al servidor `smtp-relay.brevo.com` en el puerto `2525` (commit [`522e821`](https://github.com/Fernan196/proyecto-pis/commit/522e821)).
- **Por qué**: Se llevo a cabo este cambio de configuración para intentar que funcionase la confirmación por correo de cuenta, pero el proveedor cloud seguía bloqueando.
- **Estado**: Sustituida por [D-08](#d-08-envío-de-correo-por-smtp-de-gmail-en-puerto-465-ssl).

## D-08: Envío de correo por SMTP de Gmail en puerto 465 (SSL)

- **Qué se decidió**: Configurar [`backend/logic/mailer.js`](../backend/logic/mailer.js) contra `smtp.gmail.com` en el puerto `465` con `secure: true` (commits [`05b1a80`](https://github.com/Fernan196/proyecto-pis/commit/05b1a80) y [`1f4246f`](https://github.com/Fernan196/proyecto-pis/commit/1f4246f)).
- **Por qué**: Según los comentarios del commit [`05b1a80`](https://github.com/Fernan196/proyecto-pis/commit/05b1a80) y el [apartado 2.2 del `README.md`](../README.md#22-justificación-del-despliegue-desacoplado-vercel--google-cloud-run), obligar a usar conexión SSL en el puerto 465 aprovechando que Google Cloud Run permite salida SMTP directa.
- **Estado**: Vigente.

## D-09: Base de datos en memoria (`mongodb-memory-server`) para pruebas

- **Qué se decidió**: Ejecutar las pruebas de `userLogic.test.js` levantando una instancia efímera con `mongodb-memory-server` en el commit [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e).
- **Por qué**: Según los comentarios en [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e), probar la capa lógica contra Mongoose sin depender de una base de datos externa preexistente.
- **Estado**: Sustituida por [D-10](#d-10-contenedor-de-servicio-en-ci-y-mock-de-correo-para-pruebas).

## D-10: Contenedor de servicio en CI y mock de correo para pruebas

- **Qué se decidió**: Conectar [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js) a una instancia local en el puerto `27017` provista en GitHub Actions mediante un contenedor `services.mongodb` (`mongo:6.0` en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) y aislar el envío de correo con `jest.mock('./mailer')` (commits [`e1b3304`](https://github.com/Fernan196/proyecto-pis/commit/e1b3304) y [`1255d01`](https://github.com/Fernan196/proyecto-pis/commit/1255d01)).
- **Por qué**: Según los comentarios en [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js) (línea 5) y [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (línea 13), ejecutar las pruebas de forma determinista y sin conexiones de red externas (evitando la descarga en caliente del binario de `mongodb-memory-server` en CI).
- **Estado**: Vigente.

## D-11: Evolución del modelo de usuario (`estado`/`rol` a `confirmado`/`user`/`admin` y borrado físico)

- **Qué se decidió**: Pasar del esquema inicial con `estado: ['pendiente', 'activo', 'eliminado']` y `rol: ['usuario', 'administrador']` ([`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e)) al esquema con `confirmado: Boolean`, `rol: ['user', 'admin']`, borrado físico (`User.findByIdAndDelete`) y bloqueo de eliminación o degradación del último administrador (commits [`a12c662`](https://github.com/Fernan196/proyecto-pis/commit/a12c662), [`87188e8`](https://github.com/Fernan196/proyecto-pis/commit/87188e8) y [`f357424`](https://github.com/Fernan196/proyecto-pis/commit/f357424)).
- **Por qué**: Según el [apartado 3 del `README.md`](../README.md#3-reglas-de-negocio-y-seguridad-implementadas) y los comentarios en [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) (líneas 159 y 196), impedir estados inconsistentes o pérdida de gobernanza si se eliminase o degradase al único administrador del sistema.
- **Estado**: Vigente.

## D-12: Creación del primer administrador y gestión de roles

- **Qué se decidió**: Blindar el alta pública de usuarios en [`backend/index.js`](../backend/index.js) (líneas 24-25, extrayendo únicamente `{ username, email, password }`) y en [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) (línea 48, forzando siempre `rol: 'user'` en `registrarUsuario`), crear al primer administrador mediante promoción manual en la base de datos y habilitar el endpoint `PATCH /api/usuarios/:id/rol` (`cambiarRolUsuario`, líneas 145-173) para que un administrador promueva o degrade cuentas desde el dashboard.
- **Por qué**: El procedimiento previsto para crear al primer administrador en una base de datos vacía es promoverlo manualmente; luego la lógica de negocio prohíbe que el único administrador se elimine o degrade a sí mismo, por lo que puede promover a otros usuarios a administrador antes de darse de baja, garantizando que siempre quede al menos un administrador en la base de datos, mientras que el registro público queda protegido asignando siempre el rol `user` por defecto.
- **Estado**: Vigente.

## D-13: Comunicación en tiempo real con Socket.IO autenticada con JWT y vistas seguras por jugador

- **Qué se decidió**: Sincronizar las salas del lobby y las partidas de *Michis Explosivos* mediante **Socket.IO** integrado en el mismo servidor HTTP de Express ([`backend/index.js`](../backend/index.js) y [`backend/logic/socketManager.js`](../backend/logic/socketManager.js)) y en la capa de comunicación del cliente ([`frontend/src/services/socket.js`](../frontend/src/services/socket.js)), exigiendo el token JWT en el *handshake* y emitiendo por el canal privado `user:<userId>` la `vistaJugador` individual filtrada (`obtenerVistaJugador` en [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js)).
- **Por qué**: Permite reflejar al instante cada jugada, robo, desactivación o abandono sin saturar el servidor con *polling* periódico, reutiliza la autenticación JWT existente y garantiza que ningún cliente reciba el orden completo del mazo ni las cartas de sus rivales.
- **Estado**: Vigente.

## D-14: Repositorios con respaldo en memoria y ejecución secuencial en Jest

- **Qué se decidió**: Mantener desacopladas de Mongoose las nuevas piezas de lógica del Sprint 2 ([`backend/logic/roomLogic.js`](../backend/logic/roomLogic.js) y [`backend/logic/gameLogic.js`](../backend/logic/gameLogic.js)), dotar de respaldo automático en memoria a [`backend/data/roomModel.js`](../backend/data/roomModel.js), [`backend/data/gameModel.js`](../backend/data/gameModel.js) y [`backend/logic/logger.js`](../backend/logic/logger.js) cuando `mongoose.connection.readyState !== 1`, y fijar `"test": "jest --runInBand"` en [`backend/package.json`](../backend/package.json) desde el commit [`aa8f16f`](https://github.com/Fernan196/proyecto-pis/commit/aa8f16f).
- **Por qué**: Tras el fallo puntual `43959694629` en CI durante el PR `#22` por colisión entre archivos de prueba ejecutándose en paralelo contra la base `proyecto_pis_test` de `mongo:6.0`, `--runInBand` garantiza determinismo en GitHub Actions mientras el respaldo en memoria permite ejecutar en local sin demonio MongoDB las **46 pruebas** de `logger`, `roomLogic`, `gameLogic` y `socketManager` (completando en CI las **66 pruebas** totales de la suite).
- **Estado**: Vigente.

## D-15: Retirada completa del filtro de dominios (`ALLOWED_DOMAINS` y `POST /api/prueba/dominio`)

- **Qué se decidió**: Eliminar por completo la comprobación de `ALLOWED_DOMAINS` en `registrarUsuario`, la función `comprobarDominioPermitido`, el endpoint `POST /api/prueba/dominio`, los 4 tests `variante3` en [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js) y la variable `ALLOWED_DOMAINS` de [`backend/.env.example`](../backend/.env.example) y [`README.md`](../README.md).
- **Por qué**: Fue una prueba técnica puntual del Sprint 1 y no tiene sentido para la aplicación restringir el acceso por dominio de correo.
- **Estado**: Vigente.

## D-16: Desacoplamiento de `userLogic.js` mediante inyección de dependencias y repositorio en memoria

- **Qué se decidió**: Refactorizar [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) al patrón fábrica `createUserLogic({ userRepo, mailer, logger })` instanciado en la raíz de composición ([`backend/index.js`](../backend/index.js)), eliminar `require('mongoose')` y las importaciones directas de datos y servicios externos en `userLogic.js`, y dotar a [`backend/data/userModel.js`](../backend/data/userModel.js) de funciones de repositorio (`esIdValido`, `crearUsuarioDatos`, `buscarPorEmail`, `buscarPorId`, `listarUsuariosDatos`, `actualizarUsuarioDatos`, `contarPorRol`, `eliminarPorId`, `limpiarUsuarios`) con respaldo automático en memoria cuando `mongoose.connection.readyState !== 1`.
- **Por qué**: Mantener las fronteras de [`arquitectura.md`](./arquitectura.md) (la lógica no conoce HTTP, el ODM ni los servicios externos, que se crean en la composición y se inyectan) y permitir ejecutar toda la suite de pruebas en local sin MongoDB y con dobles explícitos sin depender de `jest.mock`.
- **Estado**: Vigente.

## D-17: Adaptador SMTP en `backend/services/mailer.js`, variable `BACKEND_URL` y correo corporativo

- **Qué se decidió**: Mover el servicio de correo desde `backend/logic/mailer.js` a [`backend/services/mailer.js`](../backend/services/mailer.js) con la fábrica `createMailer({ transporter, emailUser, emailPass, backendUrl })`, sustituir la URL fija de activación por la variable de entorno `BACKEND_URL` y rediseñar el correo con remitente `"Michis Explosivos"`, asunto `"Activa tu cuenta en Michis Explosivos"`, saludo personalizado con `username`, HTML *responsive* con la paleta oscura/neón del juego, texto plano alternativo (`text`) y aviso de caducidad de 1 hora.
- **Por qué**: Separar los adaptadores de servicios externos de la capa lógica, hacer la URL de confirmación más real y segura entre entornos mediante configuración externa, y mantener coherencia visual y de marca entre la aplicación y el correo.
- **Estado**: Vigente.

## D-18: Autenticación con Google OAuth 2.0 mediante adaptador en `backend/services/googleAuth.js`

- **Qué se decidió**: Implementar el inicio de sesión y registro con **Google OAuth 2.0** (*Authorization Code*) mediante la fábrica `createGoogleAuth` en [`backend/services/googleAuth.js`](../backend/services/googleAuth.js) inyectada desde [`backend/index.js`](../backend/index.js), añadiendo las rutas `GET /api/auth/google` y `GET /api/auth/google/callback` con `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `${BACKEND_URL}/api/auth/google/callback`, el campo `googleId` en [`backend/data/userModel.js`](../backend/data/userModel.js), `procesarLoginGoogle` en [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) y los botones **"Continuar con Google"** en [`frontend/src/login.jsx`](../frontend/src/login.jsx) y [`frontend/src/register.jsx`](../frontend/src/register.jsx) consumiendo la URL desde [`frontend/src/services/api.js`](../frontend/src/services/api.js).
- **Por qué**: Permitir acceder y registrarse directamente con una cuenta de Google sin crear contraseña manual, manteniendo el adaptador HTTP externo aislado en `backend/services/` para probarlo con dobles sin llamadas reales.
- **Estado**: Vigente.

## D-19: Sincronización en tiempo real de la lista de salas del Lobby (`lobby:updated`)

- **Qué se decidió**: Suscribir automáticamente cada socket autenticado al canal `'lobby'` en [`backend/logic/socketManager.js`](../backend/logic/socketManager.js), emitir el evento `lobby:updated` con la lista actualizada de salas `WAITING` desde [`backend/index.js`](../backend/index.js) al crear, unirse, salir o iniciar una sala, escuchar `lobby:updated` en [`frontend/src/dashboard.jsx`](../frontend/src/dashboard.jsx) (re-suscribiendo además ante reconexiones `connect`) y eliminar el botón manual `↻ Actualizar salas`.
- **Por qué**: Al actualizarse automáticamente la lista de salas disponibles en tiempo real para todos los usuarios conectados al Lobby, deja de ser necesario el botón manual de actualización.
- **Estado**: Vigente.

## D-20: Página de Inicio pública en `/` (Landing) y retirada de la barra global sin estilos de `App.jsx`

- **Qué se decidió**: Eliminar el `<nav>` global sin estilos de [`frontend/src/App.jsx`](../frontend/src/App.jsx) (que mostraba `Iniciar Sesión`, `Registrarse` y `Lobby` en todas las vistas), servir la nueva Landing Page [`frontend/src/home.jsx`](../frontend/src/home.jsx) en `/` mostrando **"Ir al Lobby"** cuando ya hay sesión iniciada en lugar de redirigir automáticamente, y rediseñar [`frontend/src/login.jsx`](../frontend/src/login.jsx) y [`frontend/src/register.jsx`](../frontend/src/register.jsx) con cabecera corporativa de *Michis Explosivos*, navegación semántica, soporte completo de `autocomplete`/validación `:user-invalid` e indicador visual de fortaleza de contraseña.
- **Por qué**: Eliminar los enlaces sin formato visibles en todas las rutas (incluido *Lobby* sin iniciar sesión), ofrecer una portada clara del juego que también pueda visitarse con sesión iniciada y unificar la estética y usabilidad de acceso y registro.
- **Estado**: Vigente.
