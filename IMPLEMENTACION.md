# Plan de implementación — 17/11/2026

Objetivo: publicar la interfaz independiente de consulta en GitHub Pages y preparar Velo como backend privado. El diseño funcional previo y sus 14 colecciones se mantienen. El cambio de alojamiento reemplaza el servidor externo/Members propuesto por HTTP Functions y una credencial compartida de equipo.

1. Frontend sin dependencias, en `docs/`: navegación, búsqueda, filtros, paginación, ficha, estados seguros y adaptación desde 320 px. Sin datos de demostración públicos.
2. Backend en `wix/`: autenticación con Secrets Manager, sesiones firmadas de 15 minutos, validación de origen y contrato cerrado de lectura por evento/versión. Pruebas con datos ficticios de autorización, límites, filtros y consistencia.
3. Manual de Wix y contrato de carga versionada. Incorporar el paquete de 14 CSV validado en origen, sin datos del gestor.
4. Verificar pruebas, navegador emulado, teclado y seguridad; publicar exclusivamente este repositorio y comprobar Pages.

Criterio de entrega: URL comprobada, shell sin datos cuando falta conexión, backend copiable y pasos manuales exactos. La instalación en Wix, la primera copia de datos y la integración de carga quedan pendientes del usuario; no se declara sincronización operativa.
