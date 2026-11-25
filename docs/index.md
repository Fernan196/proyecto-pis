# Bundle OKF — Documentación del Proyecto (Sprints 1–3)

Este directorio contiene el bundle completo y operativo en formato **OKF (Open Knowledge Format)** que documenta la evolución, arquitectura, trazabilidad y cierre del **Sprint 1** (plataforma SaaS con autenticación, RBAC y OAuth), el **Sprint 2** (*Michis Explosivos Online* con salas, Socket.IO, ranking y tablero SVG interactivo) y el seguimiento del **Sprint 3** (*Pulido UX, OAuth Google, Carta Stop y Tablero 3D*) del proyecto de *Procesos de Ingeniería del Software* (curso 2026-2027), contrastado con el código, el [README principal](../README.md), los workflows y el historial de Git y GitHub.

## Archivos del bundle

- [`index.md`](./index.md): Índice general del bundle OKF y descripción de sus documentos.
- [`log.md`](./log.md): Cronología inversa (del evento más reciente al más antiguo) de la evolución del repositorio.
- [`arquitectura.md`](./arquitectura.md): Capas del backend (API/composición, servicios externos, lógica desacoplada y datos) y del frontend con tabla completa de endpoints y eventos Socket.IO.
- [`requisitos.md`](./requisitos.md): Matriz de trazabilidad de los 24 requisitos (`ARQ`, `RF`, `RNF` y `PRO`) con su estado y evidencia verificable.
- [`decisiones.md`](./decisiones.md): Registro de decisiones de diseño y arquitectura (`D-01` a `D-21`), incluyendo Google OAuth 2.0, la sincronización del Lobby en tiempo real, la Página de Inicio pública y la carta `NOPE` (*¡Alto ahí!*).
- [`procesos.md`](./procesos.md): Descripción del flujo de trabajo en Git, métricas reales de PRs/CI y despliegue continuo (CD).
- [`sprint-1.md`](./sprint-1.md): Seguimiento de los cuatro hitos del Sprint 1 (objetivo, entregas, PR, etiquetas y desviaciones) y retrospectiva.
- [`sprint-2.md`](./sprint-2.md): Seguimiento completo de los 8 PBIs y 4 hitos del Sprint 2 (*Michis Explosivos Online*), resolución de requisitos heredados y retrospectiva.
- [`sprint-3.md`](./sprint-3.md): Planificación y seguimiento del Sprint 3 (7 PBIs en 3 categorías/3 hitos, estimaciones y estado por PBI).
