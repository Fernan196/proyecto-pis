---
type: Sprint
title: Seguimiento y retrospectiva del Sprint 1
description: Desglose de los cuatro hitos semanales del Sprint 1, PR asociados, etiquetas, desviaciones del flujo y retrospectiva.
timestamp: 2026-11-11
---

# Sprint 1

La planificación y el seguimiento de los Product Backlog Items (PBIs) en las categorías *Esqueleto y backend*, *Frontend y sesión*, *Persistencia y roles* y *Servicios externos* se gestionan en el tablero de **Donetonic** del proyecto (https://app.donetonic.com/workspaces/1/projects/1/backlog).

## Hito 1: Esqueleto y backend

- **Objetivo (apartado 10 de la especificación)**: Crear el repositorio y el flujo con ramas y PR; configurar CI ejecutando pruebas y CD en URL pública desde el primer día; implementar la capa lógica de usuarios con datos en memoria (alta, listado, comprobar activo, eliminar) con al menos 5 pruebas unitarias automatizadas y exponerla mediante la API.
- **Qué se hizo**:
  - Creación del esqueleto de `frontend/` y `backend/` ([`0c9fa25`](https://github.com/Fernan196/proyecto-pis/commit/0c9fa25)), justificación tecnológica inicial en `README.md` ([`fe1e895`](https://github.com/Fernan196/proyecto-pis/commit/fe1e895)) y script `start` ([`bfaa482`](https://github.com/Fernan196/proyecto-pis/commit/bfaa482)).
  - Registro de usuarios en memoria y primeras pruebas en [`1e23454`](https://github.com/Fernan196/proyecto-pis/commit/1e23454).
  - Operaciones de listado, comprobación de activo, eliminación en memoria, endpoints en `backend/index.js` y primer workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) en [`2b3f876`](https://github.com/Fernan196/proyecto-pis/commit/2b3f876).
- **PR y etiqueta**:
  - PR `#1` (`feature/gestion-usuarios`, merge [`1021af5`](https://github.com/Fernan196/proyecto-pis/commit/1021af5)) y PR `#2` (`feature/resto-usuarios`, merge [`5be332d`](https://github.com/Fernan196/proyecto-pis/commit/5be332d)).
  - Etiqueta `hito-1` en el commit [`1021af5`](https://github.com/Fernan196/proyecto-pis/commit/1021af5).
- **Desviaciones del flujo**:
  - Confirmado con `gh pr list`: los 3 primeros commits (`0c9fa25`, `fe1e895`, `bfaa482`) se subieron directamente a `main` sin Pull Request.
  - La etiqueta `hito-1` se colocó en [`1021af5`](https://github.com/Fernan196/proyecto-pis/commit/1021af5) (PR `#1`) antes de integrar el PR `#2` ([`5be332d`](https://github.com/Fernan196/proyecto-pis/commit/5be332d)), que es el que completaba las operaciones de usuario en memoria y añadía `.github/workflows/ci.yml`.

## Hito 2: Frontend y sesión

- **Objetivo (apartado 10 de la especificación)**: Separar la interfaz de la capa de comunicación del cliente; implementar registro e inicio de sesión locales con clave almacenada con hash, cierre de sesión, mantenimiento de la sesión entre recargas (con datos aún en memoria) y rutas protegidas.
- **Qué se hizo**:
  - Incorporación de `bcrypt`, `cors` y `jsonwebtoken` en el backend y adaptación de las pruebas a funciones asíncronas ([`400ac92`](https://github.com/Fernan196/proyecto-pis/commit/400ac92)).
  - Creación de [`backend/logic/authMiddleware.js`](../backend/logic/authMiddleware.js), cliente HTTP [`frontend/src/services/api.js`](../frontend/src/services/api.js), vistas [`login.jsx`](../frontend/src/login.jsx), [`register.jsx`](../frontend/src/register.jsx), [`dashboard.jsx`](../frontend/src/dashboard.jsx) y guarda [`protectedRoutes.jsx`](../frontend/src/protectedRoutes.jsx) ([`e66dc6f`](https://github.com/Fernan196/proyecto-pis/commit/e66dc6f)).
- **PR y etiqueta**:
  - PR `#3` (`feature/sesiones-y-frontend`, merge [`49f7bd0`](https://github.com/Fernan196/proyecto-pis/commit/49f7bd0)).
  - Etiqueta `hito-2` en el commit [`49f7bd0`](https://github.com/Fernan196/proyecto-pis/commit/49f7bd0).
- **Desviaciones del flujo**:
  - Ninguna desviación en ramas ni etiquetado en este hito.

## Hito 3: Persistencia y roles

- **Objetivo (apartado 10 de la especificación)**: Introducir la capa de acceso a datos contra una base de datos real sin modificar la capa lógica; extraer los secretos a variables de entorno; implementar los roles de usuario y administrador con restricciones en el servidor y añadir registro (log) de la actividad relevante.
- **Qué se hizo**:
  - Creación del modelo Mongoose en [`backend/data/userModel.js`](../backend/data/userModel.js), middleware [`backend/logic/adminMiddleware.js`](../backend/logic/adminMiddleware.js), plantilla [`backend/.env.example`](../backend/.env.example) y adaptación de [`backend/logic/userLogic.js`](../backend/logic/userLogic.js) y [`backend/logic/userLogic.test.js`](../backend/logic/userLogic.test.js) ([`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e)).
  - Vista de administración en [`frontend/src/dashboard.jsx`](../frontend/src/dashboard.jsx) para listar y eliminar usuarios ([`1b0c157`](https://github.com/Fernan196/proyecto-pis/commit/1b0c157)).
- **PR y etiqueta**:
  - PR `#4` (`feature/persistencia-y-roles`, merge [`69d8dbc`](https://github.com/Fernan196/proyecto-pis/commit/69d8dbc)) y PR `#5` (`feature/frontend-admin`, merge [`69105b3`](https://github.com/Fernan196/proyecto-pis/commit/69105b3), apuntado por la rama `version-entregable-hito3`).
  - Etiqueta `hito-3` en el commit [`69d8dbc`](https://github.com/Fernan196/proyecto-pis/commit/69d8dbc).
- **Desviaciones del flujo**:
  - Para introducir la base de datos en [`993260e`](https://github.com/Fernan196/proyecto-pis/commit/993260e) hubo que modificar `backend/logic/userLogic.js` (el objetivo del hito pedía sustituir la implementación en memoria sin cambiar la capa lógica).
  - La vista de administración del frontend entró en el PR `#5` ([`69105b3`](https://github.com/Fernan196/proyecto-pis/commit/69105b3)) después de haber etiquetado `hito-3` en [`69d8dbc`](https://github.com/Fernan196/proyecto-pis/commit/69d8dbc).
  - El registro (log) de actividad del sistema (`RNF-08`) quedó sin implementar.

## Hito 4: Servicios externos y cierre

- **Objetivo (apartado 10 de la especificación)**: Implementar inicio de sesión con un proveedor externo mediante OAuth y confirmación de cuenta por correo electrónico configurados con la URL pública; manejo de errores con feedback claro al usuario, `README.md` completo y revisión final de la entrega.
- **Qué se hizo**:
  - Confirmación de cuenta por correo con `nodemailer` en [`backend/logic/mailer.js`](../backend/logic/mailer.js) (`e15e69d`, `3332aba`, `9072f04`, `d6ab9fa`).
  - Inicio de sesión con GitHub OAuth (`20f2289`, `56c188a`), configuración de Vercel (`2901eba`), ajustes de SMTP (`05b1a80`, `522e821`, `1f4246f`) y migración del backend a Google Cloud Run (`aaf793a`, `4c2c036`).
  - Rediseño de interfaz, validaciones, cambio de roles (`PATCH /api/usuarios/:id/rol`) y protección del último administrador (`a12c662`, `acdf386`, `87188e8`, `f357424`).
  - Ampliación a 16 pruebas unitarias (`e1b3304`), servicio `mongo:6.0` en GitHub Actions (`1255d01`) y redacción del `README.md` (`c0218b9`, seguido del recorte `9c366fd`).
  - Blindaje de seguridad en el registro público forzando `rol: 'user'` por defecto en [`backend/index.js`](../backend/index.js) y [`backend/logic/userLogic.js`](../backend/logic/userLogic.js), y generación del bundle completo de documentación OKF en [`docs/`](./index.md).
- **PR y etiqueta**:
  - PR `#6` ([`6b80140`](https://github.com/Fernan196/proyecto-pis/commit/6b80140)), PR `#7` ([`7893ae0`](https://github.com/Fernan196/proyecto-pis/commit/7893ae0)), PR `#8` ([`2777f02`](https://github.com/Fernan196/proyecto-pis/commit/2777f02)), PR `#9` ([`abbc32b`](https://github.com/Fernan196/proyecto-pis/commit/abbc32b)), PR `#10` ([`6f17a9f`](https://github.com/Fernan196/proyecto-pis/commit/6f17a9f)), PR `#11` ([`eabcc3a`](https://github.com/Fernan196/proyecto-pis/commit/eabcc3a)), PR `#12` ([`fbef1e5`](https://github.com/Fernan196/proyecto-pis/commit/fbef1e5)), PR `#13` ([`5c3d1ef`](https://github.com/Fernan196/proyecto-pis/commit/5c3d1ef)), PR `#14` ([`3d2d220`](https://github.com/Fernan196/proyecto-pis/commit/3d2d220)), PR `#15` ([`c3db6a7`](https://github.com/Fernan196/proyecto-pis/commit/c3db6a7)), PR `#16` (cerrado sin fusionar), PR `#17` ([`3fd5b67`](https://github.com/Fernan196/proyecto-pis/commit/3fd5b67)), PR `#18` ([`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914)) y PR de cierre con el bundle OKF (`docs/okf-sprint1`).
  - Etiqueta `hito-4` al cierre del Hito 4 y del Sprint 1.
- **Desviaciones del flujo**:
  - Confirmado con `gh pr list`: se hicieron commits directos en `main` sin PR para ajustar URLs y proveedores SMTP (`dec1000`, `522e821`, `4c2c036`, `1f4246f`) que provocaron dos commits de merge de rama remota (`9c01185` y `f89c2b1`), además de la edición directa `9c366fd` sobre `README.md`.
  - Confirmado con `gh run list`: los PR `#11`, `#12`, `#13`, `#14` y `#15` se fusionaron en `main` con el workflow de CI en estado `failure` (rojo).
  - Se reutilizaron las ramas `feature/github-oauth` (PR `#7`, `#8`, `#9`) y `upgrade/front-back` (PR `#11`, `#12`, `#13`, `#14`) en lugar de crear una rama por cambio.

## Retrospectiva del Sprint 1

### Hechos

- El repositorio acumula **48 commits** en `main` al cierre del `2026-10-13` (23 en `--first-parent`, `9c366fd`) y **50 commits** en `origin/main` tras integrar el PR `#18` el `2026-10-15` (24 en `--first-parent`, [`6021914`](https://github.com/Fernan196/proyecto-pis/commit/6021914)), con **18 PR en total** (17 integrados y 1 cerrado sin fusionar) y **24 ejecuciones de CI** (16 `success` y 8 `failure`).
- Los Hitos 1, 2 y 3 se completaron y etiquetaron el mismo día (`2026-10-06`, commits [`1021af5`](https://github.com/Fernan196/proyecto-pis/commit/1021af5), [`49f7bd0`](https://github.com/Fernan196/proyecto-pis/commit/49f7bd0) y [`69d8dbc`](https://github.com/Fernan196/proyecto-pis/commit/69d8dbc)).
- En la configuración del correo de confirmación (`RF-02`) y el despliegue (`RNF-05`) se sucedieron tres cambios de configuración SMTP (`e15e69d`, `522e821`, `05b1a80`/`1f4246f`) y dos proveedores de backend (`dec1000` en Render y `aaf793a`/`4c2c036` en Google Cloud Run).
- El último commit en `main` ([`9c366fd`](https://github.com/Fernan196/proyecto-pis/commit/9c366fd)) eliminó del `README.md` la sección de ejecución en local que había sido añadida minutos antes en [`c0218b9`](https://github.com/Fernan196/proyecto-pis/commit/c0218b9).

### Qué funcionó

- El desarrollo conjunto con IA ha dado resultados, en el sprint burndown se aprecia que se ha completado el Sprint1 en mucho menos tiempo del estimado. La IA utilizada durante el Sprint1 ha sido Gemini Pro, ha sido satisfactorio el resultado obtenido. 

### Qué cambiaría

- En el Sprint1 se ha dejado la generación de la documentación para el final del Sprint, esto ha producido un gran desgaste y un retraso en el inicio del Sprint2. Para futuros Sprints sería interesante intentar ir llevando la documentación al día a día.
