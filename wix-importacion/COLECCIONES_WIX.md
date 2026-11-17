# Colecciones Wix: diccionario de creación manual

Estado: especificación de diseño, 16/11/2026. Ninguna colección se ha creado. No contiene datos reales.

## Cómo leer y crear este esquema

Crear **14 colecciones de varios elementos** en el CMS con los IDs exactos de esta guía. Cada colección conserva los campos del sistema que crea Wix: `_id`, `_createdDate`, `_updatedDate` y `_owner`. No crearlos manualmente ni confundir `_updatedDate` con la fecha del gestor. Usar `title` como campo principal de texto; si Wix ya lo crea, renombrar su etiqueta, sin duplicarlo.

Los tipos de la tabla son los del CMS: Texto, Número, Booleano, Fecha y hora, Referencia. Los campos de referencias apuntan al `_id` del elemento destino, no a su nombre, ID individual o código de reserva. No se necesitan multirreferencias ni objetos JSON para este diseño.

**Obl.** significa obligación del contrato de carga, no promesa de que el CMS aplique todas las reglas. Cuando el editor permita marcar un campo obligatorio, hacerlo; el cargador futuro también deberá validar las reglas, dominios, relaciones y sumas. Los valores enumerados son texto controlado por el contrato, no un tipo de campo enumerado de Wix. No sustituir los campos Texto por Etiquetas: cambia el contrato de consulta.

`sin defecto` significa dejar vacío; no rellenar automáticamente fechas, cantidades desconocidas ni estados. `null` significa valor desconocido/no aplicable y se muestra Sin dato. Un número `0` significa cero conocido. Los importes `*Cents` son Número entero en céntimos de EUR, con máximo de entero seguro de JavaScript. Ejemplo: 12345 representa 123,45 €. No guardar `123,45 €` como texto ni sumar decimales de moneda en el navegador.

Las fechas civiles se guardan en Texto ISO `YYYY-MM-DD` para evitar desplazamientos de día; los instantes van en Fecha y hora con UTC y se presentan en `Europe/Madrid`. No inferir horas en movimientos que solo tienen una fecha.

## Permisos de las 14 colecciones

| Identidad / canal | Leer directo | Crear | Actualizar | Borrar |
|---|---|---|---|---|
| Visitante anónimo | No | No | No | No |
| Miembro cualquiera, incluido el equipo autorizado del panel externo | No | No | No | No |
| Creador del elemento | No | No | No | No |
| Administradores CMS | Sí | Sí | Sí | Sí |
| Servidor externo de consulta | Solo mediante API de Wix y clave con permiso de lectura, tras comprobar sesión, miembro y alcance | No concedido a la clave | No concedido a la clave | No concedido a la clave |

En **Permisos y privacidad > Avanzados**, dejar las cuatro operaciones únicamente para Admin. No usar Mostrar contenido a todos, ni permitir lectura a todos los miembros, ni confiar en el modo Solo lectura de un dataset como autorización. El servidor externo no recibirá un nombre de colección libre del navegador. Los administradores conservan acceso completo por diseño de Wix; los usuarios del panel no reciben acceso como colaboradores CMS. La clave de API actúa con sus propios permisos administrativos limitados y no se distribuye a los miembros.

La propuesta de autenticación usa Wix Members con aprobación manual y flujo Headless; el servidor externo autoriza por una lista privada de IDs de miembros. No crear `Usuarios`, `Passwords`, `Tokens` ni copiar la tabla local `users`. Los usuarios de Members no son filas de BTPersonas. La futura integración de carga tendrá credenciales separadas almacenadas solo en backend. No añadir secretos a estas colecciones. La arquitectura independiente y el acceso se detallan en `ARQUITECTURA_INDEPENDIENTE.md`.

## Campos comunes de las 12 colecciones de datos

Añadir esta tabla a **BTReservas, BTPersonas, BTPagos, BTImputaciones, BTActividades, BTParticipaciones, BTHabitaciones, BTEstancias, BTCajas, BTMovimientos, BTGastos y BTSolicitudes**. Las tablas específicas de abajo son adicionales. `BTEventos` y `BTVersiones` tienen sus propios campos.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Nombre del elemento | `title` | Texto, principal | Sí | sin defecto | Etiqueta humana breve; nunca un payload completo |
| Clave única | `key` | Texto | Sí | sin defecto | Índice único. Componer `versionId:dominio:sourceId`; escapar componentes para evitar colisiones |
| Evento | `eventRef` | Referencia a BTEventos | Sí | sin defecto | Debe coincidir con el evento de versionRef |
| Versión | `versionRef` | Referencia a BTVersiones | Sí | sin defecto | Todas las referencias entre datos apuntan a esta misma versión |
| ID del origen | `sourceId` | Texto | Sí | sin defecto | ID estable del registro o clave compuesta documentada del gestor |
| Actualizado en origen | `sourceUpdatedAt` | Fecha y hora | No | sin defecto | Fecha real del origen si existe; no inventar la fecha de importación |

