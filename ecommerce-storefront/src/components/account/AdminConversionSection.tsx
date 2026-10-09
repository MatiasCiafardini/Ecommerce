"use client";
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/api';
import styles from './AdminConversionSection.module.css';
type Config={enabled:boolean;clarityProjectId:string;timezone:string;startedAt:string|null};
type Step={key:string;label:string;reached:number;advanced:number;nextKey:string|null;advanceRate:number|null;abandoned:number;medianSeconds:number|null};
type Group={label:string;sessions:number;approved:number;conversion:number};
type Overview={summary:{sessions:number;withCart:number;checkoutStarted:number;ordersConfirmed:number;approvedPurchases:number;approvedRevenue:number;active:number;abandoned:number;pendingPayment:number};funnel:Step[];access:{required:number;completed:number;abandoned:number};devices:Group[];sources:Group[];errors:{category:string;sessions:number}[];products:{productId:number;title:string;views:number;added:number}[];directEntries:number;config:Config;lastReceivedAt:string|null;range:{from:string;to:string;timezone:string}};
type Session={id:string;startedAt:string;device:string;source:string;status:string;lastStep:string;events:{type:string;occurredAt:string;category?:string}[];orders:{orderId:number;status:string;paidAt?:string;amount:number}[]};
const labels:Record<string,string>={page_view:'Visita',product_view:'Ve una prenda',add_to_cart:'Agrega al carrito',cart_view:'Ve el carrito',checkout_intent:'Inicia la compra',auth_required:'Necesita acceder',auth_completed:'Acceso completado',checkout_ready:'Checkout preparado',delivery_completed:'Entrega completada',payment_selected:'Pago elegido',review_reached:'Revisión',order_attempt:'Confirma el pedido',order_created:'Pedido confirmado',payment_approved:'Compra aprobada',purchase_error:'Error de compra',in_progress:'En curso',abandoned:'Abandonó',pending_payment:'Pendiente de pago',approved:'Compra aprobada',mobile:'Celular',desktop:'Computadora',tablet:'Tablet',direct:'Directo',stock:'Stock',access:'Acceso',delivery:'Entrega',validation:'Validación',order:'Creación del pedido',payment:'Pago'};
const name=(key:string)=>labels[key]??key;
const integer=(value:number)=>new Intl.NumberFormat('es-AR').format(value);
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);
const duration=(seconds:number|null)=>seconds===null?'—':seconds<60?`${Math.round(seconds)} s`:`${Math.round(seconds/60)} min`;
export default function AdminConversionSection(){
 const [period,setPeriod]=useState('30'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[device,setDevice]=useState(''),[source,setSource]=useState('');
 const [step,setStep]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1);
 const [data,setData]=useState<Overview|null>(null),[sessions,setSessions]=useState<{items:Session[];total:number;pageSize:number}|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[sessionError,setSessionError]=useState(''),[refresh,setRefresh]=useState(0);
 const [enabled,setEnabled]=useState(false),[project,setProject]=useState(''),[timezone,setTimezone]=useState('America/Argentina/Buenos_Aires'),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const dirty=useRef(false);
 const params=new URLSearchParams({period:period==='custom'?'30':period,...(device?{device}:{}),...(source?{source}:{})});
 if(period==='custom'){if(from)params.set('from',from);if(to)params.set('to',to);}const query=params.toString();
 useEffect(()=>{const timer=setInterval(()=>setRefresh(value=>value+1),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(period==='custom'&&(!from||!to)){setLoading(false);return;}const controller=new AbortController();setLoading(true);setError('');
  api(`/store/admin/analytics/overview?${query}`,{signal:controller.signal}).then((result:Overview)=>{setData(result);if(!dirty.current){setEnabled(result.config.enabled);setProject(result.config.clarityProjectId);setTimezone(result.config.timezone);}}).catch((err:Error)=>{if(!controller.signal.aborted)setError(err.message||'No pudimos cargar las métricas.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[query,refresh,period,from,to]);
 useEffect(()=>{if(period==='custom'&&(!from||!to))return;const controller=new AbortController();setSessionError('');
  api(`/store/admin/analytics/sessions?${query}&page=${page}${step?`&step=${step}`:''}${status?`&status=${status}`:''}`,{signal:controller.signal}).then(setSessions).catch((err:Error)=>{if(!controller.signal.aborted)setSessionError(err.message);});return()=>controller.abort();
 },[query,page,step,status,refresh,period,from,to]);
 const date=(value:string|null)=>value?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:data?.config.timezone??'America/Argentina/Buenos_Aires'}).format(new Date(value)):'Todavía sin datos';
 const filter=(action:()=>void)=>{action();setPage(1);};
 async function save(){setSaving(true);setNotice('');try{await api('/store/admin/analytics/config',{method:'PUT',body:JSON.stringify({enabled,clarityProjectId:project.trim(),timezone})});dirty.current=false;setNotice('Configuración guardada. Las visitas nuevas usarán estos cambios.');setRefresh(value=>value+1);}catch(err){setNotice(err instanceof Error?err.message:'No pudimos guardar.');}finally{setSaving(false);}}
 return <section className={styles.shell} data-clarity-mask="true">
  <header className={styles.header}><div><p className={styles.eyebrow}>EXPERIENCIA DE COMPRA</p><h1>Conversión y abandonos</h1><p>Entendé hasta dónde llega la gente y en qué paso se detiene.</p></div><button onClick={()=>setRefresh(value=>value+1)} disabled={loading}>Actualizar</button></header>
  <div className={styles.filters}><label>Período<select value={period} onChange={e=>filter(()=>setPeriod(e.target.value))}><option value="today">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="custom">Personalizado</option></select></label>
   {period==='custom'?<><label>Desde<input type="date" value={from} onChange={e=>filter(()=>setFrom(e.target.value))}/></label><label>Hasta<input type="date" value={to} onChange={e=>filter(()=>setTo(e.target.value))}/></label></>:null}
   <label>Dispositivo<select value={device} onChange={e=>filter(()=>setDevice(e.target.value))}><option value="">Todos</option><option value="mobile">Celular</option><option value="desktop">Computadora</option><option value="tablet">Tablet</option></select></label>
   <label>Origen<select value={source} onChange={e=>filter(()=>setSource(e.target.value))}><option value="">Todos</option>{[...new Set([...(source?[source]:[]),...(data?.sources.map(row=>row.label)??[])])].map(value=><option key={value} value={value}>{name(value)}</option>)}</select></label>
  </div>
  {error?<p role="alert" className={styles.error}>{error} <button onClick={()=>setRefresh(value=>value+1)}>Reintentar</button></p>:null}
  {loading&&!data?<p role="status" className={styles.empty}>Cargando métricas…</p>:null}
  {data?<><p className={styles.note}>{data.range.from} — {data.range.to} · {data.range.timezone} · Sesiones iniciadas en este período{loading?' · Actualizando…':''}</p>
   {!data.summary.sessions?<div className={styles.empty}>Todavía no hay sesiones registradas para estos filtros. Los datos empiezan a acumularse desde la activación del seguimiento.</div>:null}
   <div className={styles.cards}>{[['Sesiones',integer(data.summary.sessions)],['Con carrito',integer(data.summary.withCart)],['Iniciaron compra',integer(data.summary.checkoutStarted)],['Pedidos confirmados',integer(data.summary.ordersConfirmed)],['Compras aprobadas',integer(data.summary.approvedPurchases)],['Importe aprobado',money(data.summary.approvedRevenue)]].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
   <article className={styles.panel}><div className={styles.panelHeading}><div><h2>Recorrido de compra</h2><p>Cada paso cuenta sesiones distintas. Seleccioná uno para ver los recorridos que terminaron ahí.</p></div><button onClick={()=>filter(()=>setStep(''))}>Ver todos</button></div>
    <div className={styles.funnel}>{data.funnel.map(row=><button key={row.key} aria-pressed={step===row.key} className={`${styles.funnelRow} ${step===row.key?styles.selected:''}`} onClick={()=>filter(()=>setStep(step===row.key?'':row.key))}>
     <span className={styles.stepTitle}>{row.label}</span><span className={styles.bar}><i style={{width:`${data.summary.sessions?row.reached/data.summary.sessions*100:0}%`}}/></span><strong>{integer(row.reached)}</strong><span>{row.nextKey?`${row.advanceRate??0}% avanza`:'Compra aprobada'}</span><small>{row.abandoned} abandonos · {duration(row.medianSeconds)} al siguiente</small>
    </button>)}</div>
    <div className={styles.callout}><strong>Acceso antes del checkout</strong><span>{data.access.required} necesitaron acceder · {data.access.completed} completaron el acceso · {data.access.abandoned} terminaron en este paso.</span><button onClick={()=>filter(()=>setStep('auth_required'))}>Ver este paso</button></div>
    <p className={styles.note}>El porcentaje considera quienes hicieron este paso y después el siguiente. {data.directEntries} sesiones entraron con un carrito recuperado o directamente al checkout; no se inventan pasos anteriores.</p>
   </article>
   <article className={styles.panel}><h2>Dónde se frena la gente</h2><div className={styles.statuses}>{[['abandoned',data.summary.abandoned,'Abandonaron'],['pending_payment',data.summary.pendingPayment,'Pendientes de pago'],['in_progress',data.summary.active,'En curso']].map(([key,value,label])=><button key={key} onClick={()=>filter(()=>setStatus(status===key?'':String(key)))} aria-pressed={status===key}><strong>{value}</strong>{label}</button>)}</div>
    <p className={styles.note}>Una sesión se cierra tras 30 minutos de inactividad. Un pedido pendiente de pago no es un abandono. Los errores son señales observadas, no explicaciones automáticas.</p>
    <div className={styles.errors}>{data.errors.length?data.errors.map(row=><span key={row.category}>{name(row.category)}: <strong>{row.sessions} sesiones</strong></span>):<span>Sin errores de compra registrados.</span>}</div>
    <div className={styles.panelHeading}><h3>Detalle de recorridos {step?`· ${name(step)}`:''} {status?`· ${name(status)}`:''}</h3><button onClick={()=>filter(()=>{setStep('');setStatus('');})}>Limpiar selección</button></div>
    {sessionError?<p role="alert" className={styles.error}>{sessionError}</p>:null}
    {!sessions?<p>Cargando recorridos…</p>:!sessions.items.length?<p className={styles.empty}>No hay recorridos para esta selección.</p>:<div className={styles.sessionList}>{sessions.items.map(session=><details key={session.id}><summary><span><strong>Sesión {session.id.slice(0,8)}</strong><small>{date(session.startedAt)} · {name(session.device)} · {name(session.source)}</small></span><span><strong>{name(session.lastStep)}</strong><small>{name(session.status)}</small></span></summary>
     <ol className={styles.timeline}>{session.events.map((event,index)=><li key={index}><span>{name(event.type)}{event.category?` · ${name(event.category)}`:''}</span><time>{date(event.occurredAt)}</time></li>)}</ol>{session.orders.map(order=><p key={order.orderId}>Pedido #{order.orderId} · {money(order.amount)} · {order.paidAt?'Pago aprobado':'Estado: '+order.status}</p>)}
    </details>)}</div>}
    <div className={styles.pagination}><button disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Anterior</button><span>Página {page} · {sessions?.total??0} recorridos</span><button disabled={!sessions||page*sessions.pageSize>=sessions.total} onClick={()=>setPage(v=>v+1)}>Siguiente</button></div>
   </article>
   <div className={styles.comparisons}><article className={styles.panel}><h2>Por dispositivo</h2><Comparison rows={data.devices}/></article><article className={styles.panel}><h2>Por origen</h2><Comparison rows={data.sources}/></article></div>
   <article className={styles.panel}><h2>Productos que generan interés</h2><p>Sesiones que vieron cada producto y sesiones que lo agregaron al carrito.</p><div className={styles.productList}>{data.products.length?data.products.map(product=><div key={product.productId}><strong>{product.title}</strong><span>{product.views} lo vieron</span><span>{product.added} lo agregaron</span></div>):<p>Sin interacciones con productos registradas.</p>}</div></article>
   <article className={styles.panel}><h2>Estado del seguimiento y Clarity</h2><div className={styles.tracking}><p><strong>{data.config.enabled?'Seguimiento activo':'Seguimiento desactivado'}</strong><br/>Inicio: {date(data.config.startedAt)}<br/>Último evento: {date(data.lastReceivedAt)}</p><p>Detalle conservado durante 180 días. Medimos sesiones, no personas únicas. Bloqueadores, conexiones interrumpidas y varias pestañas pueden reducir o fragmentar la cobertura.</p></div>
    <div className={styles.settings}><label className={styles.checkbox}><input type="checkbox" checked={enabled} onChange={e=>{dirty.current=true;setEnabled(e.target.checked);}}/> Registrar métricas de esta tienda</label><label>Proyecto de Clarity<input value={project} placeholder="Identificador del proyecto" maxLength={30} onChange={e=>{dirty.current=true;setProject(e.target.value);}}/></label><label>Zona horaria<input value={timezone} onChange={e=>{dirty.current=true;setTimezone(e.target.value);}}/></label><button disabled={saving} onClick={save}>{saving?'Guardando…':'Guardar configuración'}</button></div>
    <p className={styles.note}>Las grabaciones se activan solo para visitantes que las aceptan. Configurá un proyecto distinto por tienda y verificá el enmascaramiento.</p>
    {data.config.clarityProjectId?<a className={styles.link} href={`https://clarity.microsoft.com/projects/view/${data.config.clarityProjectId}/recordings`} target="_blank" rel="noopener noreferrer">Abrir grabaciones en Clarity ↗</a>:<p className={styles.note}>Clarity todavía no está configurado. El panel propio funciona igualmente.</p>}{notice?<p role="status">{notice}</p>:null}
   </article>
  </>:null}
 </section>;
}
function Comparison({rows}:{rows:Group[]}){return rows.length?<div className={styles.groupList}>{rows.map(row=><div key={row.label}><strong>{name(row.label)}</strong><span>{row.sessions} sesiones</span><span>{row.conversion}% compra · {row.approved} sesiones con compra</span></div>)}</div>:<p>Sin datos para comparar.</p>;}
