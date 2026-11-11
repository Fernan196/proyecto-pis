---
type: Arquitectura
title: Arquitectura del sistema (Sprint 1)
description: Organización en capas del backend y del frontend, frontera entre módulos y catálogo de endpoints HTTP.
timestamp: 2026-11-11
---

# Arquitectura del sistema

La justificación de las tecnologías seleccionadas y del modelo de despliegue desacoplado (Vercel + Google Cloud Run) se encuentra en el [apartado 1 y apartado 2.2 del `README.md`](../README.md#1-justificación-de-tecnologías-elegidas).

## 1. Capas del backend

El servidor (`backend/`) se organiza en tres capas distribuidas en archivos independientes:

1. **Capa API (presentación del servidor)**:
   - [`backend/index.js`](../backend/index.js): inicializa Express, configura CORS y el parseo JSON, conecta Mongoose, expone los endpoints HTTP y gestiona el intercambio de código OAuth con GitHub.
   - [`backend/logic/authMiddleware.js`](../backend/logic/authMiddleware.js): middleware HTTP que verifica la cabecera `Authorization: Bearer <credencial>` y adjunta `req.user` (devuelve `401` si falta o no es válida).
   - [`backend/logic/adminMiddleware.js`](../backend/logic/adminMiddleware.js): middleware HTTP que comprueba `req.user.rol === 'admin'` (devuelve `403` en caso contrario).
2. **Capa de lógica de negocio**:
   - [`backend/logic/userLogic.js`](../backend/logic/userLogic.js): implementa las reglas de dominio (`registrarUsuario`, `loginUsuario`, `confirmarCuenta`, `listarUsuarios`, `comprobarActivo`, `cambiarRolUsuario`, `eliminarUsuario` y `procesarLoginGitHub`).
   - [`backend/logic/mailer.js`](../backend/logic/mailer.js): servicio de envío del correo de activación mediante `nodemailer` (`enviarCorreoConfirmacion`).
   - [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js): batería de 16 pruebas unitarias automatizadas con Jest sobre `userLogic.js`.
3. **Capa de acceso a datos**:
   - [`backend/data/userModel.js`](../backend/data/userModel.js): define el esquema `userSchema` (`username`, `email`, `confirmado`, `rol`, `githubId` y credencial con hash) y exporta el modelo `User` de Mongoose, incluyendo la transformación `toJSON` para normalizar `id` y omitir el hash.

## 2. Capas del frontend

La aplicación cliente (`frontend/src/`) separa la interfaz gráfica de la comunicación con el servidor:

1. **Capa de presentación (GUI)**:
   - [`frontend/src/main.jsx`](../frontend/src/main.jsx) y [`frontend/src/App.jsx`](../frontend/src/App.jsx): punto de entrada y enrutador (`BrowserRouter`) con las rutas `/login`, `/register` y `/dashboard`.
   - [`frontend/src/login.jsx`](../frontend/src/login.jsx): formulario de acceso local, lectura de parámetros de retorno OAuth/confirmación y botón de redirección a GitHub OAuth.
   - [`frontend/src/register.jsx`](../frontend/src/register.jsx): formulario de registro local con validación de campos en cliente.
   - [`frontend/src/dashboard.jsx`](../frontend/src/dashboard.jsx): panel de usuario autenticado (cierre de sesión y baja propia) y tabla de administración para el rol `admin` (listado, promoción/degradación de rol y eliminación de cuentas).
   - [`frontend/src/protectedRoutes.jsx`](../frontend/src/protectedRoutes.jsx): componente de guarda que redirige a `/login` si no existe credencial de sesión en `localStorage`.
   - Estilos en [`frontend/src/index.css`](../frontend/src/index.css) y [`frontend/src/App.css`](../frontend/src/App.css).
2. **Cliente de comunicación**:
   - [`frontend/src/services/api.js`](../frontend/src/services/api.js): concentra las llamadas `fetch` hacia la API REST (`login`, `register`, `cambiarRol`, `obtenerUsuarios` y `eliminarUsuario`).

## 3. Frontera exacta entre capas

- **Frontera Presentación ↔ Cliente de comunicación (Frontend)**:
  - Los componentes React (`login.jsx`, `register.jsx`, `dashboard.jsx`) importan las funciones asíncronas de [`frontend/src/services/api.js`](../frontend/src/services/api.js) y reciben objetos JavaScript ya deserializados o excepciones `Error(mensaje)`.
  - **Excepción detectada en el código**: en [`frontend/src/login.jsx`](../frontend/src/login.jsx) (líneas 53-55), `handleGithubLogin` asigna `window.location.href` directamente hacia la URL de `/api/auth/github` del backend en lugar de obtenerla desde `services/api.js`.
- **Frontera Cliente ↔ Servidor**:
  - Cliente y servidor se despliegan en orígenes distintos (Vercel y Google Cloud Run) y se comunican únicamente mediante peticiones HTTP/JSON y redirecciones OAuth/confirmación con políticas CORS en [`backend/index.js`](../backend/index.js) (línea 14). El backend no sirve los archivos estáticos del frontend (véase `ARQ-01` en [`requisitos.md`](./requisitos.md)).
- **Frontera API ↔ Lógica de negocio (Backend)**:
  - [`backend/index.js`](../backend/index.js) extrae parámetros de `req.body`, `req.params` y `req.user`, invoca las funciones exportadas por [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) y traduce el resultado o la excepción a códigos de estado HTTP (`200`, `201`, `302`, `400`, `401`, `403`, `404`, `500`).
  - Nota de ubicación de archivos: [`authMiddleware.js`](../backend/logic/authMiddleware.js) y [`adminMiddleware.js`](../backend/logic/adminMiddleware.js) están dentro de la carpeta `backend/logic/`, aunque operan sobre los objetos `req` y `res` de Express en la capa API.
- **Frontera Lógica de negocio ↔ Acceso a datos (Backend)**:
  - [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) importa el modelo `User` de [`backend/data/userModel.js`](../backend/data/userModel.js) y ejecuta sobre él operaciones de Mongoose (`User.findOne`, `User.find`, `User.findById`, `User.findByIdAndDelete`, `User.countDocuments`, `nuevoUsuario.save`) además de validar identificadores con `mongoose.Types.ObjectId.isValid`. Debido a que `userModel.js` expone directamente el modelo de Mongoose y no un repositorio con interfaz agnóstica, al pasar de memoria a base de datos en el commit [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e) fue necesario modificar `userLogic.js`.

## 4. Tabla de endpoints de la API

Definidos en [`backend/index.js`](../backend/index.js):

| Método | Ruta | Quién puede invocarlo | Función en `userLogic.js` | Respuesta principal |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/usuarios` | Público (sin sesión) | `registrarUsuario({ username, email, password })` (fuerza `rol: 'user'`) | `201 Created` con `{ mensaje, userId }` o `400` |
| `POST` | `/api/login` | Público (cuenta confirmada) | `loginUsuario(req.body)` | `200 OK` con credencial JWT y `user`, `403` si no confirmada o `401` |
| `GET` | `/api/usuarios/confirmar/:token` | Público (enlace de activación) | `confirmarCuenta(req.params.token)` | `302 Redirect` a `/login?confirmed=true` o `/login?error=token_invalido` |
| `GET` | `/api/auth/github` | Público (sin sesión) | *(Redirección en capa API)* | `302 Redirect` a `https://github.com/login/oauth/authorize` |
| `GET` | `/api/auth/github/callback` | Público (retorno de GitHub) | `procesarLoginGitHub(...)` | `302 Redirect` a `/login` con sesión OAuth o error |
| `GET` | `/api/usuarios` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `listarUsuarios()` | `200 OK` con array de usuarios sin hash de clave |
| `GET` | `/api/usuarios/:id/activo` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `comprobarActivo(req.params.id)` | `200 OK` con `{ id, email, activo }` o `404` |
| `PATCH` | `/api/usuarios/:id/rol` | Solo `admin` (`authMiddleware` + `adminMiddleware`) | `cambiarRolUsuario(id, nuevoRol)` | `200 OK` con `{ mensaje, usuario }` o `400` |
| `DELETE` | `/api/usuarios/:id` | Autenticado (`authMiddleware`): `admin` a cualquiera (salvo último `admin`); `user` solo a sí mismo | `eliminarUsuario({ solicitanteId, solicitanteRol, objetivoId })` | `200 OK` con `{ mensaje }` o `400` / `403` / `404` |
