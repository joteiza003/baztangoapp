export const schema = {
  reservas: ['BTReservas', 'reservationCode webId sourceState packageName sourceChannel registeredAt'],
  personas: ['BTPersonas', 'reservationRef personCode firstName lastName fullName state sourceState packageName danceRole gender isTeam isGuest country nationality city arrivalState arrivedAt arrivalDate cancelledAt cancelDate eventDueCents hotelDueCents dueCents advanceNetCents eventPaidNetCents hotelDirectPaidCents paidNetCents pendingCents overpaidCents refundPendingCents paymentState hasDataIssues dataIssueCodes dataIssueDetail'],
  pagos: ['BTPagos', 'reservationRef payerRef payerName paymentCode externalReference occurredAt paymentDate kind method destination receivedBy amountCents state originPaymentRef note'],
  imputaciones: ['BTImputaciones', 'paymentRef personRef destination amountCents'],
  actividades: ['BTActividades', 'activityCode name category eventDate startsAt endsAt timeConfirmed venue capacity sortOrder isGeneralArrival'],
  participaciones: ['BTParticipaciones', 'personRef activityRef entitlement eligible attendanceState firstRegisteredAt registeredDate validRecordCount needsReview reviewReason'],
  habitaciones: ['BTHabitaciones', 'unitCode hotelRoomNumber roomType capacity area isAvailable'],
  estancias: ['BTEstancias', 'personRef roomRef bookedRoomType checkInDate checkOutDate state bedLabel'],
  cajas: ['BTCajas', 'businessDate openedAt closedAt state openingFloatCents grossReceiptsCents refundsCents cashNetCents cardNetCents bizumNetCents transferNetCents expensesPaidCents withdrawalsCents expectedCashCents countedCashCents cashDifferenceCents countedCardCents cardDifferenceCents countedBizumCents bizumDifferenceCents operationCount closingHash'],
  movimientos: ['BTMovimientos', 'cashSessionRef paymentRef expenseRef businessDate occurredAt kind method amountCents concept counterparty state'],
  gastos: ['BTGastos', 'concept supplier category expenseDate dueDate totalCents paidCents pendingCents state'],
  solicitudes: ['BTSolicitudes', 'requestCode webId applicantNames declaredPeopleCount requestedPackage requestedRole state sourceState reason submittedAt priorityAt parentRequestRef promotedReservationRef']
};
export const detailFields = 'email phone dietaryNotes dietaryKnown operationNote';
export function project(resource, row, detail = false) {
  const fields = `_id title eventRef versionRef ${schema[resource][1]} ${detail ? detailFields : ''}`.split(' ');
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(row, field)).map((field) => [field, row[field]]));
}
