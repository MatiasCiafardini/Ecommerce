import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CLIENT_EVENTS, buildMetrics, describeSession, SessionRow } from './analytics.metrics';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const analyticsHash=(token:string)=>createHash('sha256').update(token).digest('hex');
const safeLabel=(value:unknown,max=80)=>typeof value==='string'?value.toLowerCase().replace(/[^a-z0-9_. -]/g,'').trim().slice(0,max):'';
const defaultZone='America/Argentina/Buenos_Aires';
export async function checkoutAttribution(prisma:PrismaService,storeId:number,sessionId?:string,token?:string) {
  if(!sessionId||!token||!uuid.test(sessionId)||!uuid.test(token))return null;
  try {
    const store=await prisma.store.findUnique({where:{id:storeId},select:{storefrontConfig:true}});
    if(!(store?.storefrontConfig as any)?.analytics?.enabled)return null;
    const rows=await prisma.$queryRaw<{id:string}[]>(Prisma.sql`SELECT "id" FROM "AnalyticsSession" WHERE "storeId"=${storeId} AND "id"=${sessionId}::uuid AND "tokenHash"=${analyticsHash(token)} LIMIT 1`);
    return rows.length?{analyticsSessionId:sessionId,analyticsTokenHash:analyticsHash(token)}:null;
  }catch{return null;}
}
export function analyticsDateRange(query:Record<string,string|undefined>,timezone:string,now=new Date()) {
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
  const parts=fmt.formatToParts(now);const part=(type:string)=>parts.find(p=>p.type===type)?.value;
  const today=`${part('year')}-${part('month')}-${part('day')}`;
  const shift=(date:string,days:number)=>new Date(new Date(`${date}T12:00:00Z`).getTime()+days*86400000).toISOString().slice(0,10);
  const end=query.to??today, start=query.from??shift(end,query.period==='today'?0:query.period==='7'? -6:-29);
  for(const date of [start,end])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new BadRequestException('Fecha inválida');
  const days=(Date.parse(end)-Date.parse(start))/86400000;if(days<0||days>89)throw new BadRequestException('El período debe ser de hasta 90 días');
  const midnight=(date:string)=>{
    const target=Date.parse(`${date}T00:00:00Z`);let value=target;
    const zoned=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    for(let i=0;i<3;i++){const p=zoned.formatToParts(new Date(value));const get=(key:string)=>p.find(x=>x.type===key)!.value;const shown=Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);value+=target-shown;}
    return new Date(value);
  };
  return {from:start,to:end,start:midnight(start),end:midnight(shift(end,1)),timezone};
}
@Injectable()
export class AnalyticsService {
  private readonly logger=new Logger(AnalyticsService.name);
  constructor(private readonly prisma:PrismaService){}
  async config(storeId:number) {
    const store=await this.prisma.store.findUnique({where:{id:storeId},select:{storefrontConfig:true}});
    const config=(store?.storefrontConfig as any)?.analytics??{};
    let timezone=config.timezone??defaultZone;try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{timezone=defaultZone;}
    return {enabled:config.enabled===true,clarityProjectId:config.clarityProjectId??'',timezone,startedAt:config.startedAt??null};
  }
  async updateConfig(storeId:number,body:any) {
    if(!body||typeof body.enabled!=='boolean'||typeof body.clarityProjectId!=='string'||!/^([a-z0-9]{5,30})?$/.test(body.clarityProjectId)||Object.keys(body).some(k=>!['enabled','clarityProjectId','timezone'].includes(k)))throw new BadRequestException('Configuración inválida');
    const timezone=body.timezone??defaultZone;try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{throw new BadRequestException('Zona horaria inválida');}
    await this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Store" WHERE id=${storeId} FOR UPDATE`;
      const store=await tx.store.findUniqueOrThrow({where:{id:storeId},select:{storefrontConfig:true}});
      const previous=(store.storefrontConfig as any)??{};
      await tx.store.update({where:{id:storeId},data:{storefrontConfig:{...previous,analytics:{...previous.analytics,enabled:body.enabled,clarityProjectId:body.clarityProjectId,timezone,startedAt:previous.analytics?.startedAt??(body.enabled?new Date().toISOString():null)}}}});
    });
    return this.config(storeId);
  }
  async ingest(storeId:number,body:any) {
    const config=await this.config(storeId);if(!config.enabled)return {accepted:0,enabled:false};
    const allowed=['sessionId','token','device','source','medium','campaign','referrer','events'];
    if(!body||Object.keys(body).some(k=>!allowed.includes(k))||!uuid.test(body.sessionId??'')||!uuid.test(body.token??'')||!['mobile','desktop','tablet'].includes(body.device)||!Array.isArray(body.events)||body.events.length<1||body.events.length>25)throw new BadRequestException('Lote de eventos inválido');
    const now=Date.now();const types=new Set<string>(CLIENT_EVENTS);
    const events=body.events.map((event:any)=>{
      if(!event||Object.keys(event).some(k=>!['id','type','occurredAt','path','productId','quantity','amount','category'].includes(k))||!uuid.test(event.id??'')||!types.has(event.type))throw new BadRequestException('Evento inválido');
      const occurredAt=new Date(event.occurredAt);if(!Number.isFinite(+occurredAt)||+occurredAt>now+300000||+occurredAt<now-86400000)throw new BadRequestException('Fecha de evento inválida');
      const path=typeof event.path==='string'?event.path.split(/[?#]/)[0]: '/';
      if(!/^\/[a-zA-Z0-9/_-]*$/.test(path)||path.length>200||/^\/(account|manual-sales|admin)(\/|$)/.test(path))throw new BadRequestException('Ruta inválida');
      if(event.productId!==undefined&&(!Number.isInteger(event.productId)||event.productId<1))throw new BadRequestException('Producto inválido');
      if(event.quantity!==undefined&&(!Number.isInteger(event.quantity)||event.quantity<1||event.quantity>10000))throw new BadRequestException('Cantidad inválida');
      if(event.amount!==undefined&&(!Number.isFinite(event.amount)||event.amount<0||event.amount>1e9))throw new BadRequestException('Importe inválido');
      if(event.category!==undefined&&!['stock','access','delivery','validation','order','payment'].includes(event.category))throw new BadRequestException('Categoría inválida');
      return {...event,path,occurredAt};
    });
    const source=safeLabel(body.source)||'direct';const medium=safeLabel(body.medium)||null, campaign=safeLabel(body.campaign)||null;
    const referrer=typeof body.referrer==='string'&&/^[a-z0-9.-]{1,120}$/.test(body.referrer)?body.referrer:null;
    const startedAt=new Date(Math.min(...events.map((e:any)=>+e.occurredAt),now));const lastSeenAt=new Date(Math.min(Math.max(...events.map((e:any)=>+e.occurredAt)),now));
    return this.prisma.$transaction(async tx=>{
      await tx.$executeRaw(Prisma.sql`INSERT INTO "AnalyticsSession" ("storeId","id","tokenHash","startedAt","lastSeenAt","device","source","medium","campaign","referrer") VALUES (${storeId},${body.sessionId}::uuid,${analyticsHash(body.token)},${startedAt},${lastSeenAt},${body.device},${source},${medium},${campaign},${referrer}) ON CONFLICT DO NOTHING`);
      const session=await tx.$queryRaw<{tokenHash:string}[]>(Prisma.sql`SELECT "tokenHash" FROM "AnalyticsSession" WHERE "storeId"=${storeId} AND "id"=${body.sessionId}::uuid FOR UPDATE`);
      if(session[0]?.tokenHash!==analyticsHash(body.token))throw new BadRequestException('Sesión inválida');
      // Reject products from a different tenant instead of polluting cross-store comparisons.
      const ids=[...new Set<number>(events.map((e:any)=>e.productId).filter(Boolean))];
      if(ids.length){const products=await tx.product.count({where:{storeId,id:{in:ids}}});if(products!==ids.length)throw new BadRequestException('Producto ajeno a la tienda');}
      let accepted=0;
      for(const event of events)accepted+=await tx.$executeRaw(Prisma.sql`INSERT INTO "AnalyticsEvent" ("storeId","id","sessionId","type","occurredAt","path","productId","quantity","amount","category") VALUES (${storeId},${event.id}::uuid,${body.sessionId}::uuid,${event.type},${event.occurredAt},${event.path},${event.productId??null},${event.quantity??null},${event.amount??null},${event.category??null}) ON CONFLICT DO NOTHING`);
      if(accepted)await tx.$executeRaw(Prisma.sql`UPDATE "AnalyticsSession" SET "lastSeenAt"=GREATEST("lastSeenAt",${lastSeenAt}),"startedAt"=LEAST("startedAt",${startedAt}) WHERE "storeId"=${storeId} AND "id"=${body.sessionId}::uuid`);
      return {accepted,enabled:true};
    });
  }
  private async cohort(storeId:number,query:Record<string,string|undefined>) {
    const config=await this.config(storeId);const range=analyticsDateRange(query,config.timezone);
    if(query.device&&!['mobile','tablet','desktop'].includes(query.device))throw new BadRequestException('Dispositivo inválido');
    const sessions=await this.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
      SELECT s."id",s."startedAt",s."lastSeenAt",s."device",s."source",s."medium",s."campaign",
       COALESCE((SELECT json_agg(json_build_object('type',e."type",'occurredAt',e."occurredAt",'path',e."path",'productId',e."productId",'quantity',e."quantity",'category',e."category") ORDER BY e."occurredAt") FROM "AnalyticsEvent" e WHERE e."storeId"=s."storeId" AND e."sessionId"=s."id" AND e."type"<>'activity'),'[]'::json) AS events,
       COALESCE((SELECT json_agg(json_build_object('orderId',a."orderId",'createdAt',a."createdAt",'paidAt',a."paidAt",'amount',a."amount",'status',o."status")) FROM "AnalyticsOrder" a JOIN "Order" o ON o.id=a."orderId" AND o."storeId"=a."storeId" WHERE a."storeId"=s."storeId" AND a."sessionId"=s."id"),'[]'::json) AS orders
      FROM "AnalyticsSession" s WHERE s."storeId"=${storeId} AND s."startedAt">=${range.start} AND s."startedAt"<${range.end}
      ${query.device?Prisma.sql`AND s."device"=${query.device}`:Prisma.empty}
      ${query.source?Prisma.sql`AND s."source"=${query.source}`:Prisma.empty}
      ORDER BY s."startedAt" DESC`);
    return {sessions,config,range};
  }
  async overview(storeId:number,query:Record<string,string|undefined>) {
    const {sessions,config,range}=await this.cohort(storeId,query);const metrics=buildMetrics(sessions);
    const latest=await this.prisma.$queryRaw<{lastReceivedAt:Date|null}[]>(Prisma.sql`SELECT MAX("receivedAt") AS "lastReceivedAt" FROM "AnalyticsEvent" WHERE "storeId"=${storeId}`);
    const products=metrics.products.length?await this.prisma.product.findMany({where:{storeId,id:{in:metrics.products.map(p=>p.productId)}},select:{id:true,title:true,slug:true}}):[];
    return {...metrics,products:metrics.products.map(p=>({...p,title:products.find(row=>row.id===p.productId)?.title??`Producto ${p.productId}`})),config,lastReceivedAt:latest[0]?.lastReceivedAt??null,range};
  }
  async sessions(storeId:number,query:Record<string,string|undefined>) {
    const {sessions}=await this.cohort(storeId,query);const page=Math.max(1,Math.min(10000,Math.floor(Number(query.page))||1));
    const details=sessions.map(s=>describeSession(s)).filter(s=>(!query.step||s.lastStep===query.step)&&(!query.status||s.status===query.status));
    return {items:details.slice((page-1)*20,page*20),total:details.length,page,pageSize:20};
  }
  async conversion(storeId:number,orderId:number) {
    if(!Number.isInteger(storeId)||!Number.isInteger(orderId))return;
    // Only a checkout event with a matching session token can create attribution. Manual sales never qualify.
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO "AnalyticsOrder" ("storeId","orderId","sessionId","createdAt","amount")
      SELECT o."storeId",o.id,s.id,o."createdAt",o.total FROM "Order" o JOIN "OrderEvent" e ON e."orderId"=o.id AND e."storeId"=o."storeId" AND e.type='order.created'
      JOIN "AnalyticsSession" s ON s."storeId"=o."storeId" AND s.id::text=e.metadata->>'analyticsSessionId' AND s."tokenHash"=e.metadata->>'analyticsTokenHash'
      WHERE o.id=${orderId} AND o."storeId"=${storeId} ON CONFLICT DO NOTHING`);
    await this.prisma.$executeRaw(Prisma.sql`UPDATE "AnalyticsOrder" a SET "paidAt"=COALESCE(a."paidAt",(SELECT MIN(e."createdAt") FROM "OrderEvent" e WHERE e."storeId"=a."storeId" AND e."orderId"=a."orderId" AND e.type='order.payment_confirmed'),CURRENT_TIMESTAMP)
      FROM "Order" o WHERE a."storeId"=${storeId} AND a."orderId"=${orderId} AND o.id=a."orderId" AND o."storeId"=a."storeId" AND (o.status::text IN ('paid','shipped','delivered','completed') OR EXISTS(SELECT 1 FROM "OrderEvent" e WHERE e."storeId"=a."storeId" AND e."orderId"=a."orderId" AND e.type='order.payment_confirmed'))`);
  }
  @Cron('*/15 * * * *')
  async reconcile() {
    try{
      let cursor=0;
      for(;;){
        const orders=await this.prisma.$queryRaw<{storeId:number;id:number}[]>(Prisma.sql`SELECT DISTINCT o."storeId",o.id FROM "Order" o JOIN "OrderEvent" e ON e."orderId"=o.id AND e."storeId"=o."storeId" WHERE o.id>${cursor} AND e.type='order.created' AND e.metadata ? 'analyticsSessionId' AND o."createdAt">CURRENT_TIMESTAMP-INTERVAL '180 days' AND (NOT EXISTS(SELECT 1 FROM "AnalyticsOrder" a WHERE a."orderId"=o.id) OR EXISTS(SELECT 1 FROM "AnalyticsOrder" a WHERE a."orderId"=o.id AND a."paidAt" IS NULL)) ORDER BY o.id ASC LIMIT 500`);
        for(const order of orders)await this.conversion(order.storeId,order.id);
        if(orders.length<500)break;cursor=orders[orders.length-1].id;
      }
    }catch{this.logger.warn('Analytics reconciliation unavailable; will retry');}
  }
  @Cron('0 3 * * *')
  async cleanup(){try{await this.prisma.$executeRaw`DELETE FROM "AnalyticsSession" WHERE "startedAt" < CURRENT_TIMESTAMP-INTERVAL '180 days'`;}catch{this.logger.warn('Analytics cleanup unavailable; will retry');}}
}
