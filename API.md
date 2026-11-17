# Contrato de consulta HTTP

Un endpoint de producción: `POST https://TU-SITIO/_functions/baztango`, JSON, TLS. Preflight `OPTIONS`. El origen permitido es `https://joteiza003.github.io`. Todos los cuerpos salvo login incluyen `eventId`; las lecturas salvo contexto incluyen además `versionId`. Toda consulta privada exige `Authorization: Bearer TOKEN`. No enviar tokens en URL.

| action | Parámetros adicionales | Respuesta |
|---|---|---|
| login | password | token, expiresAt (Unix ms), events |
| context | eventId | event, version |
| summary | eventId, versionId | accepted, arrived, housed, dueCents, paidNetCents, pendingCents, refundPendingCents, issues, requests |
| list | resource, search, filters, page, limit, order | items, total, page, limit |
| detail | personId | person, reservation, people, payments, allocations, participations, activities, stays, rooms |
| requestDetail | requestId | request (con contacto) |
| activityDetail | activityId, group, search, page, limit | activity, counts, items (participación y person), total, page, limit |
| roomDetail | roomId, night (YYYY-MM-DD) | room, night, assigned, free, unknownDates, overCapacity, items (estancia y person) |

`resource`: personas, solicitudes, reservas, pagos, imputaciones, actividades, participaciones, habitaciones, estancias, cajas, movimientos, gastos. Las colecciones no se aceptan como parámetros arbitrarios. `group`: entitled / registered / missing. `order`: default / name / pendingDesc / date. Orden por persona: apellidos/nombre/código; solicitudes por prioridad/código, actividades por jornada/orden. El orden económico usa pendiente descendente cuando el recurso tiene ese campo; los recursos sin el campo usan su orden estable predeterminado.

Filtros de igualdad permitidos, solo cuando pertenecen al recurso: state, paymentState, arrivalState, danceRole, eventDate, category, activityRef, attendanceState, roomType, roomRef, businessDate, cashSessionRef, personRef, reservationRef, paymentRef, expenseRef, needsReview, hasDataIssues, eligible, packageName, isTeam, isGuest, country, requestedPackage, requestedRole, reason, paymentDate, kind, method, destination, receivedBy. Los cinco campos needsReview/hasDataIssues/eligible/isTeam/isGuest usan booleanos JSON; los restantes texto. En pagos, personRef resuelve las imputaciones de la persona, no se confunde con pagador. Los filtros de referencias se verifican en el mismo evento/versión.

Búsqueda normalizada sin tildes en personas/solicitudes mediante `searchText` privado cargado desde el gestor. En catálogos, conceptos y códigos se normalizan los campos en backend sobre un máximo de 1.000 registros después de filtros, con error explícito `SEARCH_LIMIT` si se supera; aplicar filtros más específicos o buscar por identificadores. No se añaden campos a las 14 colecciones. Imputaciones, participaciones y estancias se consultan por filtros relacionados, no ofrecen búsqueda genérica independiente.

Actividad: derechos válidos requieren persona aceptada, eligible=true y entitlement incluido/extra. Asistencia cuenta personas únicas, conserva incidencias fuera de derecho y detecta duplicados. `missing` significa personas con derecho sin registro; no se resta ciegamente toda la asistencia. Alimentación se devuelve solo en ficha individual y participantes de comidas. Máximo de 1.000 participaciones por actividad.

Habitación: noche en intervalo `[entrada,salida)`, sin estancias anuladas. Capacidad procede de la unidad real; fechas/capacidad no informadas dan `free=null`, no disponibilidad ficticia. Duplicados por persona se rechazan. Máximo de 1.000 estancias por unidad.

Errores HTTP con cuerpo `{error: CODIGO}` sin PII ni traza interna: 400 INVALID_QUERY/INVALID_BODY; 401 ACCESS_DENIED; 403 ACCESS_DENIED; 405 METHOD_NOT_ALLOWED; 409 NO_PUBLISHED_DATA/VERSION_EXPIRED/INVALID_REFERENCE; 413 INVALID_BODY; 422 DETAIL_LIMIT/SUMMARY_LIMIT/SEARCH_LIMIT; 429 RATE_LIMIT (Retry-After: 60); 503 CONFIGURATION_PENDING/SERVICE_UNAVAILABLE. Un error o límite no se presenta como un resultado vacío o cero.

La consistencia exige versiones publicadas inmutables. Si el puntero cambia durante la consulta, se descarta el resultado. Consultar de nuevo actualiza el contexto Wix; no inicia la carga desde el gestor.

Cuotas en la versión actualizada: HTTP 429 distingue `RATE_LIMIT` (contador propio) de `ACCESS_SERVICE_BUSY` (cuota de Wix al verificar el acceso) y `DATA_SERVICE_BUSY` (cuota de Wix al consultar datos). El cuerpo incluye `retryAfter` en segundos y la cabecera Retry-After se expone por CORS. Las excepciones de dependencias no se devuelven con sus códigos o mensajes originales. El frontend conserva solo el instante de espera en memoria, borra credenciales/datos y bloquea reenvíos hasta terminar la cuenta atrás, sin reintento automático. Los límites de protección originales no se elevan ni se eliminan.

El cupo de login es de 10/minuto por conexión según request.ip proporcionado por Wix, no un cupo de 10 compartido por todo el sitio. El adaptador HTTP debe pasar `ip: request.ip` al servicio. Esa IP no se acepta desde JSON ni cabeceras reenviadas por el cliente; solo se conserva un HMAC efímero para el contador. Sin IP de plataforma se mantiene un respaldo compartido limitado. Continúan los topes de 180 peticiones/minuto por instancia y 60 consultas/minuto por token.
