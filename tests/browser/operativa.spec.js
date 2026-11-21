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
