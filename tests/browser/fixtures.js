import { createService, normalize } from '../../wix/service.js';

export const fixturePassword = 'solo-pruebas-ficticias-32-caracteres';
export const person = {_id:'p1',fullName:'Iñigo Apellido ficticio de prueba con un nombre extraordinariamente largo',personCode:'TEST-P-001',state:'accepted',packageName:'Completo',danceRole:'leader',arrivalState:'registered',dueCents:20000,paidNetCents:10000,pendingCents:10000,reservationRef:'r1',email:'ficticio@example.invalid',dietaryKnown:false};
const activity = {_id:'a1',name:'Cóctel ficticio de bienvenida',eventDate:'2026-11-26',category:'meal',timeConfirmed:false};
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
    list:async(query)=>{
      queries.push(query);
      const items = records[query.resource].filter((row)=>Object.entries(query.filters).every(([field,value])=>row[field]===value) && (!query.search || normalize([row.fullName,row.name,row.concept,row.paymentCode].filter(Boolean).join(' ')).includes(query.search)));
      return {items:items.slice(query.page*query.limit,(query.page+1)*query.limit),total:items.length,page:query.page,limit:query.limit};
    },
    detail:async()=>({person,reservation:records.reservas[0],people:[person],payments:records.pagos,allocations:[],participations:[],activities:[activity],stays:[],rooms:[room]}),
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
