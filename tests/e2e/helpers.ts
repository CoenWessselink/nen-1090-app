
export async function seedSession(page){
 await page.addInitScript(()=>{
  localStorage.setItem('nen1090.session',JSON.stringify({
   token:'test',refreshToken:'test',user:{email:'admin@demo.com',tenant:'demo',role:'ADMIN'}
  }));
 });
}


export async function bootstrapAuthenticatedPage(page, target = '/dashboard') {
  await seedSession(page);
  await page.goto(target, { waitUntil: 'networkidle' });
}

export async function openFirstProject360(page) {
  await bootstrapAuthenticatedPage(page, '/projecten');
  const firstOpenButton = page.getByRole('button', { name: /open project 360/i }).first();
  const firstEditButton = page.getByRole('button', { name: /bewerken/i }).first();
  if (await firstOpenButton.count()) {
    await firstOpenButton.click();
    return;
  }
  await page.goto('/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/overzicht', { waitUntil: 'networkidle' });
  if (await firstEditButton.count()) {
    // no-op: keeps helper resilient on sparse fixtures
  }
}