Crear índice único ascendente de `key` en las 12 colecciones. El cargador debe rechazar duplicados antes de publicar. Los demás índices propuestos son regulares; los límites disponibles dependen del plan Wix. Si no se pueden crear todos, priorizar los de versión y búsqueda antes de construir y verificar rendimiento con el volumen real.

## 1. BTEventos — Ediciones del evento

Una fila por edición; raíz estable que elige la copia publicada. Origen: `editions` y configuración vigente del evento.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Nombre | `title` | Texto, principal | Sí | sin defecto | Ej. Baztango 20 |
| Clave de edición | `eventKey` | Texto | Sí | sin defecto | Única y estable, ej. baztango-2026; no usar solo el nombre visible |
| ID edición origen | `sourceEditionId` | Texto | Sí | sin defecto | ID del gestor más identidad del archivo origen si fuera necesario |
| Año | `year` | Número | Sí | sin defecto | Entero, cuatro cifras |
| Inicio | `startDate` | Texto | Sí | sin defecto | ISO civil |
| Fin | `endDate` | Texto | Sí | sin defecto | ISO civil, igual o posterior al inicio |
| Zona horaria | `timeZone` | Texto | Sí | Europe/Madrid | Identificador IANA |
| Moneda | `currency` | Texto | Sí | EUR | Esta versión del contrato solo admite EUR |
| Visible en selector | `isActive` | Booleano | Sí | false | No equivale a edición vigente en el gestor |
| Copia publicada | `currentVersionRef` | Referencia a BTVersiones | No | sin defecto | Vacía hasta primera publicación completa; el evento de la versión debe coincidir |
| Aviso de antigüedad | `warningMinutes` | Número | Sí | 5 | Entero positivo, usado durante fechas del evento |
| Antigüedad destacada | `staleMinutes` | Número | Sí | 15 | Entero mayor o igual que warningMinutes |

Índice único: `eventKey`. La referencia a versión se puede añadir después de crear BTVersiones para resolver el enlace circular; no asignar ninguna versión todavía.

## 2. BTVersiones — Copias completas de consulta

Una fila por publicación de una copia del gestor. Es metadato de integración futura, no una tabla de personas.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Nombre | `title` | Texto, principal | Sí | sin defecto | Etiqueta de la copia |
| Clave de versión | `versionKey` | Texto | Sí | sin defecto | Única global, generada por cargador |
| Evento | `eventRef` | Referencia a BTEventos | Sí | sin defecto | Una versión pertenece a un evento |
| Estado de carga | `state` | Texto | Sí | loading | loading / ready / failed |
| Capturado en gestor | `capturedAt` | Fecha y hora | Sí | sin defecto | Momento de la copia consistente, no última apertura del navegador |
| Publicado | `publishedAt` | Fecha y hora | No | sin defecto | Solo después de validar y activar el puntero |
| Versión de esquema | `schemaVersion` | Número | Sí | 1 | Entero, contrato de campos |
| Identidad de origen | `sourceLabel` | Texto | Sí | sin defecto | Identificador lógico; sin rutas privadas del ordenador |
| Huella de contenido | `contentHash` | Texto | Sí | sin defecto | Huella del conjunto normalizado; no datos personales |
| Personas publicadas | `personCount` | Número | Sí | sin defecto | Entero >= 0, total físico de BTPersonas de la versión |
| Pagos publicados | `paymentCount` | Número | Sí | sin defecto | Entero >= 0, movimientos únicos |
| Registros publicados | `recordCount` | Número | Sí | sin defecto | Entero >= 0; suma de filas de las 12 colecciones de datos |
| Resumen de validación | `validationSummary` | Texto | No | sin defecto | Resumen sin información personal ni errores internos sensibles |

Índices: único `versionKey`; regular `eventRef + capturedAt`. El lector solo sirve versiones ready que se publicaron; las anteriores pueden conservarse para consultas ya iniciadas mientras dure la ventana de retención. Nunca servir loading/failed por ID directo.

## 3. BTReservas — Agrupaciones de personas

