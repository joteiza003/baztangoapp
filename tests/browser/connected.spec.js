import {test,expect} from '@playwright/test';
import {installApi,login,person,fixturePassword} from './fixtures.js';

test('rejects incorrect password, reads filters and detail, and clears session on logout',async({page})=>{
  const queries=await installApi(page);
  await page.goto('/');
  await page.getByLabel('Contraseña de acceso').fill('incorrecta');
  await page.getByRole('button',{name:'Acceder',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Acceso denegado');
  await page.getByLabel('Contraseña de acceso').fill(fixturePassword);
  await page.getByRole('button',{name:'Acceder',exact:true}).click();
  await expect(page.getByRole('button',{name:/Aceptados activos/})).toContainText('1');
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.getByLabel('Buscar en personas').fill('Iñigo');
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await expect(page.getByRole('button',{name:/Ver ficha de/})).toBeVisible();
  expect(queries.at(-1).search).toBe('inigo');
  await page.getByRole('button',{name:/Ver ficha de/}).click();
  await expect(page.getByRole('heading',{name:person.fullName})).toBeVisible();
  await page.getByText('Contacto y notas operativas',{exact:true}).click();
  await expect(page.getByText('ficticio@example.invalid',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'← Volver a la consulta'}).click();
  await expect(page.getByLabel('Buscar en personas')).toHaveValue('Iñigo');
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await expect(page.getByLabel('Contraseña de acceso')).toBeVisible();
  await expect(page.getByText(person.fullName,{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
});

test('all sections, activity groups, room nights and expense links work with fictitious API',async({page})=>{
  const errors=[]; page.on('pageerror',(error)=>errors.push(error.message));
  await installApi(page); await login(page);
  await page.screenshot({path:'test-results/resumen-ficticio.png',fullPage:true});
  await page.getByRole('button',{name:'Programa',exact:true}).first().click();
  await page.getByRole('button',{name:/Consultar Cóctel/}).click();
  await expect(page.getByRole('button',{name:/Con derecho · 1/})).toBeVisible();
  await page.getByRole('button',{name:/Asistencia registrada · 0/}).click();
  await expect(page.getByText('0 personas en este grupo')).toBeVisible();
  await page.getByRole('button',{name:'← Volver',exact:true}).click();
  await page.getByRole('button',{name:'Alojamiento',exact:true}).first().click();
  await page.getByRole('button',{name:'Consultar APT-TEST'}).click();
  await page.getByLabel('Noche de alojamiento').fill('2026-11-27');
  await page.getByRole('button',{name:'Consultar noche'}).click();
  await expect(page.getByText(/1 personas asignadas · 4 plazas libres/)).toBeVisible();
  await page.getByRole('button',{name:'Caja',exact:true}).first().click();
  await page.getByRole('button',{name:'Gastos',exact:true}).click();
  await page.getByRole('button',{name:'Consultar Gasto ficticio'}).click();
  await page.getByRole('button',{name:'Ver pagos de este gasto'}).click();
  await expect(page.getByRole('heading',{name:'Movimientos de caja',exact:true})).toBeVisible();
  for(const route of ['Clientes','Pagos','Programa','Alojamiento','Caja']){
    await page.getByRole('button',{name:route,exact:true}).first().click();
    for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390],[1280,720],[1920,1080],[3440,1440]]){
      await page.setViewportSize({width,height});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} ${width}`).toBe(true);
    }
    await page.setViewportSize({width:1440,height:900});
  }
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.setViewportSize({width:320,height:568});
  await page.screenshot({path:'test-results/clientes-ficticios-movil.png',fullPage:true});
  await page.getByRole('button',{name:'Más apartados'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Más apartados'})).toBeFocused();
  expect(errors).toEqual([]);
});

test('offline and absolute expiry remove private data',async({page,context})=>{
  await installApi(page); await login(page);
  await context.setOffline(true);
  await expect(page.getByRole('alert')).toContainText('Sin conexión');
  await expect(page.getByLabel('Contraseña de acceso')).toBeVisible();
  await context.setOffline(false);
  await page.clock.install();
  await login(page);
  await page.clock.fastForward(901000);
  await expect(page.getByRole('alert')).toContainText('caducado');
  await expect(page.getByLabel('Contraseña de acceso')).toBeVisible();
});
