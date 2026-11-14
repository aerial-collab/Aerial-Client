// Add sync to your EXISTING Aerial AI worker (aerial-ai.aerialss.workers.dev).
// 1) Worker -> Settings -> Bindings -> add a KV namespace binding named AERIAL
// 2) Paste the function below into the worker file, then add these 2 lines at the very top of your fetch handler:
//      const sy = await syncRoute(request, env); if (sy) return sy;
// Your AI chat keeps working: only /register /login /save /ping are handled here.
const SC = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const SJ = (o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:{...SC,'Content-Type':'application/json'}});
async function syncRoute(req, env){
 const p = new URL(req.url).pathname;
 if(!['/register','/login','/save','/ping'].includes(p)) return null;
 if(req.method==='OPTIONS') return new Response(null,{headers:SC});
 let b; try{ b = await req.json(); }catch(e){ return SJ({err:'bad'},400); }
 const k = 'u:'+String(b.k||'').toLowerCase();
 if(!/^u:[a-z0-9_]{3,16}$/.test(k) || !b.h || String(b.h).length>100) return SJ({err:'bad'},400);
 const cur = await env.AERIAL.get(k,'json');
 if(p==='/register'){ if(cur) return SJ({err:'taken'}); await env.AERIAL.put(k,JSON.stringify({h:b.h,d:b.d})); return SJ({ok:1}); }
 if(!cur || cur.h!==b.h) return SJ({err:'auth'});
 if(p==='/login') return SJ({ok:1,d:cur.d});
 if(JSON.stringify(b.d).length>200000) return SJ({err:'big'});
 await env.AERIAL.put(k,JSON.stringify({h:cur.h,d:b.d})); return SJ({ok:1});
}
