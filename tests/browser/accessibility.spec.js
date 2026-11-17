import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {installApi,login} from './fixtures.js';

test('automated accessibility checks and 200 percent text reflow',async({page})=>{
  await page.goto('/');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await installApi(page); await login(page);
  for(const section of ['Resumen','Clientes','Pagos','Programa','Alojamiento','Caja']){
    await page.getByRole('button',{name:section,exact:true}).first().click();
    await expect(page.locator('.busy')).toHaveCount(0);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,section).toEqual([]);
  }
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await page.setViewportSize({width:640,height:900});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:320,height:568});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
