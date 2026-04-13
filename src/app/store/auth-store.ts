
import { create } from 'zustand';
export const useAuthStore = create((set)=>({
 token:null,refreshToken:null,user:null,
 setSession:(t,u,r)=>{
  localStorage.setItem('nen1090.session',JSON.stringify({token:t,refreshToken:r,user:u}));
  sessionStorage.setItem('nen1090.session',JSON.stringify({token:t,refreshToken:r,user:u}));
  document.cookie=`nen1090_access_token=${t}; path=/`;
  document.cookie=`nen1090_refresh_token=${r}; path=/`;
  set({token:t,user:u,refreshToken:r});
 },
 clearSession:()=>{
  localStorage.clear();sessionStorage.clear();
  document.cookie='nen1090_access_token=;max-age=0;path=/';
  document.cookie='nen1090_refresh_token=;max-age=0;path=/';
  set({token:null,user:null,refreshToken:null});
 }
}));
