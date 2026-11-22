import { createService, normalize } from '../../wix/service.js';

export const fixturePassword = 'solo-pruebas-ficticias-32-caracteres';
export const person = {_id:'p1',fullName:'Iñigo Apellido ficticio de prueba con un nombre extraordinariamente largo',personCode:'TEST-P-001',state:'accepted',packageName:'Completo',danceRole:'leader',arrivalState:'registered',dueCents:20000,paidNetCents:10000,pendingCents:10000,eventDueCents:12000,hotelDueCents:8000,eventPaidNetCents:7000,reservationRef:'r1',email:'ficticio@example.invalid',dietaryKnown:false};
const activity = {_id:'a1',name:'Cóctel ficticio de bienvenida',eventDate:'2026-11-26',category:'meal',timeConfirmed:false};
const activity2 = {_id:'a2',name:'Milonga ficticia',eventDate:'2026-11-27',category:'milonga',timeConfirmed:false};
const room = {_id:'h1',unitCode:'APT-TEST',hotelRoomNumber:'001',roomType:'apartment',capacity:5,isAvailable:true};
const event = {_id:'e1',title:'Baztango · QA ficticio',startDate:'2026-11-26',endDate:'2026-11-29',currentVersionRef:'v1'};
const records = {
  personas:[person],solicitudes:[{_id:'s1',applicantNames:'Solicitud sintética',requestCode:'TEST-S-001',declaredPeopleCount:2,state:'waiting'}],reservas:[{_id:'r1',reservationCode:'TEST-R-001'}],pagos:[{_id:'pay1',paymentCode:'TEST-PAGO',amountCents:10000,payerName:'Pagador ficticio',state:'valid'}],imputaciones:[],actividades:[activity],participaciones:[],habitaciones:[room],estancias:[],cajas:[{_id:'c1',businessDate:'2026-11-26',state:'open',expectedCashCents:10000,countedCashCents:null}],movimientos:[{_id:'m1',concept:'Cobro ficticio',amountCents:10000,cashSessionRef:'c1'}],gastos:[{_id:'g1',concept:'Gasto ficticio',totalCents:2000,paidCents:1000,pendingCents:1000}]
};
export async function installApi(page) {
  const queries = [];
  const repository = {
    events:async()=>[event],
    context:async()=>({event,version:{_id:'v1',capturedAt:'2026-11-17T00:00:00Z'}}),
    summary:async()=>({accepted:1,arrived:1,pendingCents:10000,issues:0,requests:1,housed:1}),
    overview:async()=>{
      return {
        totals:{people:3,accepted:2,cancelled:1,review:0,arrived:1,housed:1,team:0,guests:0},
        finance:{dueCents:30000,paidNetCents:20000,pendingCents:10000,refundPendingCents:0,overpaidCents:0,withDebt:1,withRefund:0,event:{dueCents:20000,paidNetCents:15000,pendingCents:5000},hotel:{dueCents:10000,paidNetCents:5000,pendingCents:5000},splitUnknown:0},
        byPaymentState:[{value:'partial',count:1},{value:'settled',count:1}],byRole:[{value:'leader',count:1},{value:'follower',count:1}],byPackage:[{value:'Completo',count:2}],byCountry:[{value:'ES',count:2}],
        arrivalsByDate:[{value:'2026-11-26',count:1}],debtors:[{_id:'p1',fullName:person.fullName,personCode:person.personCode,packageName:'Completo',pendingCents:10000,paymentState:'partial'}],
        program:[{...activity,startsAt:null,entitled:2,registered:1,missing:1,issues:0}],
        lodging:{nights:[{date:'2026-11-26',assigned:1,capacity:5},{date:'2026-11-27',assigned:1,capacity:5},{date:'2026-11-28',assigned:0,capacity:5}],rooms:[{...room,occupancy:[1,1,0]}],unknownDates:0,overCapacityRooms:0},
        attention:{issues:0,requests:1,waiting:1,withRefund:0,activitiesWithIssues:0,sessionsWithDifference:0}
      };
    },
    list:async(query)=>{
      queries.push(query);
      const items = records[query.resource].filter((row)=>Object.entries(query.filters).every(([field,value])=>row[field]===value) && (!query.search || normalize([row.fullName,row.name,row.concept,row.paymentCode].filter(Boolean).join(' ')).includes(query.search)));
      return {items:items.slice(query.page*query.limit,(query.page+1)*query.limit),total:items.length,page:query.page,limit:query.limit};
    },
    detail:async()=>({person,reservation:records.reservas[0],people:[person],payments:records.pagos,allocations:[],participations:[{_id:'pt1',personRef:'p1',activityRef:'a1',entitlement:'included',eligible:true,attendanceState:'registered'},{_id:'pt2',personRef:'p1',activityRef:'a2',entitlement:'extra',eligible:true,attendanceState:'notRegistered'}],activities:[activity,activity2],stays:[{_id:'st1',personRef:'p1',roomRef:'h1',checkInDate:'2026-11-26',checkOutDate:'2026-11-29',state:'reserved'}],rooms:[room]}),
    requestDetail:async()=>({request:{...records.solicitudes[0],email:'solicitud@example.invalid'}}),
    activityDetail:async(eventId,versionId,activityId,query)=>({activity,counts:{entitled:1,registered:0,missing:1,issues:0},items:query.group==='registered'?[]:[{person,entitlement:'included',attendanceState:'notRegistered'}],total:query.group==='registered'?0:1,page:query.page,limit:query.limit}),
    roomDetail:async(eventId,versionId,roomId,night)=>({room,night,assigned:1,free:4,unknownDates:0,overCapacity:false,items:[{person,checkInDate:'2026-11-26',checkOutDate:'2026-11-29',state:'reserved'}]})
  };
  const service = createService({repository,getPassword:async()=>fixturePassword});
  await page.route('**/config.js',(route)=>route.fulfill({contentType:'text/javascript',body:"export const config={apiUrl:'https://qa.example.invalid/_functions/baztango'};"}));
  await page.route('https://qa.example.invalid/_functions/baztango',async(route)=>{
    const request=route.request();
    const response=await service({method:request.method(),ip:'192.0.2.1',origin:'https://joteiza003.github.io',authorization:request.headers().authorization,body:request.postData()});
    await route.fulfill({status:response.status,headers:{...response.headers,'Access-Control-Allow-Origin':'http://127.0.0.1:4187'},body:response.body===null?'':JSON.stringify(response.body)});
  });
  return queries;
}
export async function login(page) {
  await page.goto('/');
  await page.getByLabel('Contraseña de acceso').fill(fixturePassword);
  await page.getByRole('button',{name:'Acceder',exact:true}).click();
  await page.getByRole('button',{name:/Aceptados activos/}).waitFor();
}
