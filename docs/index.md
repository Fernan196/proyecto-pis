# Bundle OKF — Documentación del Proyecto (Sprint 1 y Sprint 2)

Este directorio contiene el bundle completo y operativo en formato **OKF (Open Knowledge Format)** que documenta la evolución, arquitectura, trazabilidad y cierre tanto del **Sprint 1** (plataforma SaaS con autenticación, RBAC y OAuth) como del **Sprint 2** (*Michis Explosivos Online* con salas, Socket.IO, ranking y tablero SVG interactivo) del proyecto de *Procesos de Ingeniería del Software* (curso 2026-2027), contrastado con el código, el [README principal](../README.md), los workflows y el historial de Git y GitHub.

## Archivos del bundle

- [`index.md`](./index.md): Índice general del bundle OKF y descripción de sus documentos.
- [`log.md`](./log.md): Cronología inversa (del evento más reciente al más antiguo) de la evolución del repositorio a lo largo del Sprint 1 y el Sprint 2.
- [`arquitectura.md`](./arquitectura.md): Capas del backend (REST + Socket.IO) y del frontend con sus archivos, frontera exacta entre capas y tabla completa de endpoints de la API.
- [`requisitos.md`](./requisitos.md): Matriz de trazabilidad de los 24 requisitos (`ARQ`, `RF`, `RNF` y `PRO`) con su estado tras cerrar la deuda técnica en el Sprint 2 y evidencia verificable.
- [`decisiones.md`](./decisiones.md): Registro de decisiones de diseño y arquitectura (`D-01` a `D-14`), incluyendo el tiempo real con Socket.IO (`D-13`) y la ejecución secuencial/en memoria de pruebas (`D-14`).
- [`procesos.md`](./procesos.md): Descripción del flujo de trabajo en Git, métricas reales de PRs/CI del Sprint 1 y Sprint 2 y despliegue continuo (CD).
- [`sprint-1.md`](./sprint-1.md): Seguimiento de los cuatro hitos del Sprint 1 (objetivo, entregas, PR, etiquetas y desviaciones) y retrospectiva.
- [`sprint-2.md`](./sprint-2.md): Seguimiento completo de los 8 PBIs y 4 hitos del Sprint 2 (*Michis Explosivos Online*), resolución de requisitos heredados y retrospectiva del Sprint 2.
