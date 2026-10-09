import { getClientStoreContext } from '@/lib/tenant/store-context';
export type AnalyticsEventType = 'page_view'|'product_view'|'add_to_cart'|'cart_view'|'checkout_intent'|'auth_required'|'auth_completed'|'checkout_ready'|'delivery_completed'|'payment_selected'|'review_reached'|'order_attempt'|'purchase_error'|'activity';
export type AnalyticsFields={productId?:number;quantity?:number;amount?:number;category?:'stock'|'access'|'delivery'|'validation'|'order'|'payment'};
type Session={id:string;token:string;at:number;device:string;source:string;medium:string;campaign:string;referrer:string};
type Entry={session:Session;event:{id:string;type:AnalyticsEventType;occurredAt:string;path:string}&AnalyticsFields};
let enabled=false, initialized=false, allowed=false, queue:Entry[]=[], pending:{type:AnalyticsEventType;fields:AnalyticsFields}[]=[], session:Session|null=null;
let sending:Promise<void>|null=null, lastInteraction=0, attached=false, loadedStore:number|null=null;
const safe=(value:string|null)=> (value??'').toLowerCase().replace(/[^a-z0-9_. -]/g,'').slice(0,80);
const key=(suffix:string)=>`analytics:${getClientStoreContext().storeId}:${suffix}`;
const read=(suffix:string)=>{try{return sessionStorage.getItem(key(suffix));}catch{return null;}};
const save=(suffix:string,value:unknown)=>{try{sessionStorage.setItem(key(suffix),JSON.stringify(value));}catch{/* Storage can be unavailable in private browsing. */}};
function ensureSession():Session {
 const context=getClientStoreContext();
 if(loadedStore!==context.storeId){session=null;queue=[];loadedStore=context.storeId;try{session=JSON.parse(read('session')??'null');queue=JSON.parse(read('queue')??'[]').slice(-100);}catch{session=null;queue=[];}}
 if(!session||Date.now()-session.at>=1800000){
  const params=new URLSearchParams(location.search);let referrer='';try{const url=new URL(document.referrer);if(url.hostname!==location.hostname)referrer=url.hostname;}catch{}
  const mobile=matchMedia('(pointer: coarse)').matches;
  session={id:crypto.randomUUID(),token:crypto.randomUUID(),at:Date.now(),device:mobile?(innerWidth>=768?'tablet':'mobile'):'desktop',source:safe(params.get('utm_source'))||referrer||'direct',medium:safe(params.get('utm_medium')),campaign:safe(params.get('utm_campaign')),referrer};
 }
 return session;
}
export function configureAnalytics(active:boolean,canTrack:boolean){
 try{enabled=active;allowed=canTrack;initialized=true;if(!enabled||!allowed){pending=[];queue=[];save('queue',[]);return;}
  ensureSession();const early=pending;pending=[];for(const item of early)trackAnalytics(item.type,item.fields);
  if(!attached){attached=true;const interact=()=>{lastInteraction=Date.now();};for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,interact,{passive:true});
   setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-lastInteraction<60000)trackAnalytics('activity');void flushAnalytics();},60000);
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flushAnalytics();});window.addEventListener('pagehide',()=>void flushAnalytics());
  }
 }catch{enabled=false;}
}
export function trackAnalytics(type:AnalyticsEventType,fields:AnalyticsFields={}) {
 try{
  if(!initialized){if(pending.length<50)pending.push({type,fields});return;}
  if(!enabled||!allowed||/^\/(account|admin|manual-sales)(\/|$)/.test(location.pathname))return;
  const current=ensureSession();current.at=Date.now();save('session',current);
  const path=location.pathname.replace(/[^a-zA-Z0-9/_-]/g,'').slice(0,200)||'/';
  queue.push({session:{...current},event:{id:crypto.randomUUID(),type,occurredAt:new Date().toISOString(),path,...fields}});queue=queue.slice(-100);save('queue',queue);
  if(type!=='activity')lastInteraction=Date.now();
  window.dispatchEvent(new CustomEvent('store-analytics-event',{detail:{type,sessionId:current.id}}));
  if(queue.length>=25)void flushAnalytics();else setTimeout(()=>void flushAnalytics(),1500);
 }catch{/* Analytics never interrupts a storefront action. */}
}
export function analyticsContext(){try{if(!enabled||!allowed)return {};const current=ensureSession();return {analyticsSessionId:current.id,analyticsToken:current.token};}catch{return {};}}
export async function flushAnalytics(timeoutMs=5000):Promise<void> {
 if(sending)return Promise.race([sending,new Promise<void>(resolve=>setTimeout(resolve,timeoutMs))]);
 if(!enabled||!allowed||!queue.length)return;
 sending=(async()=>{
  let rounds=0;
  while(queue.length&&rounds++<4){
   const first=queue[0];const batch=queue.filter(entry=>entry.session.id===first.session.id).slice(0,25);
   const context=getClientStoreContext();const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
   try{
    const {id,token,device,source,medium,campaign,referrer}=first.session;
    const response=await fetch('/api/proxy/store/analytics/events',{method:'POST',headers:{'Content-Type':'application/json','x-store-id':String(context.storeId),'x-store-host':context.host},body:JSON.stringify({sessionId:id,token,device,source,medium,campaign,referrer,events:batch.map(entry=>entry.event)}),keepalive:true,signal:controller.signal});
    if(!response.ok && (response.status>=500||response.status===429))break;
    const ids=new Set(batch.map(entry=>entry.event.id));queue=queue.filter(entry=>!ids.has(entry.event.id));save('queue',queue);
   }catch{break;}finally{clearTimeout(timeout);}
  }
 })().catch(()=>{}).finally(()=>{sending=null;});
 return Promise.race([sending,new Promise<void>(resolve=>setTimeout(resolve,timeoutMs))]);
}
export function trackPurchaseError(category:AnalyticsFields['category']){trackAnalytics('purchase_error',{category});}
