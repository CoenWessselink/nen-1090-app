
import { useState } from 'react';
import { login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
export default function LoginPage(){
 const setSession=useAuthStore(s=>s.setSession);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 async function submit(e){
  e.preventDefault();
  const r=await login({email,password,tenant:'demo'});
  setSession(r.access_token,r.user,r.refresh_token);
  window.location.replace('/projecten');
 }
 return <form onSubmit={submit}>
  <input value={email} onChange={e=>setEmail(e.target.value)}/>
  <input value={password} onChange={e=>setPassword(e.target.value)}/>
  <button>Login</button>
 </form>;
}
