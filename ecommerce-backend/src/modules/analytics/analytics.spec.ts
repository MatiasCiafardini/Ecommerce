import { buildMetrics, describeSession, SessionRow } from './analytics.metrics';
import { analyticsDateRange, AnalyticsService, checkoutAttribution } from './analytics.service';
import { AnalyticsAdminGuard } from './analytics.controller';
const now=new Date('2026-10-09T16:00:00Z').getTime();
const event=(type:string,minutes=0)=>({type,occurredAt:new Date(now-3600000+minutes*60000).toISOString()});
const session=(events:any[],overrides:any={}):SessionRow=>({id:Math.random().toString(),startedAt:new Date(now-3600000),lastSeenAt:new Date(now-3600000),device:'mobile',source:'direct',events,orders:[],...overrides});
describe('conversion metrics',()=>{
 it('counts sessions rather than repeated product/cart events',()=>{const result=buildMetrics([session([event('page_view'),event('product_view'),event('product_view'),event('add_to_cart',1),event('add_to_cart',2)])],now);expect(result.summary.sessions).toBe(1);expect(result.funnel.find(s=>s.key==='product_view')?.reached).toBe(1);expect(result.funnel.find(s=>s.key==='product_view')?.advanceRate).toBe(100);});
 it('requires the next event to occur after its predecessor',()=>{const result=buildMetrics([session([event('add_to_cart'),event('product_view',2)])],now);expect(result.funnel.find(s=>s.key==='product_view')?.advanced).toBe(0);});
 it('does not fabricate product or add events for restored carts',()=>{const result=buildMetrics([session([event('page_view'),event('cart_view')])],now);expect(result.directEntries).toBe(1);expect(result.funnel.find(s=>s.key==='add_to_cart')?.reached).toBe(0);});
 it('separates in-progress, abandoned, pending and late approved orders',()=>{expect(describeSession(session([event('checkout_ready')],{lastSeenAt:new Date(now)}),now).status).toBe('in_progress');expect(describeSession(session([event('checkout_ready')]),now).status).toBe('abandoned');const order={orderId:1,createdAt:new Date(now-3500000).toISOString(),amount:'120000',status:'pending'};expect(describeSession(session([],{orders:[order]}),now).status).toBe('pending_payment');const result=buildMetrics([session([],{orders:[{...order,paidAt:new Date(now).toISOString()}]})],now);expect(result.summary.approvedPurchases).toBe(1);expect(result.summary.approvedRevenue).toBe(120000);});
 it('does not mark cancelled orders as pending payment',()=>{expect(describeSession(session([],{orders:[{orderId:1,createdAt:new Date(now-3500000).toISOString(),amount:10,status:'cancelled'}]}),now).status).toBe('abandoned');});
 it('does not penalize authenticated customers for skipping login',()=>{const result=buildMetrics([session([event('checkout_ready')]),session([event('auth_required'),event('auth_completed',1),event('checkout_ready',2)]),session([event('auth_required')])],now);expect(result.access).toEqual({required:2,completed:1,abandoned:1});});
 it('keeps the login abandonment step after the login page view',()=>{expect(describeSession(session([event('auth_required'),event('page_view',1)]),now).lastStep).toBe('auth_required');});
 it('counts an error once per affected session and returns no raw messages',()=>{const result=buildMetrics([session([{...event('purchase_error'),category:'payment'},{...event('purchase_error'),category:'payment'}])],now);expect(result.errors).toEqual([{category:'payment',sessions:1}]);});
});
describe('analytics dates and authorization',()=>{
 it('uses local midnight rather than UTC midnight',()=>{const range=analyticsDateRange({period:'today'},'America/Argentina/Buenos_Aires',new Date('2026-10-09T01:00:00Z'));expect(range.from).toBe('2026-10-08');expect(range.start.toISOString()).toBe('2026-10-08T03:00:00.000Z');});
 it('rejects invalid dates and periods beyond 90 days',()=>{expect(()=>analyticsDateRange({from:'2026-02-30',to:'2026-03-01'},'UTC')).toThrow();expect(()=>analyticsDateRange({from:'2026-01-01',to:'2026-10-01'},'UTC')).toThrow();});
 it('rejects staff and cross-tenant owners',()=>{const guard=new AnalyticsAdminGuard();const ctx=(user:any)=>({switchToHttp:()=>({getRequest:()=>({storeId:7,user})})}) as any;expect(()=>guard.canActivate(ctx({role:'STAFF',storeId:7}))).toThrow();expect(()=>guard.canActivate(ctx({role:'OWNER',storeId:3}))).toThrow();expect(guard.canActivate(ctx({role:'OWNER',storeId:7}))).toBe(true);});
 it('ignores unavailable attribution without breaking checkout',async()=>{expect(await checkoutAttribution({store:{findUnique:()=>Promise.reject(Error())}} as any,7,'f77acb4f-86d1-4b6c-8945-6a0daed5f97d','f77acb4f-86d1-4b6c-8945-6a0daed5f97d')).toBeNull();});
});
describe('collector input',()=>{
 const prisma={store:{findUnique:async()=>({storefrontConfig:{analytics:{enabled:true}}})}};
 const service=new AnalyticsService(prisma as any);
 const body={sessionId:'f77acb4f-86d1-4b6c-8945-6a0daed5f97d',token:'f77acb4f-86d1-4b6c-8945-6a0daed5f97d',device:'mobile',events:[{id:'f77acb4f-86d1-4b6c-8945-6a0daed5f97d',type:'page_view',occurredAt:new Date().toISOString(),path:'/'}]};
 it('rejects personally identifying fields',async()=>{await expect(service.ingest(7,{...body,email:'private@example.com'})).rejects.toThrow();});
 it('rejects batches over 25 and client-forged purchases',async()=>{await expect(service.ingest(7,{...body,events:Array(26).fill(body.events[0])})).rejects.toThrow();await expect(service.ingest(7,{...body,events:[{...body.events[0],type:'payment_approved'}]})).rejects.toThrow();});
 it('rejects administration routes',async()=>{await expect(service.ingest(7,{...body,events:[{...body.events[0],path:'/account/orders/10'}]})).rejects.toThrow();});
});
