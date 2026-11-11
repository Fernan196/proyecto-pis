---
type: Decisiones
title: Decisiones de diseño y arquitectura (Sprint 1)
description: Registro de decisiones técnicas tomadas durante el Sprint 1 y cambios de enfoque verificados en el historial de Git.
timestamp: 2026-11-11
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
