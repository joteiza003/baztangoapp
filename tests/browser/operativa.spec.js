import {test,expect} from '@playwright/test';
import {installApi,login,person,fixturePassword} from './fixtures.js';

test('global search opens a person record and quick chips filter lists',async({page})=>{
  const queries=await installApi(page); await login(page);
  await page.getByLabel('Buscar persona').fill('Iñigo');
  await page.getByRole('option',{name:/Iñigo/}).click();
  await expect(page.getByRole('heading',{name:person.fullName})).toBeVisible();
  await page.getByRole('button',{name:'← Volver a la consulta'}).click();
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.getByRole('button',{name:'Llegados'}).click();
  await expect(page.getByRole('button',{name:'Llegados'})).toHaveAttribute('aria-pressed','true');
  expect(queries.at(-1).filters).toEqual({state:'accepted',arrivalState:'registered'});
});
test('old backend without overview falls back to the simple summary',async({page})=>{
  await installApi(page);
  await page.route('https://qa.example.invalid/_functions/baztango',async(route)=>{
    if(route.request().postData()?.includes('"overview"')) return route.fulfill({status:400,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4187','Content-Type':'application/json'},body:JSON.stringify({error:'INVALID_QUERY'})});
    return route.fallback();
  });
  await login(page);
  await expect(page.getByText('Panel simplificado')).toBeVisible();
});
test('list export produces a CSV download',async({page})=>{
  await installApi(page); await login(page);
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Exportar CSV'}).click()]);
  expect(download.suggestedFilename()).toMatch(/^baztango-personas-.*\.csv$/);
});

test('person record shows only what applies and keeps attendance on its own tab',async({page})=>{
  await installApi(page); await login(page);
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.getByRole('button',{name:/Ver ficha de/}).click();
  await expect(page.getByRole('button',{name:'Programa · 2'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Asistencias · 1/2'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Alojamiento · 1'})).toBeVisible();
  await expect(page.getByText('Cóctel ficticio de bienvenida')).toHaveCount(0);
  await page.getByRole('button',{name:'Programa · 2'}).click();
  await expect(page.getByText('Milonga ficticia')).toBeVisible();
  await expect(page.getByText('Registrada',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Asistencias · 1/2'}).click();
  await expect(page.getByRole('cell',{name:/Cóctel ficticio/})).toBeVisible();
  await expect(page.getByText('Registrada',{exact:true})).toBeVisible();
});

test('side menu can be hidden and tables use the full height with sortable columns',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await installApi(page); await login(page);
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  const sidebar=page.locator('.sidebar');
  await expect.poll(async()=>(await sidebar.boundingBox())?.width).toBeGreaterThan(200);
  await page.getByRole('button',{name:/menú lateral/}).click();
  await expect.poll(async()=>(await sidebar.boundingBox())?.width).toBeLessThan(100);
  const box=await page.locator('.scroll').boundingBox();
  expect(box.y+box.height).toBeGreaterThan(900-90);
  await page.getByRole('button',{name:'Persona',exact:true}).click();
  await expect(page.locator('th[aria-sort="ascending"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Programa',exact:true}).first().click();
  await page.getByRole('button',{name:'Ocultar actividades'}).click();
  await expect(page.getByRole('combobox',{name:'Actividad'})).toBeVisible();
  await expect(page.locator('.prog-list')).toHaveCount(0);
});

test('collected and pending amounts are split between Baztango and Hotel',async({page})=>{
  await installApi(page); await login(page);
  await expect(page.getByText('Cobros: Baztango y Hotel')).toBeVisible();
  await page.getByRole('button',{name:'Pagos',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Pendiente Baztango'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Pendiente Hotel'})).toBeVisible();
  await expect(page.getByRole('cell',{name:/50,00/}).first()).toBeVisible();
  await page.getByRole('button',{name:/Ver ficha de/}).click();
  await page.getByRole('button',{name:'Pagos',exact:true}).last().click();
  await expect(page.getByText('Baztango',{exact:true})).toBeVisible();
  await expect(page.getByText('Hotel',{exact:true})).toBeVisible();
});

test('person program and attendance are grouped by day in chronological order',async({page})=>{
  await installApi(page); await login(page);
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.getByRole('button',{name:/Ver ficha de/}).click();
  await page.getByRole('button',{name:'Asistencias · 1/2'}).click();
  const days=await page.locator('.day-row').allInnerTexts();
  expect(days.length).toBe(2);
  expect(days[0]).toMatch(/26/); expect(days[1]).toMatch(/27/);
  await page.getByRole('button',{name:'Programa · 2'}).click();
  const heads=await page.locator('.day-group h3').allInnerTexts();
  expect(heads[0]).toMatch(/26/); expect(heads[1]).toMatch(/27/);
});