Origen: `reservations` y proyecciones del servicio de reservas. Una reserva aceptada puede tener más de una persona y personas dadas de baja.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Código de reserva | `reservationCode` | Texto | Sí | sin defecto | ID BASE literal, único dentro de la versión |
| Referencia web | `webId` | Texto | No | sin defecto | No es una identidad de persona |
| Estado de origen | `sourceState` | Texto | Sí | sin defecto | Valor original normalizado/documentado; no inventar accepted |
| Paquete de reserva | `packageName` | Texto | No | sin defecto | La ficha muestra también paquete de persona cuando difiere |
| Canal | `sourceChannel` | Texto | No | sin defecto | web / manual / otro valor mapeado |
| Fecha de alta | `registeredAt` | Fecha y hora | No | sin defecto | Si la fuente solo tiene día, no inventar hora |

Índices: `versionRef + reservationCode`; `versionRef + sourceState`. La unicidad del código se comprueba además en carga. No guardar un total de reserva que luego se sume junto a los totales individuales.

## 4. BTPersonas — Clientes y su situación actual

Origen: `reservation_people`, reserva asociada y servicios de ficha, pagos y llegada. Solo personas con identidad individual del gestor; solicitudes no aceptadas van en BTSolicitudes.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Reserva | `reservationRef` | Referencia a BTReservas | Sí | sin defecto | Misma versión |
| ID individual | `personCode` | Texto | Sí | sin defecto | ID INDIVIDUAL literal, único por versión |
| Nombre | `firstName` | Texto | Sí | sin defecto | No deducir sexo o rol del nombre |
| Apellidos | `lastName` | Texto | No | sin defecto | Conserva ambos apellidos cuando existan |
| Nombre completo | `fullName` | Texto | Sí | sin defecto | Visible; title puede repetirlo |
| Texto de búsqueda | `searchText` | Texto | Sí | sin defecto | Nombre/IDs/correo/teléfono normalizados; privado, no devolver al frontend |
| Estado operativo | `state` | Texto | Sí | sin defecto | accepted / cancelled / review; rechazo/espera van en solicitudes |
| Estado original | `sourceState` | Texto | No | sin defecto | Para trazabilidad sin perder equivalencias |
| Paquete | `packageName` | Texto | No | sin defecto | Paquete vigente por persona |
| Rol de baile | `danceRole` | Texto | Sí | unknown | leader / follower / both / unknown |
| Género declarado | `gender` | Texto | No | sin defecto | Solo si el gestor lo informa; no hace falta en la tabla principal |
| Equipo | `isTeam` | Booleano | Sí | false | Contempla marca y paquete según regla del gestor |
| Invitado | `isGuest` | Booleano | Sí | false | No implica acceso a todas las actividades |
| País / región | `country` | Texto | No | sin defecto | Normalización controlada; no confundir con nacionalidad |
| Nacionalidad | `nationality` | Texto | No | sin defecto | Valor informado |
| Ciudad | `city` | Texto | No | sin defecto | Únicamente para contexto/recuentos |
| Correo | `email` | Texto | No | sin defecto | Dato personal; validar formato cuando exista, no obligatorio |
| Teléfono | `phone` | Texto | No | sin defecto | Preserva + y ceros; no Número |
| Necesidad alimentaria | `dietaryNotes` | Texto | No | sin defecto | Sin dato no implica ausencia confirmada de intolerancias |
| Información alimentaria conocida | `dietaryKnown` | Booleano | Sí | false | Solo true cuando la fuente confirma su contenido, incluso ninguna |
| Nota operativa | `operationNote` | Texto | No | sin defecto | Proyección mínima revisada, no observaciones internas completas |
| Llegada general | `arrivalState` | Texto | Sí | unknown | registered / notRegistered / unknown; no equivale a ubicación actual |
| Hora de llegada registrada | `arrivedAt` | Fecha y hora | No | sin defecto | Solo registro válido de llegada general |
| Día de llegada registrada | `arrivalDate` | Texto | No | sin defecto | ISO civil; conserva llegadas con fecha pero sin hora, sin inventar instante |
| Fecha de baja | `cancelledAt` | Fecha y hora | No | sin defecto | Si solo existe fecha civil, conservarla en cancelDate |
| Día de baja | `cancelDate` | Texto | No | sin defecto | ISO civil, sin inferir hora |
| Exigible evento | `eventDueCents` | Número | No | sin defecto | Entero >= 0; proyección del servicio |
| Exigible hotel | `hotelDueCents` | Número | No | sin defecto | Entero >= 0 |
| Exigible total | `dueCents` | Número | No | sin defecto | Evento + hotel si ambos son conocidos |
| Anticipo neto | `advanceNetCents` | Número | No | sin defecto | Neto según reglas actuales, no resta ingenua de columnas |
| Cobrado neto en evento | `eventPaidNetCents` | Número | No | sin defecto | Puede ser negativo tras devoluciones de anticipos en evento |
| Pagado directamente al hotel | `hotelDirectPaidCents` | Número | No | sin defecto | No sumar otra vez el destino hotel de un pago del evento |
| Cobrado neto total | `paidNetCents` | Número | No | sin defecto | Proyección canónica; no deducir dos veces pagos hotel |
| Pendiente de cobro | `pendingCents` | Número | No | sin defecto | Entero >= 0; max(exigible - cobrado neto, 0) por persona |
| Exceso de cobro | `overpaidCents` | Número | No | sin defecto | Entero >= 0; no compensar deudas ajenas |
| Devolución pendiente | `refundPendingCents` | Número | No | sin defecto | Entero >= 0; dato de obligación vigente, distinto de sobrepago |
| Situación económica | `paymentState` | Texto | Sí | unknown | unpaid / partial / pendingHotel / pendingEvent / settled / overpaid / unknown |
| Datos por revisar | `hasDataIssues` | Booleano | Sí | false | Derivado de la lista cerrada de condiciones del diseño funcional |
| Códigos de incidencia | `dataIssueCodes` | Texto | No | sin defecto | Conjunto ordenado separado por `\|`: stateUnresolved / financeUnknown / arrivalMismatch / eligibilityUnknown / stayDatesMissing |
| Motivo visible | `dataIssueDetail` | Texto | No | sin defecto | Explicación breve para el listado de datos incompletos, sin errores internos |

