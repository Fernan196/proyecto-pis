# Proyecto PIS — Plataforma SaaS (Sprint 1)

Aplicación web Software as a Service (SaaS) con gestión de usuarios, arquitectura en capas, control de acceso basado en roles (RBAC), autenticación local y federada (OAuth), y despliegue continuo en la nube.

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
- **JSON Web Tokens (JWT)**: Estándar abierto para la emisión y verificación de credenciales de sesión cifradas y sin estado (*stateless*), permitiendo mantener sesiones seguras entre recargas.
- **Bcrypt**: Función de hash criptográfico unidireccional con *salt* configurable para proteger las contraseñas contra ataques de fuerza bruta y tablas arcoíris.
- **Nodemailer**: Librería de transporte de correo para la orquestación segura del flujo transaccional de activación de cuentas vía SMTP.
- **GitHub OAuth 2.0**: Protocolo estándar de autorización federada que permite a los usuarios identificarse de forma rápida y segura utilizando sus cuentas de GitHub.
- **Jest**: Framework de testing automatizado que permite la ejecución determinista, rápida y reproducible de pruebas unitarias sobre las reglas de negocio.
- **GitHub Actions**: Plataforma de Integración Continua (CI) que automatiza la ejecución de la suite de pruebas unitarias en cada *pull request* y cambio en la rama principal.
- **Google Cloud Run & Vercel**: Proveedores *serverless* en la nube para el despliegue continuo (CD) desacoplado de la API contenerizada y la interfaz estática respectivamente.

---

## 2. Arquitectura del Sistema

El proyecto sigue un diseño arquitectónico modular y rigurosamente separado en capas conforme a los principios de ingeniería del software:

### 2.1. Fronteras entre Capas
- **Frontend:**
  - **Capa de Presentación:** Componentes en `frontend/src/` (`login.jsx`, `register.jsx`, `dashboard.jsx`). No manejan URLs de la red ni peticiones `fetch`; únicamente gestionan vistas, estados de interfaz y eventos de usuario.
  - **Cliente de Comunicación:** Ubicado en `frontend/src/services/api.js`. Encapsula todas las llamadas HTTP contra la API, deserializa respuestas y propaga errores tipados a la interfaz.
- **Backend:**
  - **Capa API:** En `backend/index.js`. No ejecuta lógica de negocio ni manipula la base de datos directamente; solo recibe la petición HTTP, ejecuta los middlewares y delega el procesamiento a la lógica de negocio.
  - **Capa de Lógica de Negocio:** En `backend/logic/userLogic.js`. Centraliza el 100% de las validaciones, generación de tokens, hashes, control de permisos RBAC y reglas del dominio.
  - **Capa de Acceso a Datos:** En `backend/data/userModel.js`. Define el esquema persistente con Mongoose, tipos de datos e índices únicos.

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

- **Confirmación obligatoria por correo:** Las cuentas registradas localmente se crean con `confirmado: false`. El login rechaza la sesión (`403 Forbidden`) hasta que el usuario activa su cuenta mediante el enlace enviado por Nodemailer.
- **Autenticación con GitHub (OAuth):** Los usuarios registrados mediante GitHub se activan inmediatamente (`confirmado: true`) según estipula la especificación, obviando el envío de correo de activación redundante.
- **Control de acceso basado en roles (RBAC):**
  - `user`: Puede consultar su información y **eliminar exclusivamente su propia cuenta**.
  - `admin`: Puede **listar todos los usuarios**, **comprobar el estado activo/pendiente**, **promover o degradar roles**, y **eliminar cualquier cuenta**.
- **Protección del último Administrador:** La capa de lógica impide degradar o eliminar al único administrador existente en el sistema, evitando estados inconsistentes o pérdida de gobernanza.
- **Seguridad de contraseñas:** Cifradas con `bcrypt` (10 rondas de salt).
- **Sesión persistente y protegida:** Tokens JWT firmados con caducidad de 8 horas, validados en cada petición mediante `authMiddleware`.

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
| `FRONTEND_URL` | URL de origen permitida para CORS y redirecciones OAuth |

---

## 5. Ejecución en Local

### Prerrequisitos
- Node.js v18 o superior instalado.
- Git.

### 1. Clonar el repositorio
```bash
git clone [https://github.com/Fernan196/proyecto-pis.git](https://github.com/Fernan196/proyecto-pis.git)
cd proyecto-pis