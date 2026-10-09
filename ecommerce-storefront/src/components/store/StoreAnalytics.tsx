"use client";
import { useEffect,useRef,useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { getClientStoreContext } from '@/lib/tenant/store-context';
import { configureAnalytics,trackAnalytics } from '@/lib/store-analytics';
type Config={enabled:boolean;clarityProjectId:string};
declare global {interface Window {clarity?: ((...args:unknown[])=>void)&{q?:unknown[][]};}}
export default function StoreAnalytics(){
 const pathname=usePathname();const {user,loading}=useAuth();const [config,setConfig]=useState<Config|null>(null);const [consent,setConsent]=useState<string|null>(null);
 const tracked=useRef<string|null>(null);const clarityLoaded=useRef(false);
 const admin=['OWNER','ADMIN','SUPER_ADMIN','STAFF'].includes(user?.role??'');
 const excluded=admin||/^\/(account|manual-sales|admin)(\/|$)/.test(pathname);
 const consentKey=()=>`clarity-consent:${getClientStoreContext().storeId}`;
 useEffect(()=>{let alive=true;try{setConsent(localStorage.getItem(consentKey()));}catch{}
  api('/store/analytics/config',{timeoutMs:5000}).then((value:Config)=>{if(alive)setConfig(value);}).catch(()=>{if(alive)setConfig({enabled:false,clarityProjectId:''});});return()=>{alive=false;};
 },[]);
 useEffect(()=>{if(loading||!config)return;configureAnalytics(config.enabled,!excluded);if(!excluded&&config.enabled&&tracked.current!==pathname){tracked.current=pathname;trackAnalytics('page_view');}
  if(excluded&&clarityLoaded.current){window.clarity?.('consentv2',{analytics_Storage:'denied',ad_Storage:'denied'});location.reload();}
 },[loading,config,excluded,pathname]);
 useEffect(()=>{
  if(loading||excluded||!config?.enabled||!config.clarityProjectId||consent!=='accepted'||clarityLoaded.current)return;
  clarityLoaded.current=true;
  if(!window.clarity){const clarity=((...args:unknown[])=>{clarity.q??=[];clarity.q.push(args);}) as NonNullable<Window['clarity']>;window.clarity=clarity;
   const script=document.createElement('script');script.async=true;script.src=`https://www.clarity.ms/tag/${config.clarityProjectId}`;document.head.appendChild(script);
  }
  window.clarity('consentv2',{analytics_Storage:'granted',ad_Storage:'denied'});
  const event=(event:Event)=>{const {type,sessionId}=(event as CustomEvent).detail;window.clarity?.('set','store_session',sessionId);window.clarity?.('set','purchase_step',type);window.clarity?.('event',type);};
  window.addEventListener('store-analytics-event',event);
  // A full navigation avoids carrying a recording script into private account pages.
  const navigate=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest('a');if(!anchor)return;try{const url=new URL(anchor.href);if(url.origin===location.origin&&/^\/(account|manual-sales|admin)(\/|$)/.test(url.pathname)){event.preventDefault();location.assign(url.href);}}catch{}};
  document.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('store-analytics-event',event);document.removeEventListener('click',navigate,true);};
 },[loading,excluded,config,consent]);
 function choose(value:string){try{localStorage.setItem(consentKey(),value);}catch{}setConsent(value);if(value==='rejected'&&clarityLoaded.current){window.clarity?.('consentv2',{analytics_Storage:'denied',ad_Storage:'denied'});location.reload();}}
 if(loading||excluded||!config?.enabled||!config.clarityProjectId)return null;
 return consent===null?<aside aria-label="Preferencias de grabación" data-clarity-mask="true" style={{position:'fixed',bottom:12,left:12,right:12,zIndex:2147483001,padding:16,borderRadius:16,background:'#fff',boxShadow:'0 4px 32px #0002',maxWidth:520,color:'#252525',fontSize:13}}>
  <p style={{margin:'0 0 12px'}}>Usamos métricas sin nombres para mejorar la tienda. ¿Aceptás grabaciones de interacción con Clarity? Ocultamos los datos de formularios y pagos.</p>
  <button onClick={()=>choose('accepted')} style={{padding:12,marginRight:8}}>Aceptar grabaciones</button><button onClick={()=>choose('rejected')} style={{padding:12}}>Rechazar</button>
 </aside>:<button type="button" onClick={()=>choose(consent==='accepted'?'rejected':'accepted')} data-clarity-mask="true" style={{position:'fixed',bottom:8,left:8,zIndex:100,padding:'6px 9px',borderRadius:8,background:'#fff',border:'1px solid #ddd',color:'#555',fontSize:10}}>{consent==='accepted'?'Desactivar grabaciones':'Activar grabaciones'}</button>;
}