Índices: `versionRef + lastName + personCode`; `versionRef + state`; `versionRef + paymentState`. Validar unicidad de personCode en carga. La búsqueda por contiene puede no aprovechar un índice ordinario: medir con datos reales y combinar igualdad de código y búsqueda normalizada paginada; nunca descargar toda la colección al navegador.

## 5. BTPagos — Movimientos de clientes

Origen: `payments` y servicio de pagos. Una fila por movimiento económico canónico, no por cada persona beneficiaria. `refunds` se reconcilia con el libro canónico: no cargar dos veces la misma devolución.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Reserva | `reservationRef` | Referencia a BTReservas | No | sin defecto | Vacía si no se puede asignar con certeza |
| Pagador | `payerRef` | Referencia a BTPersonas | No | sin defecto | No equivale a todas las personas beneficiarias |
| Nombre de pagador | `payerName` | Texto | No | sin defecto | Texto de origen para casos no enlazados |
| Código de movimiento | `paymentCode` | Texto | Sí | sin defecto | Identidad económica canónica; única por versión |
| Referencia externa | `externalReference` | Texto | No | sin defecto | Referencia operativa, sin IBAN ni datos de tarjeta |
| Instante | `occurredAt` | Fecha y hora | No | sin defecto | Solo si existe hora real |
| Día contable | `paymentDate` | Texto | Sí | sin defecto | ISO civil |
| Tipo | `kind` | Texto | Sí | sin defecto | advance / event / refund / other |
| Método | `method` | Texto | Sí | unknown | cash / card / bizum / transfer / accountingCancellation / other / unknown |
| Destino | `destination` | Texto | Sí | unassigned | event / hotel / mixed / unassigned |
| Receptor del dinero | `receivedBy` | Texto | Sí | unknown | organization / hotel / unknown; distinto del destino contable |
| Importe con signo | `amountCents` | Número | Sí | sin defecto | Cobro positivo, devolución real negativa; anulación contable no es salida física |
| Estado | `state` | Texto | Sí | sin defecto | valid / voided / review |
| Movimiento original | `originPaymentRef` | Referencia a BTPagos | No | sin defecto | Para devolución/reversión cuando existe vínculo real |
| Nota de consulta | `note` | Texto | No | sin defecto | Solo nota operativa permitida |

Índices: `versionRef + occurredAt`; `versionRef + paymentCode`; `versionRef + state`. Reconstruir el movimiento económico compartido con las reglas del gestor; no agrupar por coincidencia de nombre/importe/fecha. No asumir que cada fila histórica de payments equivale a una transferencia bancaria única sin validar su procedencia.

Solo receivedBy=organization puede alimentar la caja de la organización. receivedBy=hotel representa un pago recibido directamente por el hotel; si solo existe un agregado manual en origen, publicarlo en BTPersonas.hotelDirectPaidCents sin inventar una fila de BTPagos. receivedBy=unknown se deja en revisión hasta resolver su receptor.

## 6. BTImputaciones — Reparto de pagos

