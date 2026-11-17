# Punto de entrada para una futura copia del gestor

La aplicación web no escribe en Wix. El futuro cargador administrativo es un proyecto separado: usa credenciales privadas de carga, nunca el secret compartido del panel ni un endpoint de escritura añadido a este servicio.

1. Extraer una copia consistente de solo lectura del gestor y calcular las proyecciones mediante sus servicios vigentes. No deducir saldos o anticipos de columnas históricas aisladas.
2. Crear una fila `BTVersiones` con `state=loading`, `schemaVersion=1`, `eventRef` y fecha real `capturedAt`. Usar IDs nuevos y claves únicas. Mantener intacta la versión visible mientras se carga.
3. Cargar las 12 colecciones de datos con `eventRef` y `versionRef` comunes, resolviendo referencias por `_id` Wix. En `BTPersonas.searchText` incluir nombre, códigos individual/reserva y contactos, normalizados NFD sin marcas, minúsculas y espacios normalizados. Lo mismo en `BTSolicitudes.searchText`; nunca se devuelve ese campo al navegador. Mantener literales los códigos visibles.
4. Excluir solicitudes padre ya sustituidas por una división de la proyección vigente; conservar trazabilidad en las hijas y las promovidas. No contar promovidas como espera/revisión/rechazo.
5. Validar tipos, dominios, claves únicas, todas las referencias al mismo evento/versión, duplicados persona-actividad, llegada general, fechas/noches `[entrada,salida)`, capacidades reales y ausencia de estancias dobles sin incidencia. Conservar fechas civiles como texto, instantes UTC, importes enteros seguros y desconocidos sin rellenar con cero.
6. Reconciliar pagos únicos, imputaciones y no imputados, anulaciones, devoluciones reales/pendientes, anticipos, pagos directos al hotel, saldos individuales/bajas y excesos sin compensación. Para caja usar sesiones canónicas (incluida madrugada), fondo/retiradas y arqueo desconocido. No fabricar movimientos hotel a partir de un agregado ni sumar imputaciones como ingresos.
7. Validar los recuentos físicos `personCount`, `paymentCount`, `recordCount` y la huella `contentHash` con el conjunto cargado. La publicación es una operación administrativa: establecer `publishedAt`, pasar a `ready` solo tras validar y actualizar al final `BTEventos.currentVersionRef`. Releer el resultado.
8. Una versión publicada es inmutable. Toda corrección genera otra versión. Conservar anteriores según una política de retención; el lector actual exige repetir consulta cuando cambia el puntero. No activar ejemplos o un conjunto incompleto/vacío como si fuera copia real.

La importación de los CSV de cabeceras y la publicación de GitHub Pages no ejecutan ninguno de estos pasos. No hay frecuencia de actualización automática comprometida.
