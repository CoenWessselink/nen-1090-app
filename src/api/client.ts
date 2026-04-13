
import { useAuthStore } from '@/app/store/auth-store';
export async function apiRequest(path,init={}){
 const s=useAuthStore.getState();
 const headers=new Headers(init.headers||{});
 if(s.token) headers.set('Authorization',`Bearer ${s.token}`);
 const res=await fetch('/api/v1'+path,{...init,headers,credentials:'include'});
 if(res.status===401){useAuthStore.getState().clearSession();}
 return res.json();
}
export default {get:(p)=>apiRequest(p)};
