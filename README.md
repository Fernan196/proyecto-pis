# Proyecto PIS — Plataforma SaaS y Michis Explosivos Online (Sprint 1 y Sprint 2)

Aplicación web Software as a Service (SaaS) con gestión de usuarios, arquitectura en capas, control de acceso basado en roles (RBAC), autenticación local y federada (OAuth), juego multijugador en tiempo real (*Michis Explosivos*, de 2 a 4 jugadores con Socket.IO) y despliegue continuo en la nube.

- **URL de Producción (Frontend):** [https://proyecto-pis.vercel.app](https://proyecto-pis.vercel.app)
- **URL de la API (Backend):** [https://proyecto-pis-814769346481.europe-southwest1.run.app](https://proyecto-pis-814769346481.europe-southwest1.run.app)
- **Repositorio de GitHub:** [https://github.com/Fernan196/proyecto-pis](https://github.com/Fernan196/proyecto-pis)

---

## 1. Justificación de Tecnologías Elegidas

Cada tecnología utilizada en este proyecto ha sido seleccionada de forma justificada para cubrir los requisitos funcionales, no funcionales y de seguridad de una plataforma SaaS moderna:

- **Node.js**: Entorno de ejecución asíncrono y no bloqueante que permite gestionar peticiones concurrentes de la API con alto rendimiento y bajo consumo de recursos.
- **Express.js**: Framework backend minimalista y flexible que facilita la estructuración desacoplada de rutas HTTP, middlewares de autenticación y controladores.
- **MongoDB Atlas**: Base de datos NoSQL distribuida y gestionada en la nube que garantiza la persistencia real de los datos con esquemas adaptables y alta disponibilidad.
- **Mongoose**: Modelador de objetos (ODM) para MongoDB que asegura la integridad de los datos mediante validaciones de esquema, tipado estricto y abstracción de la capa de persistencia.
- **React (con Vite)**: Biblioteca declarativa para la construcción de interfaces de usuario interactivas y modulares mediante componentes reutilizables, empaquetada con Vite para compilaciones optimizadas y desarrollo ágil.
- **Socket.IO (`socket.io` y `socket.io-client`)**: Comunicación bidireccional en tiempo real autenticada con JWT en el *handshake* para sincronizar salas del lobby y turnos de *Michis Explosivos* mediante canales privados por usuario (`user:<userId>`), evitando *polling* continuo y filtraciones de estado oculto.
- **JSON Web Tokens (JWT)**: Estándar abierto para la emisión y verificación de credenciales de sesión cifradas y sin estado (*stateless*), permitiendo mantener sesiones seguras entre recargas.
- **Bcrypt**: Función de hash criptográfico unidireccional con *salt* configurable para proteger las contraseñas contra ataques de fuerza bruta y tablas arcoíris.
- **Nodemailer**: Librería de transporte de correo para la orquestación segura del flujo transaccional de activación de cuentas vía SMTP.
- **GitHub y Google OAuth 2.0**: Protocolo estándar de autorización federada que permite a los usuarios identificarse y registrarse de forma rápida y segura utilizando sus cuentas de GitHub o Google.
- **Jest**: Framework de testing automatizado que permite la ejecución determinista, rápida y reproducible de pruebas unitarias sobre las reglas de negocio.
- **GitHub Actions**: Plataforma de Integración Continua (CI) que automatiza la ejecución de la suite de pruebas unitarias en cada *pull request* y cambio en la rama principal.
- **Google Cloud Run & Vercel**: Proveedores *serverless* en la nube para el despliegue continuo (CD) desacoplado de la API contenerizada y la interfaz estática respectivamente.

---

## 2. Arquitectura del Sistema

El proyecto sigue un diseño arquitectónico modular y rigurosamente separado en capas conforme a los principios de ingeniería del software:

### 2.1. Fronteras entre Capas
- **Frontend:**
  - **Capa de Presentación:** Componentes en `frontend/src/` (`home.jsx`, `login.jsx`, `register.jsx`, `dashboard.jsx`, `gameBoard.jsx`, `michiCard.jsx` y `protectedRoutes.jsx`). No manejan URLs de la red ni conexiones directas; únicamente gestionan vistas, modales interactivos, estado de interfaz y eventos de usuario.
  - **Cliente de Comunicación:** Ubicado en `frontend/src/services/api.js` (cliente HTTP REST) y `frontend/src/services/socket.js` (cliente Socket.IO autenticado con JWT). Encapsulan toda comunicación con el servidor, deserializan respuestas y propagan errores tipados a la interfaz.
- **Backend:**
  - **Capa API y Composición:** En `backend/index.js` (endpoints REST y raíz de composición donde se inyectan el repositorio de datos, `mailer`, `googleAuth` y `logger` hacia la lógica) y `backend/logic/socketManager.js` (gestión de salas Socket.IO, canal `lobby` y emisión segura por usuario). No ejecutan lógica de negocio ni manipulan la base de datos directamente.
  - **Capa de Servicios Externos:** En `backend/services/mailer.js` (transporte SMTP `nodemailer`) y `backend/services/googleAuth.js` (adaptador OAuth 2.0 de Google). Encapsulan los proveedores externos sin acoplarlos a la capa lógica.
  - **Capa de Lógica de Negocio:** En `backend/logic/` (`userLogic.js` mediante `createUserLogic`, `roomLogic.js`, `gameLogic.js` y `logger.js`). Centraliza las validaciones, generación de tokens, hashes, control de permisos RBAC, gestión de salas, reglas del motor de *Michis Explosivos*, filtrado de vista por jugador y registro estructurado de actividad, sin importar Mongoose ni proveedores externos.
  - **Capa de Acceso a Datos:** En `backend/data/` (`userModel.js`, `roomModel.js` y `gameModel.js`). Define los esquemas persistentes en Mongoose, tipos de datos, estadísticas de partidas e índices únicos, exponiendo funciones de repositorio con respaldo automático en memoria para pruebas desacopladas.

---

### 2.2. Justificación del Despliegue Desacoplado (Vercel + Google Cloud Run)

La especificación del proyecto contempla la libertad de elección tecnológica y arquitectónica siempre que esté justificada. Se ha optado deliberadamente por una **arquitectura desacoplada (*Decoupled Serverless Architecture*)** frente al modelo tradicional de origen único:

1. **Optimización por tipo de recurso:**
   - El **frontend** se aloja en **Vercel**, desplegado sobre una red global de distribución de contenidos (Edge CDN). Esto garantiza tiempos de respuesta mínimos al servir ficheros estáticos precompilados cerca del usuario final y absorbe picos de tráfico en cliente con coste cero.
   - El **backend** se ejecuta en **Google Cloud Run**, una infraestructura de microcontenedores (*containerized microservices*) que escala automáticamente desde cero bajo demanda en un entorno de ejecución aislado con puertos de red libres para salida SMTP.
2. **Escalabilidad y desacoplamiento en un entorno SaaS real:**
   - En producción industrial, el frontend y la API escalan a ritmos y cargas diferentes. Desacoplarlos permite versionar y desplegar actualizaciones de la interfaz visual sin reiniciar los contenedores del servidor, y viceversa.
3. **Respeto a las invariantes de seguridad:**
   - A pesar de residir en dominios diferentes, el cliente **nunca accede directamente a la base de datos ni ejecuta lógica de negocio**. Toda interacción se realiza estrictamente a través de la API REST mediante HTTPS con políticas CORS debidamente restringidas y credenciales seguras.

---

## 3. Reglas de Negocio y Seguridad Implementadas

### 3.1. Plataforma SaaS, RBAC y Seguridad de Cuentas
- **Confirmación obligatoria por correo:** Las cuentas registradas localmente se crean con `confirmado: false`. El login rechaza la sesión (`403 Forbidden`) hasta que el usuario activa su cuenta mediante el enlace enviado por Nodemailer.
- **Autenticación con GitHub y Google (OAuth 2.0):** Los usuarios registrados mediante GitHub o Google se activan inmediatamente (`confirmado: true`), obviando el envío de correo de activación redundante y permitiendo acceder o registrarse directamente sin contraseña manual.
- **Control de acceso basado en roles (RBAC):**
  - `user`: Puede consultar su información, jugar partidas y **eliminar exclusivamente su propia cuenta**.
  - `admin`: Puede **listar todos los usuarios**, **comprobar el estado activo/pendiente**, **consultar logs de actividad**, **promover o degradar roles** y **eliminar cualquier cuenta**.
- **Protección del último Administrador:** La capa de lógica impide degradar o eliminar al único administrador existente en el sistema, evitando estados inconsistentes o pérdida de gobernanza.
- **Seguridad de contraseñas:** Cifradas con `bcrypt` (10 rondas de salt).
- **Sesión persistente y protegida:** Tokens JWT firmados con caducidad de 8 horas, validados en cada petición mediante `authMiddleware` y en el *handshake* de Socket.IO.

### 3.2. Juego Multijugador *Michis Explosivos* (2 a 4 jugadores)
- **Lobby, reconexión y ranking:** Los usuarios autenticados pueden crear o unirse a salas con código de 6 caracteres (de 2 a 4 jugadores), recuperar automáticamente su sala o partida activa tras recargar (`GET /api/sesion-juego/activa`) y consultar el ranking global de victorias y partidas jugadas (`GET /api/ranking`).
- **Reparto inicial e invariante de bombas:** Cada jugador comienza con **7 cartas del mazo + 1 `DEFUSE` (Puntero Láser)**; tras repartir, el servidor inserta **$N - 1$ cartas `BOMB` (Michi Explosivo)** y baraja el mazo.
- **Cartas implementadas:** `BOMB` (Michi Explosivo), `DEFUSE` (Puntero Láser con reinserción secreta por índice), `NOPE` (*¡Alto ahí!* con ventana de reacción de 5 s siempre abierta y contra-Stop *¡Yup!*), `SKIP` (Salto Gatuno), `ATTACK` (Emboscada Felina con acumulación de turnos), `SEE_FUTURE` (Visión Felina de las 3 primeras cartas en privado), `SHUFFLE` (Terremoto en el Arenero), `FAVOR` (Soborno de Atún) y parejas idénticas `CAT_1..4` (Michi Cósmico, Ninja, Pirata y Zombie) para robar 1 carta aleatoria a un rival vivo.
- **Seguridad antitrampas en servidor:** Todas las resoluciones de cartas, turnos, robos y reinserciones se validan en el backend (`gameLogic.js`). La función `obtenerVistaJugador` oculta el mazo completo y la identidad de las cartas rivales tanto en las respuestas HTTP como en los eventos Socket.IO.
- **Modales interactivos y guía integrada:** El tablero ofrece modales dedicados para esconder la bomba desactivada con selector de índice, inspeccionar la visión del futuro en privado, elegir rival objetivo, consultar las reglas y el catálogo de cartas SVG, y visualizar el resultado final de la partida.

---

## 4. Variables de Entorno

El proyecto no almacena ningún secreto en el repositorio. Para ejecutar el entorno local se debe crear un archivo `.env` en la raíz de `backend/` basado en `.env.example`:

| Variable | Descripción |
| :--- | :--- |
| `PORT` | Puerto de escucha del servidor Express (por defecto `8080`) |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave secreta para la firma y verificación de tokens JWT |
| `EMAIL_USER` | Dirección de correo electrónico del remitente SMTP |
| `EMAIL_PASS` | Contraseña de aplicación para acceso seguro a Gmail |
| `GITHUB_CLIENT_ID` | Identificador público de la aplicación OAuth en GitHub |
| `GITHUB_CLIENT_SECRET` | Clave secreta de la aplicación OAuth en GitHub |
| `GOOGLE_CLIENT_ID` | Identificador público de cliente OAuth 2.0 en Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Clave secreta de cliente OAuth 2.0 en Google Cloud Console |
| `FRONTEND_URL` | URL de origen permitida para CORS y redirecciones OAuth |
| `BACKEND_URL` | URL base del servidor utilizada para generar los enlaces de confirmación de cuenta |

---

## 5. Ejecución en Local

### Prerrequisitos
- Node.js v20 o superior y `npm`.
- Una instancia de MongoDB accesible (local en `mongodb://127.0.0.1:27017` o MongoDB Atlas).

### 1. Configurar y arrancar el Backend
```bash
cd backend
npm install
cp .env.example .env   # Completa los valores reales sin subirlos al repositorio
npm start
```

### 2. Configurar y arrancar el Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Ejecución de las Pruebas Automatizadas

Las pruebas unitarias automatizadas están implementadas con **Jest** (`backend/logic/*.test.js` y `backend/services/*.test.js`, actualmente **82 pruebas** repartidas entre `userLogic.test.js`, `googleAuth.test.js`, `mailer.test.js`, `logger.test.js`, `roomLogic.test.js`, `gameLogic.test.js` y `socketManager.test.js`) y se ejecutan de forma secuencial (`jest --runInBand`) para evitar colisiones sobre la base de datos. Todas las suites cuentan con respaldo automático en memoria y dobles para servicios externos cuando no hay conexión MongoDB activa en local, y en CI se ejecutan además contra `mongo:6.0`:

```bash
# Desde la raíz del repositorio (comando único):
npm test

# O directamente desde el directorio backend/:
cd backend
npm test
```

---

## 7. Creación y Acceso como Administrador

- **Primer administrador**: Por seguridad, el registro público (`POST /api/usuarios`) asigna siempre el rol `user`. El primer administrador se crea mediante promoción manual en la colección `users` de la base de datos cambiando su campo `rol` de `"user"` a `"admin"`.
- **Gestión de roles**: Una vez autenticado como `admin`, desde el panel (`/dashboard`) o mediante `PATCH /api/usuarios/:id/rol` puede promover a otros usuarios a `admin` o degradarlos a `user`. La capa lógica impide eliminar o degradar al único administrador existente para evitar que el sistema quede sin gobierno.
- **Credenciales para revisión**: Por seguridad no se publican contraseñas ni cuentas de prueba en el repositorio; las credenciales de acceso como administrador se facilitan por separado junto con la entrega.

