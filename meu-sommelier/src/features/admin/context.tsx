import { createContext, use, useCallback, useState, type PropsWithChildren } from 'react';
import { ApiError, apiRequest } from '@/lib/api-client';
import type { AdminSession } from './types';
function useAdminState() {
  const [session,setSession]=useState<AdminSession|null>(null);
  const [expired,setExpired]=useState(false);
  const csrfToken=session?.csrfToken;
  const request=useCallback(async <T,>(path:string, options:RequestInit={}):Promise<T> => {
    const headers=new Headers(options.headers);
    if(csrfToken)headers.set('X-CSRF-Token',csrfToken);
    try{return await apiRequest<T>(path,{...options,headers,credentials:'include'});}
    catch(error){if(error instanceof ApiError&&error.status===401){setSession(null);setExpired(true);}throw error;}
  },[csrfToken]);
  const refresh=useCallback(async ()=>{const result=await apiRequest<AdminSession>('admin/me',{credentials:'include'});setSession(result);setExpired(false);return result;},[]);
  const login=async(email:string,password:string)=>{await apiRequest('auth/login',{method:'POST',credentials:'include',body:JSON.stringify({email,password})});await refresh();};
  const logout=async()=>{await request('auth/logout',{method:'POST',body:'{}'});setSession(null);setExpired(false);};
  return {session,expired,request,refresh,login,logout};
}
const AdminContext=createContext<ReturnType<typeof useAdminState>|null>(null);
export function AdminProvider({children}:PropsWithChildren){const state=useAdminState();return <AdminContext value={state}>{children}</AdminContext>;}
export function useAdmin(){const state=use(AdminContext);if(!state)throw new Error('Administração indisponível.');return state;}