Origen: `payment_allocations` o asignación canónica validada por el servicio. Una fila por parte de pago imputada a una persona y destino. Si no se conoce el reparto, el pago permanece sin imputar; no repartir a partes iguales por suposición.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Movimiento | `paymentRef` | Referencia a BTPagos | Sí | sin defecto | Misma versión |
| Persona | `personRef` | Referencia a BTPersonas | Sí | sin defecto | Misma versión |
| Destino de la parte | `destination` | Texto | Sí | unassigned | event / hotel / unassigned |
| Importe imputado | `amountCents` | Número | Sí | sin defecto | Con signo coherente con el pago |

Índices: `versionRef + personRef`; `versionRef + paymentRef`. La suma imputada no puede exceder la magnitud del movimiento; si no coincide, marcarlo para revisión y mostrar el resto sin asignar. Los ingresos globales se suman en BTPagos, no en esta tabla.

## 7. BTActividades — Catálogo de consultas y programa

Origen: catálogo/configuración del evento y `attendance_events`. También puede representar llegada general. Una clase incluida en un pack sigue siendo una actividad individual.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Código de actividad | `activityCode` | Texto | Sí | sin defecto | Identidad estable por edición; no usar solo etiqueta/hora |
| Nombre | `name` | Texto | Sí | sin defecto | Etiqueta visible del catálogo actual |
| Familia | `category` | Texto | Sí | sin defecto | meal / milonga / class / social / arrival |
| Jornada | `eventDate` | Texto | Sí | sin defecto | ISO civil de programa, no cambia a medianoche |
| Inicio | `startsAt` | Fecha y hora | No | sin defecto | null si no se conoce |
| Fin | `endsAt` | Fecha y hora | No | sin defecto | Puede estar en día siguiente; posterior a inicio si se conoce |
| Horario confirmado | `timeConfirmed` | Booleano | Sí | false | Según catálogo y revisión, no por mera existencia de una hora |
| Espacio | `venue` | Texto | No | sin defecto | Solo información operativa |
| Capacidad | `capacity` | Número | No | sin defecto | Entero >= 0 si está establecida; no estimar |
| Orden | `sortOrder` | Número | Sí | 0 | Entero para desempates |
| Llegada general del evento | `isGeneralArrival` | Booleano | Sí | false | Solo puede ser true en categoría arrival; como máximo una por versión |

Índices: `versionRef + eventDate + sortOrder`; `versionRef + activityCode`. Cóctel, cena extra, A/B y actividades nocturnas toman la configuración vigente; no codificar todas las fechas de 2026 en la interfaz.

## 8. BTParticipaciones — Derechos y asistencia por actividad

Origen: servicios de elegibilidad/contratación, `attendance_event_enrollments` y registros válidos de `attendance_logs`. Una fila por persona y actividad, incluso si existe asistencia sin derecho. Los repetidos se consolidan sin ocultar la incidencia.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Persona | `personRef` | Referencia a BTPersonas | Sí | sin defecto | Misma versión |
| Actividad | `activityRef` | Referencia a BTActividades | Sí | sin defecto | Misma versión |
| Derecho | `entitlement` | Texto | Sí | unknown | included / extra / none / unknown |
| Habilitado | `eligible` | Booleano | No | sin defecto | null si no se ha podido resolver; false no significa null |
| Asistencia | `attendanceState` | Texto | Sí | unknown | registered / notRegistered / unknown |
| Primer registro válido | `firstRegisteredAt` | Fecha y hora | No | sin defecto | No inventar hora si solo existe fecha |
| Día del primer registro | `registeredDate` | Texto | No | sin defecto | ISO civil si existe registro solo con fecha |
| Registros válidos | `validRecordCount` | Número | Sí | 0 | Entero >= 0; el contador de personas sigue siendo 0/1 |
| Requiere revisión | `needsReview` | Booleano | Sí | false | Ej. asistencia sin derecho, identidad dudosa |
| Motivo de revisión | `reviewReason` | Texto | No | sin defecto | Descripción operativa breve |

sourceId y key se construyen con el par persona-actividad, no con el primer log. Índices: `versionRef + activityRef + attendanceState`; `versionRef + personRef`. No usar el número de filas de attendance_logs como número de asistentes.

## 9. BTHabitaciones — Unidades de alojamiento

Origen: configuración del hotel, mapa de capacidades y asignaciones consolidadas. Una fila por unidad real. No equivale a una reserva ni a una persona.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Código interno | `unitCode` | Texto | Sí | sin defecto | Identidad de la unidad, incluidos APT1/APT2 cuando proceda |
| Número del hotel | `hotelRoomNumber` | Texto | No | sin defecto | Conserva letras/ceros; no sustituye el código interno |
| Tipo | `roomType` | Texto | Sí | unknown | single / double / triple / apartment / other / unknown |
| Capacidad de personas | `capacity` | Número | No | sin defecto | Entero positivo cuando se conoce |
| Edificio o zona | `area` | Texto | No | sin defecto | Ubicación operativa si existe |
| En servicio | `isAvailable` | Booleano | Sí | true | false si la unidad está fuera de servicio; no significa libre |

