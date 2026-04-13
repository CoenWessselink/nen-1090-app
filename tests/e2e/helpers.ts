
export async function seedSession(page){
 await page.addInitScript(()=>{
  localStorage.setItem('nen1090.session',JSON.stringify({
   token:'test',refreshToken:'test',user:{email:'admin@demo.com',tenant:'demo',role:'ADMIN'}
  }));
 });
}
