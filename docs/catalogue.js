export const sections = {
  resumen: ['Resumen', 'El evento, a un vistazo', 'Cifras clave, cobros, programa y alojamiento de la edición seleccionada.'],
  clientes: ['Clientes', 'Cada persona, su contexto', 'Encuentra una persona, filtra por situación o consulta las solicitudes.'],
  pagos: ['Pagos', 'Una lectura clara de los saldos', 'Quién debe, quién ha pagado y cómo se ha imputado cada movimiento.'],
  programa: ['Programa', 'El programa y sus participantes', 'Agenda por jornada con derechos y asistencia registrada.'],
  alojamiento: ['Alojamiento', 'Personas, habitaciones y noches', 'Ocupación por noche, unidades reales y estancias publicadas.'],
  caja: ['Caja', 'La jornada, en detalle', 'Sesiones, movimientos de caja y obligaciones de gastos.']
};
export const resources = {
  personas: ['Personas', ['fullName', 'personCode', 'packageName', 'pendingCents', 'arrivalState'], ['state', 'paymentState', 'arrivalState', 'danceRole', 'packageName', 'country', 'isTeam', 'isGuest', 'hasDataIssues']],
  solicitudes: ['Solicitudes', ['applicantNames', 'requestCode', 'declaredPeopleCount', 'state', 'reason'], ['state', 'requestedPackage', 'requestedRole', 'reason']],
  reservas: ['Reservas', ['reservationCode', 'packageName', 'sourceState'], ['sourceState']],
  pagos: ['Movimientos', ['paymentCode', 'payerName', 'paymentDate', 'amountCents', 'state'], ['state', 'paymentDate', 'kind', 'method', 'destination', 'receivedBy', 'personRef', 'reservationRef']],
  imputaciones: ['Imputaciones', ['title', 'personRef', 'paymentRef', 'destination', 'amountCents'], ['personRef', 'paymentRef', 'destination']],
  actividades: ['Actividades', ['name', 'eventDate', 'category', 'venue', 'timeConfirmed'], ['eventDate', 'category']],
  participaciones: ['Participaciones', ['title', 'personRef', 'entitlement', 'attendanceState', 'needsReview'], ['activityRef', 'personRef', 'eligible', 'attendanceState', 'needsReview']],
  habitaciones: ['Habitaciones', ['unitCode', 'hotelRoomNumber', 'roomType', 'capacity', 'isAvailable'], ['roomType']],
  estancias: ['Estancias', ['title', 'personRef', 'roomRef', 'checkInDate', 'checkOutDate'], ['state', 'personRef', 'roomRef']],
  cajas: ['Sesiones', ['businessDate', 'state', 'expectedCashCents', 'countedCashCents', 'cashDifferenceCents'], ['businessDate', 'state']],
  movimientos: ['Movimientos de caja', ['concept', 'businessDate', 'kind', 'method', 'amountCents'], ['state', 'businessDate', 'kind', 'method', 'cashSessionRef', 'expenseRef']],
  gastos: ['Gastos', ['concept', 'supplier', 'totalCents', 'paidCents', 'pendingCents'], ['state', 'category']]
};
export const tabs = {
  clientes: [{key:'personas',label:'Personas',resource:'personas'},{key:'solicitudes',label:'Solicitudes',resource:'solicitudes'},{key:'reservas',label:'Reservas',resource:'reservas'}],
  pagos: [{key:'saldos',label:'Saldos por persona',resource:'personas'},{key:'movimientos',label:'Movimientos',resource:'pagos'},{key:'imputaciones',label:'Imputaciones',resource:'imputaciones'}],
  programa: [{key:'agenda',label:'Agenda',resource:'actividades',view:'agenda'},{key:'participaciones',label:'Participaciones',resource:'participaciones'}],
  alojamiento: [{key:'ocupacion',label:'Ocupación',resource:'habitaciones',view:'ocupacion'},{key:'habitaciones',label:'Habitaciones',resource:'habitaciones'},{key:'estancias',label:'Estancias',resource:'estancias'}],
  caja: [{key:'sesiones',label:'Sesiones',resource:'cajas'},{key:'movimientos',label:'Movimientos de caja',resource:'movimientos'},{key:'gastos',label:'Gastos',resource:'gastos'}]
};
export const labels = {
  fullName:'Persona',personCode:'ID individual',packageName:'Paquete',pendingCents:'Pendiente',arrivalState:'Llegada general',state:'Estado',paymentState:'Situación económica',danceRole:'Rol',country:'País / región',isTeam:'Equipo',isGuest:'Invitado',hasDataIssues:'Datos por revisar',applicantNames:'Solicitantes',requestCode:'Solicitud',declaredPeopleCount:'Personas declaradas',requestedPackage:'Paquete solicitado',requestedRole:'Rol solicitado',reason:'Motivo',reservationCode:'Reserva',sourceState:'Estado de origen',paymentCode:'Movimiento',payerName:'Pagador',paymentDate:'Fecha contable',amountCents:'Importe',kind:'Tipo',method:'Método',destination:'Destino contable',receivedBy:'Receptor del dinero',personRef:'Persona · ID Wix',reservationRef:'Reserva · ID Wix',paymentRef:'Pago · ID Wix',expenseRef:'Gasto · ID Wix',cashSessionRef:'Sesión · ID Wix',activityRef:'Actividad · ID Wix',roomRef:'Habitación · ID Wix',title:'Referencia',name:'Actividad',eventDate:'Jornada',category:'Categoría',venue:'Espacio',timeConfirmed:'Horario confirmado',entitlement:'Derecho',attendanceState:'Asistencia',needsReview:'Revisar',eligible:'Habilitado',unitCode:'Unidad interna',hotelRoomNumber:'Número hotel',roomType:'Tipo de unidad',capacity:'Capacidad de personas',isAvailable:'En servicio',checkInDate:'Entrada',checkOutDate:'Salida',businessDate:'Jornada de caja',expectedCashCents:'Efectivo esperado',countedCashCents:'Efectivo contado',cashDifferenceCents:'Diferencia de efectivo',concept:'Concepto',supplier:'Proveedor',totalCents:'Total',paidCents:'Pagado',dueCents:'Exigible total',paidNetCents:'Cobrado neto',overpaidCents:'Exceso de cobro',refundPendingCents:'Devolución pendiente',eventDueCents:'Exigible evento',hotelDueCents:'Exigible hotel',advanceNetCents:'Anticipo neto',eventPaidNetCents:'Cobrado neto en evento',hotelDirectPaidCents:'Pagado directamente al hotel',email:'Correo',phone:'Teléfono',dietaryNotes:'Necesidad alimentaria',dietaryKnown:'Información alimentaria conocida',operationNote:'Nota operativa',dataIssueDetail:'Motivo de revisión',arrivedAt:'Llegada registrada',arrivalDate:'Día de llegada',cancelDate:'Día de baja',cancelledAt:'Baja registrada',gender:'Género declarado',nationality:'Nacionalidad',city:'Ciudad',webId:'Referencia web',sourceChannel:'Canal',registeredAt:'Alta registrada',externalReference:'Referencia externa',occurredAt:'Instante',originPaymentRef:'Movimiento original',note:'Nota',activityCode:'Código de actividad',startsAt:'Inicio',endsAt:'Fin',sortOrder:'Orden',isGeneralArrival:'Llegada general del evento',firstRegisteredAt:'Primer registro',registeredDate:'Día de registro',validRecordCount:'Registros válidos',reviewReason:'Motivo de revisión',area:'Zona',bookedRoomType:'Tipo contratado',bedLabel:'Plaza / cama',openedAt:'Apertura',closedAt:'Cierre',openingFloatCents:'Fondo',grossReceiptsCents:'Cobros brutos',refundsCents:'Devoluciones reales',cashNetCents:'Neto efectivo',cardNetCents:'Neto tarjeta',bizumNetCents:'Neto Bizum',transferNetCents:'Neto transferencias',expensesPaidCents:'Gastos pagados',withdrawalsCents:'Retiradas de efectivo',countedCardCents:'Tarjeta contada',cardDifferenceCents:'Diferencia tarjeta',countedBizumCents:'Bizum contado',bizumDifferenceCents:'Diferencia Bizum',operationCount:'Operaciones',closingHash:'Huella de cierre',counterparty:'Contraparte',expenseDate:'Fecha del gasto',dueDate:'Vencimiento',submittedAt:'Solicitud recibida',priorityAt:'Prioridad efectiva',parentRequestRef:'Solicitud de origen',promotedReservationRef:'Reserva aceptada',dataIssueCodes:'Códigos de revisión'
};
export const values = { accepted:'Aceptada',cancelled:'Baja',review:'Requiere revisión',waiting:'En espera',rejected:'Rechazada',promoted:'Promocionada',registered:'Registrada',notRegistered:'Sin registro',unknown:'Sin dato',unpaid:'Sin pago',partial:'Parcial',pendingHotel:'Pendiente hotel',pendingEvent:'Pendiente evento',settled:'Al día',overpaid:'Sobrepago',leader:'Leader',follower:'Follower',both:'Ambos',mixed:'Mixto',meal:'Comida',milonga:'Milonga',class:'Clase',social:'Actividad',arrival:'Llegada',included:'Incluido',extra:'Extra',none:'Sin derecho',single:'Individual',double:'Doble',triple:'Triple',apartment:'Apartamento',other:'Otro',reserved:'Reservada',pending:'Pendiente',open:'Abierta',closed:'Cerrada',valid:'Válido',voided:'Anulado',cash:'Efectivo',card:'Tarjeta',bizum:'Bizum',transfer:'Transferencia',accountingCancellation:'Anulación contable',advance:'Anticipo',event:'Evento',hotel:'Hotel',refund:'Devolución real',unassigned:'Sin asignar',organization:'Organización',paid:'Pagado',customerReceipt:'Cobro cliente',customerRefund:'Devolución cliente',expensePayment:'Pago de gasto',openingFloat:'Fondo',contribution:'Aportación',withdrawal:'Retirada',adjustment:'Ajuste' };
export const enums = { paymentState:['unpaid','partial','pendingHotel','pendingEvent','settled','overpaid','unknown'],arrivalState:['registered','notRegistered','unknown'],danceRole:['leader','follower','both','unknown'],category:['meal','milonga','class','social','arrival'],attendanceState:['registered','notRegistered','unknown'],roomType:['single','double','triple','apartment','other','unknown'],method:['cash','card','bizum','transfer','accountingCancellation','other','unknown'],destination:['event','hotel','mixed','unassigned'],receivedBy:['organization','hotel','unknown'] };
export const booleanFields = new Set(['isTeam','isGuest','hasDataIssues','needsReview','eligible']);
export const noSearch = new Set(['participaciones','imputaciones','estancias']);