Índices: `versionRef + unitCode`; `versionRef + roomType`. Si el gestor no tiene un catálogo completo, mostrar solo unidades conocidas y marcar desconocida la disponibilidad total; no crear habitaciones libres ficticias.

## 10. BTEstancias — Personas alojadas y noches

Origen: `rooming_assignments`, datos vigentes de reserva y servicio de alojamiento. Una fila por persona e intervalo. Puede existir sin unidad asignada.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Persona | `personRef` | Referencia a BTPersonas | Sí | sin defecto | Misma versión |
| Habitación | `roomRef` | Referencia a BTHabitaciones | No | sin defecto | Vacía = sin asignar, no habitación desconocida inventada |
| Tipo contratado | `bookedRoomType` | Texto | No | sin defecto | Conserva tipo aun sin unidad asignada |
| Entrada | `checkInDate` | Texto | No | sin defecto | ISO civil |
| Salida | `checkOutDate` | Texto | No | sin defecto | ISO civil, posterior a entrada para ocupación nocturna |
| Estado | `state` | Texto | Sí | sin defecto | reserved / cancelled / review |
| Plaza o cama | `bedLabel` | Texto | No | sin defecto | Dato operativo si existe |

Índices: `versionRef + personRef`; `versionRef + roomRef`. Validar que una persona no ocupa simultáneamente dos unidades sin una incidencia explícita y que no se supera capacidad conocida. La llegada se consulta en BTPersonas/BTParticipaciones; no inventar un check-in por la mera existencia de una estancia.

## 11. BTCajas — Sesiones y resumen de jornada

Origen: `caja_sesiones`, `cajas_daily_service` y adaptación de servicios vigentes. Una fila por sesión de jornada. Totales canónicos, no recalculados con una fórmula genérica en Wix.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Jornada | `businessDate` | Texto | Sí | sin defecto | ISO civil de la sesión |
| Apertura | `openedAt` | Fecha y hora | No | sin defecto | Momento real |
| Cierre | `closedAt` | Fecha y hora | No | sin defecto | null si abierta o pendiente |
| Estado | `state` | Texto | Sí | sin defecto | pending / open / closed / review |
| Fondo | `openingFloatCents` | Número | No | sin defecto | Entero >= 0 conocido |
| Cobros brutos | `grossReceiptsCents` | Número | No | sin defecto | Sin devoluciones, según alcance del servicio |
| Devoluciones reales | `refundsCents` | Número | No | sin defecto | Magnitud positiva; no incluye anulaciones |
| Cobro neto efectivo | `cashNetCents` | Número | No | sin defecto | Con signo |
| Cobro neto tarjeta | `cardNetCents` | Número | No | sin defecto | Con signo |
| Cobro neto Bizum | `bizumNetCents` | Número | No | sin defecto | Con signo |
| Transferencias netas | `transferNetCents` | Número | No | sin defecto | Con signo, fuera del efectivo físico |
| Gastos pagados | `expensesPaidCents` | Número | No | sin defecto | Magnitud positiva, todos los métodos del alcance |
| Retiradas de efectivo | `withdrawalsCents` | Número | No | sin defecto | Magnitud positiva |
| Efectivo físico esperado | `expectedCashCents` | Número | No | sin defecto | Proyección canónica con fondo y movimientos físicos |
| Efectivo contado | `countedCashCents` | Número | No | sin defecto | null si no hubo arqueo; normalizar si origen excluye fondo |
| Diferencia de efectivo | `cashDifferenceCents` | Número | No | sin defecto | Contado - esperado solo si ambos conocidos |
| Tarjeta contada | `countedCardCents` | Número | No | sin defecto | null sin dato |
| Diferencia tarjeta | `cardDifferenceCents` | Número | No | sin defecto | Regla canónica |
| Bizum contado | `countedBizumCents` | Número | No | sin defecto | null sin dato |
| Diferencia Bizum | `bizumDifferenceCents` | Número | No | sin defecto | Regla canónica |
| Número de operaciones | `operationCount` | Número | Sí | sin defecto | Entero >= 0, definición del servicio |
| Huella de cierre | `closingHash` | Texto | No | sin defecto | Permite detectar cambios posteriores |

Índices: `versionRef + businessDate`; `versionRef + state`. El arqueo del modelo local puede excluir el fondo y las retiradas: convertirlo al significado indicado antes de publicar. No presentar diferencias de tarjeta/Bizum como efectivo físico.

