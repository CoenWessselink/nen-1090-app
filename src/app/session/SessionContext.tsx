
import { createContext,useContext,useEffect,useState } from 'react';
import { useAuthStore } from '@/app/store/auth-store';
const C=createContext(null);
export function SessionProvider({children}){
 const s=useAuthStore();
 const [boot,setBoot]=useState(true);
 useEffect(()=>{
  const raw=localStorage.getItem('nen1090.session');
  if(raw){const p=JSON.parse(raw);useAuthStore.setState(p);}
  setBoot(false);
 },[]);
 return <C.Provider value={{...s,isAuthenticated:!!s.token,isBootstrapping:boot}}>{children}</C.Provider>;
}
export const useSession=()=>useContext(C);