export const pills = new Set(['state','paymentState','arrivalState','attendanceState','entitlement','kind','method','destination','receivedBy','danceRole','category','roomType','sourceState']);
export const tones = { accepted:'ok',registered:'ok',settled:'ok',paid:'ok',valid:'ok',closed:'ok',included:'ok',reserved:'ok',promoted:'ok',partial:'warn',waiting:'warn',pending:'warn',pendingHotel:'warn',pendingEvent:'warn',open:'warn',extra:'info',review:'warn',unpaid:'bad',cancelled:'bad',rejected:'bad',voided:'bad',overpaid:'info',unknown:'neutral',notRegistered:'neutral',none:'neutral' };
export const quickChips = {
  personas: [
    {id:'all',label:'Aceptados',filters:{state:'accepted'}},
    {id:'unpaid',label:'Sin pago',filters:{state:'accepted',paymentState:'unpaid'}},
    {id:'partial',label:'Pago parcial',filters:{state:'accepted',paymentState:'partial'}},
    {id:'settled',label:'Al día',filters:{state:'accepted',paymentState:'settled'}},
    {id:'overpaid',label:'Sobrepago',filters:{state:'accepted',paymentState:'overpaid'}},
    {id:'notArrived',label:'Sin llegada',filters:{state:'accepted',arrivalState:'notRegistered'}},
    {id:'arrived',label:'Llegados',filters:{state:'accepted',arrivalState:'registered'}},
    {id:'issues',label:'Con incidencias',filters:{hasDataIssues:true}},
    {id:'team',label:'Equipo',filters:{state:'accepted',isTeam:true}},
    {id:'guests',label:'Invitados',filters:{state:'accepted',isGuest:true}},
    {id:'cancelled',label:'Bajas',filters:{state:'cancelled'}}
  ]
};