## 12. BTMovimientos — Detalle de caja consultable

Origen: proyección conjunta de cobros válidos, pagos reales de gastos y movimientos físicos de caja. Es una vista materializada para consulta; no se vuelve a sumar junto al libro de clientes para obtener ingresos globales.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Caja | `cashSessionRef` | Referencia a BTCajas | No | sin defecto | Vacía = sin asignar a una sesión |
| Pago de cliente | `paymentRef` | Referencia a BTPagos | No | sin defecto | Solo movimientos que provienen de ese libro |
| Gasto | `expenseRef` | Referencia a BTGastos | No | sin defecto | Si es pago de gasto |
| Tipo | `kind` | Texto | Sí | sin defecto | customerReceipt / customerRefund / expensePayment / openingFloat / contribution / withdrawal / adjustment |
| Método | `method` | Texto | Sí | unknown | cash / card / bizum / transfer / other / unknown |
| Instante | `occurredAt` | Fecha y hora | No | sin defecto | Sin hora no se inventa instante |
| Jornada informada | `businessDate` | Texto | No | sin defecto | Necesaria para gastos con día sin hora |
| Importe con signo | `amountCents` | Número | Sí | sin defecto | Entrada +, salida -; fondo/aportación no son ingreso comercial |
| Concepto | `concept` | Texto | Sí | sin defecto | Etiqueta breve y segura |
| Contraparte | `counterparty` | Texto | No | sin defecto | Persona/proveedor si procede |
| Estado | `state` | Texto | Sí | sin defecto | valid / voided / review |

Índices: `versionRef + cashSessionRef + occurredAt`; `versionRef + state`. sourceId incorpora tabla/tipo + ID origen para no colisionar entre pagos y gastos. Las transferencias permanecen separadas de efectivo en la presentación.

## 13. BTGastos — Obligaciones y pagos de gastos

Origen: `gastos`, `gasto_pagos`, extensiones y servicio de caja. Una fila por gasto, no una fila por pago parcial. Los pagos parciales se consultan en BTMovimientos.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Concepto | `concept` | Texto | Sí | sin defecto | Concepto visible |
| Proveedor | `supplier` | Texto | No | sin defecto | Nombre operativo, sin datos bancarios/fiscales |
| Categoría | `category` | Texto | No | sin defecto | Catálogo del gestor |
| Fecha del gasto | `expenseDate` | Texto | No | sin defecto | ISO civil |
| Vencimiento | `dueDate` | Texto | No | sin defecto | ISO civil |
| Total | `totalCents` | Número | No | sin defecto | Entero >= 0 |
| Pagado | `paidCents` | Número | No | sin defecto | Total efectivo de pagos vigentes |
| Pendiente | `pendingCents` | Número | No | sin defecto | Entero >= 0 por gasto |
| Estado | `state` | Texto | Sí | unknown | unpaid / partial / paid / overpaid / unknown |

Índices: `versionRef + state`; `versionRef + dueDate`. Un método informado en un gasto histórico no se interpreta por sí solo como nuevo pago si el servicio vigente ya lo ha materializado.

## 14. BTSolicitudes — Revisión, espera y rechazos

Origen: `web_submissions` y `waitlist_repo`, aplicando reglas de división y promoción. Una fila por solicitud vigente del gestor; las personas declaradas no son todavía BTPersonas salvo aceptación real.

| Etiqueta | ID de campo | Tipo | Obl. | Defecto | Propiedad y regla |
|---|---|---|---|---|---|
| Código de solicitud | `requestCode` | Texto | Sí | sin defecto | ID estable de solicitud, no reutilizar ID de persona |
| Referencia web | `webId` | Texto | No | sin defecto | Referencia informada |
| Solicitantes | `applicantNames` | Texto | Sí | sin defecto | Nombres para consulta; no payload bruto |
| Texto de búsqueda | `searchText` | Texto | Sí | sin defecto | Privado, normalizado, con contacto si existe |
| Correo | `email` | Texto | No | sin defecto | Contacto solo en detalle |
| Teléfono | `phone` | Texto | No | sin defecto | Texto, no Número |
| Personas declaradas | `declaredPeopleCount` | Número | Sí | sin defecto | Entero >= 1; no sumar como aceptados |
| Paquete solicitado | `requestedPackage` | Texto | No | sin defecto | Etiqueta del origen |
| Rol solicitado | `requestedRole` | Texto | Sí | unknown | leader / follower / both / mixed / unknown |
| Clasificación | `state` | Texto | Sí | sin defecto | review / waiting / rejected / promoted |
| Estado original | `sourceState` | Texto | Sí | sin defecto | Ej. rejected no equivale siempre a rechazo definitivo |
| Motivo | `reason` | Texto | No | sin defecto | follower / full / other o equivalencia documentada |
| Solicitud recibida | `submittedAt` | Fecha y hora | No | sin defecto | Instante real del gestor |
| Prioridad efectiva | `priorityAt` | Fecha y hora | No | sin defecto | Prioridad manual o fecha de solicitud según servicio |
| Solicitud de origen | `parentRequestRef` | Referencia a BTSolicitudes | No | sin defecto | Para división; misma versión |
| Reserva aceptada | `promotedReservationRef` | Referencia a BTReservas | No | sin defecto | Solo cuando existe relación fiable |

