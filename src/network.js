// Electron's Chromium session is shared with the catalog and installed plugins.
'use strict';
function validProxy(value) {
  if (typeof value !== 'string' || value.length > 300) return false;
  try {const u=new URL(value);return /^(https?|socks|socks4|socks5):$/.test(u.protocol)&&!!u.hostname&&!u.username&&!u.password&&u.pathname.replace('/','')===''&&!u.search&&!u.hash;} catch {return false;}
}
function configuration(net={}) {
  const proxy=typeof net.proxy==='string'?net.proxy.trim():'';
  // Old empty settings inherited Windows settings; preserve that behavior explicitly.
  const mode=['system','direct','custom'].includes(net.proxyMode)?net.proxyMode:(proxy&&proxy!=='system'?'custom':'system');
  return {proxyMode:mode,proxy:mode==='custom'?proxy:'',doh:net.doh===true||Array.isArray(net.doh)||typeof net.doh==='string'&&!!net.doh};
}
function proxyConfig(cfg) {
  if(cfg.proxyMode==='custom'){if(!validProxy(cfg.proxy))throw new Error('Некорректный адрес прокси');return {mode:'fixed_servers',proxyRules:cfg.proxy};}
  return {mode:cfg.proxyMode};
}
function errorCode(error) {return String(error?.code||error?.message||error||'').match(/(?:net::)?(ERR_[A-Z0-9_]+)/)?.[1]||'ERR_NETWORK';}
function createNetwork({app,getSession,request,store,log}) {
  let queue=Promise.resolve(),checking=null;const failures=new Map();
  function enqueue(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
  async function reconnect(){const ses=getSession();await ses.forceReloadProxyConfig();await ses.clearHostResolverCache();await ses.closeAllConnections();failures.clear();}
  function apply(){return enqueue(async()=>{
    const net=store.get('network')||{},cfg=configuration(net),ses=getSession();
    const servers=Array.isArray(net.doh)?net.doh:typeof net.doh==='string'&&net.doh?[net.doh]:net.dohServers||[];
    app.configureHostResolver(cfg.doh?{enableBuiltInResolver:true,secureDnsMode:'automatic',secureDnsServers:servers}:{enableBuiltInResolver:false,secureDnsMode:'off'});
    await ses.setProxy(proxyConfig(cfg));
    await reconnect();
    log.info('[net] settings applied:',cfg.proxyMode,cfg.doh?'DoH with system fallback':'system DNS');
    return cfg;
  });}
  function reset(){return enqueue(async()=>{await reconnect();return {ok:true};});}
  function install(){getSession().webRequest.onErrorOccurred({urls:['http://*/*','https://*/*']},d=>{
    const host=new URL(d.url).hostname;
    if(!['api.themoviedb.org','image.tmdb.org'].includes(host)&&!/^apitmdb\./.test(host))return;
    if(d.error==='net::ERR_ABORTED')return;
    failures.set(d.url,{code:errorCode(d.error),at:Date.now()});
    while(failures.size>40)failures.delete(failures.keys().next().value);
    // Never log query strings: catalog URLs contain the TMDB key.
    log.warn('[net] TMDB request failed:',new URL(d.url).hostname,errorCode(d.error));
  });}
  function lastError(url){const e=failures.get(String(url));return e&&Date.now()-e.at<30000?{code:e.code}:null;}
  function probe(label,url,authenticated){return new Promise(resolve=>{
    const start=Date.now();let req,done=false;
    const finish=result=>{if(done)return;done=true;clearTimeout(timer);resolve({label,host:new URL(url).hostname,ms:Date.now()-start,...result});};
    const timer=setTimeout(()=>{finish({ok:false,code:'ERR_TIMED_OUT'});req?.abort();},8000);
    try {
      req=request({url,session:getSession(),redirect:'error'});
      req.on('response',response=>{const status=response.statusCode;finish({ok:status===200||(!authenticated&&status===401),status,authenticated});req.abort();});
      req.on('error',e=>finish({ok:false,code:errorCode(e)}));req.end();
    } catch(e){finish({ok:false,code:errorCode(e)});}
  });}
  async function runCheck(key){await queue;
    const cfg=configuration(store.get('network'));const apiKey=typeof key==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(key)?key:'';
    const url='https://api.themoviedb.org/3/configuration'+(apiKey?'?api_key='+encodeURIComponent(apiKey):'');
    const results=await Promise.all([probe('Каталог TMDB',url,!!apiKey),probe('Постеры TMDB','https://image.tmdb.org/t/p/w92/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',true)]);
    // Report only route type, never proxy credentials, tokens or a private address.
    let route='Не определён';
    try {const routeValue=await Promise.race([getSession().resolveProxy(url),new Promise(resolve=>setTimeout(()=>resolve(''),1500))]);route=routeValue==='DIRECT'?'Прямое подключение':routeValue?'Через прокси':'Не определён';} catch {}
    return {config:cfg,route,results};
  }
  function check(key){if(!checking)checking=runCheck(key).finally(()=>{checking=null;});return checking;}
  return {apply,reset,install,lastError,check,config:()=>configuration(store.get('network'))};
}
module.exports={createNetwork,configuration,proxyConfig,validProxy,errorCode};
