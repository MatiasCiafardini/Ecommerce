export const CLIENT_EVENTS = ['page_view','product_view','add_to_cart','cart_view','checkout_intent','auth_required','auth_completed','checkout_ready','delivery_completed','payment_selected','review_reached','order_attempt','purchase_error','activity'] as const;
export const STEPS = [
  ['page_view','Visita'],['product_view','Ve una prenda'],['add_to_cart','Agrega al carrito'],
  ['cart_view','Ve el carrito'],['checkout_intent','Inicia la compra'],['checkout_ready','Checkout preparado'],
  ['delivery_completed','Completa entrega'],['payment_selected','Elige pago'],['review_reached','Revisa el pedido'],
  ['order_attempt','Confirma el pedido'],['order_created','Pedido confirmado'],['payment_approved','Compra aprobada'],
] as const;
export type EventRow = { type: string; occurredAt: string; path?: string; productId?: number; quantity?: number; category?: string };
export type SessionRow = { id: string; startedAt: Date|string; lastSeenAt: Date|string; device: string; source: string; medium?: string; campaign?: string; events: EventRow[]; orders: { orderId: number; createdAt: string; paidAt?: string; amount: number|string; status: string }[] };
const at = (value: string|Date) => new Date(value).getTime();
export function sessionEvents(session: SessionRow): EventRow[] {
  return [...session.events, ...session.orders.flatMap(o => [
    {type:'order_created',occurredAt:o.createdAt},
    ...(o.paidAt ? [{type:'payment_approved',occurredAt:o.paidAt}] : []),
  ])].sort((a,b)=>at(a.occurredAt)-at(b.occurredAt));
}
export function describeSession(session: SessionRow, now = Date.now()) {
  const events = sessionEvents(session);
  const progress = events.filter(e=>STEPS.some(([key])=>key===e.type)||e.type==='auth_required'||e.type==='auth_completed');
  const meaningful=progress.filter(event=>event.type!=='page_view');
  const last = meaningful[meaningful.length-1]??progress[progress.length-1];
  const paid = session.orders.some(o=>o.paidAt);
  const pending = session.orders.some(o=>!o.paidAt && !['cancelled','canceled','expired','rejected'].includes(o.status));
  const active = now-at(session.lastSeenAt)<30*60_000;
  return { id:session.id,startedAt:session.startedAt,lastSeenAt:session.lastSeenAt,device:session.device,source:session.source,
    status:paid?'approved':pending?'pending_payment':active?'in_progress':'abandoned',
    lastStep:last?.type??'page_view', errors:events.filter(e=>e.type==='purchase_error').map(e=>e.category??'validation'),
    events, orders:session.orders.map(o=>({orderId:o.orderId,status:o.status,paidAt:o.paidAt,amount:Number(o.amount)})),
  };
}
export function buildMetrics(sessions: SessionRow[], now = Date.now()) {
  const details=sessions.map(s=>describeSession(s,now));
  const lists=sessions.map(sessionEvents);
  const first=(events:EventRow[],type:string)=>events.find(e=>e.type===type);
  const funnel=STEPS.map(([key,label],index)=>{
    const reached=lists.filter(es=>first(es,key)); const nextKey=STEPS[index+1]?.[0]; const times:number[]=[];
    let advanced=0;
    for(const es of reached){const begin=at(first(es,key)!.occurredAt);const end=nextKey?es.find(e=>e.type===nextKey&&at(e.occurredAt)>=begin):null;if(end){advanced++;times.push((at(end.occurredAt)-begin)/1000);}}
    times.sort((a,b)=>a-b);
    return {key,label,reached:reached.length,advanced,nextKey:nextKey??null,advanceRate:reached.length&&nextKey?Math.round(advanced/reached.length*1000)/10:null,
      abandoned:details.filter(s=>s.status==='abandoned'&&s.lastStep===key).length,
      medianSeconds:times.length?times[Math.floor(times.length/2)]:null};
  });
  const groups=(field:'device'|'source')=>[...new Set(sessions.map(s=>s[field]))].map(label=>{
    const selected=details.filter(s=>s[field]===label);return {label,sessions:selected.length,approved:selected.filter(s=>s.status==='approved').length,conversion:selected.length?Math.round(selected.filter(s=>s.status==='approved').length/selected.length*1000)/10:0};
  }).sort((a,b)=>b.sessions-a.sessions);
  const products=new Map<number,{productId:number;views:Set<string>;added:Set<string>}>();
  for(const session of sessions)for(const event of session.events){if(!event.productId||!['product_view','add_to_cart'].includes(event.type))continue;const row=products.get(event.productId)??{productId:event.productId,views:new Set<string>(),added:new Set<string>()};(event.type==='product_view'?row.views:row.added).add(session.id);products.set(event.productId,row);}
  const errorGroups=new Map<string,Set<string>>();
  for(const s of details)for(const category of s.errors){const group=errorGroups.get(category)??new Set<string>();group.add(s.id);errorGroups.set(category,group);}
  const count=(type:string)=>lists.filter(es=>es.some(e=>e.type===type)).length;
  return {summary:{sessions:sessions.length,withCart:lists.filter(es=>es.some(e=>['add_to_cart','cart_view'].includes(e.type))).length,
    checkoutStarted:count('checkout_intent'),ordersConfirmed:sessions.reduce((n,s)=>n+s.orders.length,0),approvedPurchases:sessions.reduce((n,s)=>n+s.orders.filter(o=>o.paidAt).length,0),
    approvedRevenue:sessions.reduce((n,s)=>n+s.orders.filter(o=>o.paidAt).reduce((sum,o)=>sum+Number(o.amount),0),0),
    active:details.filter(s=>s.status==='in_progress').length,abandoned:details.filter(s=>s.status==='abandoned').length,pendingPayment:details.filter(s=>s.status==='pending_payment').length},
    funnel,access:{required:count('auth_required'),completed:lists.filter(es=>{const start=first(es,'auth_required');return start&&es.some(e=>e.type==='auth_completed'&&at(e.occurredAt)>=at(start.occurredAt));}).length,
      abandoned:details.filter(s=>s.status==='abandoned'&&s.lastStep==='auth_required').length},
    devices:groups('device'),sources:groups('source'),errors:[...errorGroups].map(([category,ids])=>({category,sessions:ids.size})),
    products:[...products.values()].map(p=>({productId:p.productId,views:p.views.size,added:p.added.size})).sort((a,b)=>b.views-a.views).slice(0,20),
    directEntries:lists.filter(es=>es.some(e=>['cart_view','checkout_ready'].includes(e.type))&&!es.some(e=>e.type==='add_to_cart')).length};
}