Índices: `versionRef + state + priorityAt`; `versionRef + requestCode`. Las promovidas se excluyen de pendientes/espera/rechazo y sirven para trazabilidad; las solicitudes padre divididas se excluyen del conjunto vigente según el servicio. No promover ni descartar desde el panel.

## Orden de creación y comprobación manual

1. BTEventos sin asignar currentVersionRef, BTVersiones y después añadir la referencia currentVersionRef.
2. BTReservas, BTPersonas y BTPagos. Añadir originPaymentRef como referencia a la misma colección.
3. BTImputaciones, BTActividades y BTParticipaciones.
4. BTHabitaciones y BTEstancias.
5. BTGastos, BTCajas y BTMovimientos.
6. BTSolicitudes; añadir parentRequestRef como referencia a la propia colección.
7. Configurar los permisos privados en todas; crear índices únicos de key/versionKey/eventKey y los regulares priorizados.
8. Comprobar IDs exactos, campos principales y destinos de referencia. No cargar aún datos reales ni activar el puntero de una versión vacía.

## Validación antes de publicar una copia, en la fase futura

- Extraer una instantánea coherente y de solo lectura del gestor; normalizar con los servicios vigentes.
- Cargar versión loading. Resolver primero entidades y después referencias, incluidas las autorreferencias. Las referencias importadas usan IDs de sistema de Wix.
- Validar que cada referencia pertenece a la misma versión y evento; no existen IDs individuales, reservas o actividades duplicados; sourceId/key no colisionan; los dominios y fechas son válidos.
- Reconciliar movimientos/imputaciones, devoluciones, saldos, personas únicas, derechos/asistencias, capacidad/noches y jornadas de caja con el gestor. Si falta una asignación financiera, no inventarla para cuadrar un total.
- Establecer cantidades exactas en BTVersiones y comparar los recuentos por colección. Estado ready solo después de pasar todas las validaciones. Activar currentVersionRef mediante una actualización controlada; no mezclar versiones durante una carga.
- Releer desde backend la versión activada antes de considerar publicada la copia. No borrar copias antiguas durante consultas activas; definir la retención antes de la integración.

## Qué crear en Wix fuera de las colecciones

Members con aprobación manual; cliente Headless OAuth asociado al sitio actual; dominios de redirección y callback autorizados; clave de API con permiso Read Data Items y alcance del sitio requerido. No conceder a esa clave gestión de colecciones, escritura ni gestión de miembros. Los IDs de miembros permitidos se configuran en el servidor externo, fuera de las colecciones. No es necesario crear páginas de panel ni datasets en Wix. La recuperación de contraseña pertenece a Members. El servidor externo implementará las rutas privadas y el control de sesión; los permisos de páginas Wix por sí solos no protegen una web alojada fuera.

## Fuentes oficiales de Wix

Estas instrucciones combinan capacidades documentadas de Wix y decisiones específicas de este diseño. El administrador debe comprobar las opciones de su editor y plan al crear las colecciones; aún no se han validado contra su cuenta.

- [Campos y tipos CMS](https://support.wix.com/en/article/cms-formerly-content-manager-adding-a-field-to-a-collection)
- [Permisos avanzados y alcance del administrador](https://support.wix.com/en/article/cms-changing-your-collection-permissions)
- [Índices regulares y únicos](https://support.wix.com/en/article/cms-adding-an-index-for-your-collection)
- [Importación y referencias por ID](https://support.wix.com/en/article/cms-formerly-content-manager-importing-content-into-a-collection)
- [Frontend independiente para sitio existente](https://dev.wix.com/docs/go-headless/self-managed-headless/get-started/add-a-frontend-to-an-existing-wix-site)
- [Clave de API con permisos limitados](https://dev.wix.com/docs/go-headless/authentication/admin/generate-an-api-key)
- [Consulta de elementos por API](https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/query-data-items)
