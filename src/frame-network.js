/* Desktop connection controls. No automatic bypass of a selected VPN/proxy. */
(function(){
 'use strict';let dialog=null;
 const modes={system:'Системный прокси',direct:'Без прокси',custom:'Свой прокси'};
 function message(code){
  if(/ERR_INVALID_RESPONSE/.test(code))return 'Вместо данных каталога получен неожиданный ответ сервера или прокси.';
  if(/HTTP2_PROTOCOL|QUIC_PROTOCOL/.test(code))return 'Ошибка сетевого протокола. Проверь настройки VPN и стратегию Zapret.';
  if(/NAME_NOT_RESOLVED|DNS_/.test(code))return 'Не удалось определить адрес сервера. Проверь DNS и настройки VPN.';
  if(/PROXY|TUNNEL|SOCKS/.test(code))return 'Не удалось подключиться через прокси. Проверь его адрес и работу VPN.';
  if(/CERT_|SSL_|TLS/.test(code))return 'Ошибка защищённого соединения. Проверь дату Windows и фильтрацию HTTPS в сетевых программах.';
  if(/TIMED_OUT|TIMEOUT/.test(code))return 'Сервер не ответил вовремя. Возможны проблемы маршрута, фильтрация трафика или недоступность сервера.';
  if(/CONNECTION_RESET|CONNECTION_CLOSED|CONNECTION_ABORTED/.test(code))return 'Соединение разорвано. Проверь VPN, стратегию Zapret и сетевые фильтры.';
  if(/INTERNET_DISCONNECTED|NETWORK_CHANGED/.test(code))return 'Подключение изменилось или пропало. Переподключись и повтори загрузку.';
  if(/HTTP 401/.test(code))return 'TMDB отклонил ключ доступа каталога.';
  if(/HTTP 403|HTTP 451/.test(code))return 'Сервер отказал в доступе. Причину нужно проверить на текущем подключении.';
  if(/HTTP 429/.test(code))return 'Слишком много запросов к TMDB. Подожди немного и повтори.';
  if(/HTTP 5\d\d/.test(code))return 'Ошибка сервера каталога или промежуточного прокси. Повтори позже.';
  return 'Не удалось получить данные. Проверь соединение — диагностика поможет отличить сбой сети от ошибки сервера.';
 }
 let originalApi=null,apiWrapper=null,preferOfficial=false,storageHook=false;
 function forgetRoute(){preferOfficial=false;}
 function official(path){return 'https://api.themoviedb.org/3/'+path;}
 function installRoutes(){
  if(Lampa.TMDB.api!==apiWrapper){originalApi=Lampa.TMDB.api.bind(Lampa.TMDB);apiWrapper=path=>preferOfficial?official(path):originalApi(path);Lampa.TMDB.api=apiWrapper;}
  if(!storageHook&&Lampa.Storage.listener){storageHook=true;Lampa.Storage.listener.follow('change',e=>{if(['proxy_tmdb','tmdb_proxy_api','proxy_tmdb_auto'].includes(e.name))forgetRoute();});}
 }
 async function request(path,signal){
  installRoutes();const configured=originalApi(path),native=official(path);
  const sameOfficial=new URL(configured).origin==='https://api.themoviedb.org';
  const urls=sameOfficial?[configured]:Array.from(new Set(preferOfficial?[native,configured]:[configured,native]));let last;
  for(const url of urls){
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   const abort=new AbortController(),cancel=()=>abort.abort();let expired=false;
   signal?.addEventListener('abort',cancel,{once:true});const timeout=setTimeout(()=>{expired=true;abort.abort();},6500);
   try{
    const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw new Error('HTTP '+response.status);
    let result;try{result=await response.json();}catch{throw new Error('ERR_INVALID_RESPONSE');}
    preferOfficial=url===native&&configured!==native;return result;
   }catch(error){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    if(expired)error.netCode='ERR_TIMED_OUT';
    else if(!/^HTTP /.test(error.message)&&window.api?.networkError){const detail=await window.api.networkError(url).catch(()=>null);if(detail?.code)error.netCode=detail.code;}
    const rank=e=>/^HTTP /.test(e?.message||'')?3:e?.netCode||/^ERR_/.test(e?.message||'')?2:1;
    if(!last||rank(error)>=rank(last))last=error;if(error.message==='HTTP 401')break;
   }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
  }
  throw last;
 }
 // Recover TMDB images only: preserve the image error handlers if both addresses fail.
 const retriedImages=new WeakSet();
 document.addEventListener('error',e=>{
  const img=e.target;if(!(img instanceof HTMLImageElement)||retriedImages.has(img)||!window.Lampa?.TMDB)return;
  try{
   const current=new URL(img.src),configured=new URL(Lampa.TMDB.image('t/p/w92/kadr-test.jpg'));
   const index=current.pathname.indexOf('/t/p/');if(index<0||current.hostname==='image.tmdb.org'||current.hostname!==configured.hostname)return;
   retriedImages.add(img);e.stopImmediatePropagation();img.src='https://image.tmdb.org'+current.pathname.slice(index);
  }catch{}
 },true);
 function el(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
 function add(parent,...nodes){nodes.forEach(n=>parent.appendChild(n));return parent;}
 function button(text,fn){const b=el('button','',text);b.type='button';b.addEventListener('click',fn);return b;}
 async function open(){
  if(dialog)return;const api=window.api;if(!api?.desktopConfig){Lampa.Noty.show('Настройки сети доступны в Windows-приложении');return;}
  const previous=document.activeElement,overlay=el('div','kn-overlay'),panel=el('section','kn-panel');dialog=overlay;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','kn-title');
  const head=el('header','kn-head');const title=el('h2','','Подключение каталога');title.id='kn-title';const closeButton=button('Закрыть',close);add(head,title,closeButton);
  const intro=el('p','kn-muted','Настройки применяются сразу. «Без прокси» отключает прокси приложения, но не обходит VPN в режиме TUN и не выключает Zapret.');
  const form=el('div','kn-form');const mode=el('select');mode.setAttribute('aria-label','Режим подключения');Object.entries(modes).forEach(([value,label])=>{const o=el('option','',label);o.value=value;mode.appendChild(o);});
  const proxy=el('input');proxy.type='text';proxy.placeholder='socks5://127.0.0.1:1080';proxy.setAttribute('aria-label','Адрес прокси');proxy.autocomplete='off';proxy.spellcheck=false;
  function field(text,input){return add(el('label','kn-field'),el('span','',text),input);}
  const doh=el('input');doh.type='checkbox';doh.setAttribute('aria-label','DNS через HTTPS');const dnsLabel=add(el('label','kn-dns'),doh,el('span','','DNS через HTTPS с возвратом к системному DNS'));
  add(form,field('Подключение',mode),field('Адрес своего прокси',proxy),dnsLabel);
  const feedback=el('p','kn-feedback','Читаем настройки…');feedback.setAttribute('role','status');const results=el('div','kn-results');results.setAttribute('aria-live','polite');
  const actions=el('div','kn-actions');const saveButton=button('Применить',()=>run('save')),checkButton=button('Проверить соединение',()=>run('check')),resetButton=button('Переподключить',()=>run('reset'));checkButton.className='kn-primary';add(actions,saveButton,checkButton,resetButton);
  const note=el('p','kn-muted kn-note','Смена подключения и «Переподключить» закроют текущие сетевые соединения и могут прервать видео. Избранное и история сохранятся.');
  const report=el('textarea','kn-report');report.readOnly=true;report.hidden=true;report.setAttribute('aria-label','Отчёт проверки');
  const copy=button('Скопировать отчёт',async()=>{try{await navigator.clipboard.writeText(report.value);feedback.textContent='Отчёт скопирован';}catch{report.hidden=false;report.focus();report.select();feedback.textContent='Выделенный отчёт можно скопировать через Ctrl+C';}});copy.hidden=true;
  add(panel,head,intro,form,actions,feedback,results,copy,report,note);overlay.appendChild(panel);document.body.appendChild(overlay);
  let config={},busy=false,closed=false;
  function lock(value){busy=value;[mode,proxy,doh,saveButton,checkButton,resetButton].forEach(n=>n.disabled=value);proxy.disabled=value||mode.value!=='custom';}
  mode.addEventListener('change',()=>{proxy.disabled=mode.value!=='custom';});
  function close(){if(closed)return;closed=true;document.removeEventListener('keydown',keys,true);document.removeEventListener('keyup',stopKeys,true);overlay.remove();dialog=null;if(previous?.isConnected)previous.focus({preventScroll:true});}
  function stopKeys(e){if(overlay.contains(e.target)){e.stopImmediatePropagation();}}
  function keys(e){if(closed)return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'){const all=Array.from(panel.querySelectorAll('button,input,select,textarea')).filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length),i=all.indexOf(document.activeElement);if(i<0||(!e.shiftKey&&i===all.length-1)||(e.shiftKey&&i===0)){e.preventDefault();(e.shiftKey?all.at(-1):all[0])?.focus();}}}
  document.addEventListener('keydown',keys,true);document.addEventListener('keyup',stopKeys,true);overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  async function actualCatalog(){const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),14000);try{const json=await request('configuration?api_key='+encodeURIComponent(Lampa.TMDB.key()),abort.signal);return {label:'Запрос приложения',ok:!!json.images,code:json.images?'':'ERR_INVALID_RESPONSE'};}catch(error){return {label:'Запрос приложения',ok:false,code:error.name==='AbortError'?'ERR_TIMED_OUT':error.netCode||error.message};}finally{clearTimeout(timeout);}}
  async function run(action){if(busy)return;lock(true);results.replaceChildren();copy.hidden=true;report.hidden=true;feedback.textContent='Применяем настройки…';try{
    const saved=await api.setDesktop({proxyMode:mode.value,proxy:mode.value==='custom'?proxy.value.trim():'',doh:doh.checked});if(!saved.ok)throw new Error(saved.error||'Не удалось применить настройки');config=saved.config;forgetRoute();
    if(action==='save'){feedback.textContent='Настройки применены';return;}
    if(action==='reset'){await api.networkReset();feedback.textContent='Соединения обновлены. Можно повторить загрузку каталога.';return;}
    feedback.textContent='Проверяем каталог и постеры…';const [diagnostic,actual]=await Promise.all([api.networkCheck(String(Lampa.TMDB.key()||'')),actualCatalog()]);if(closed)return;
    const lines=['Кадр '+(config.version||''),'Подключение: '+modes[diagnostic.config.proxyMode],'DNS через HTTPS: '+(diagnostic.config.doh?'включён, с системным fallback':'выключен'),'Маршрут: '+diagnostic.route];
    const all=diagnostic.results.concat(actual);
    all.forEach(r=>{const text=r.label+': '+(r.ok?'доступен':'ошибка')+(r.status?' · HTTP '+r.status:'')+(r.code?' · '+r.code:'');const row=el('div','kn-result '+(r.ok?'kn-ok':'kn-failed'));row.appendChild(el('strong','',text));if(!r.ok)row.appendChild(el('p','',message(r.code||'HTTP '+r.status)));if(r.ok&&r.status===401)row.appendChild(el('p','','Сервер доступен; проверка выполнена без ключа.'));results.appendChild(row);lines.push(text);});
    lines.push('Проверяется текущее подключение; состояние VPN и Zapret автоматически не определяется.');report.value=lines.join('\n');copy.hidden=false;feedback.textContent=all.every(r=>r.ok)?'Каталог и постеры доступны на текущем подключении.':'Проверка завершена. Скопируй отчёт, чтобы разобрать причину.';
   }catch(error){if(!closed)feedback.textContent=error.message||'Не удалось проверить соединение';}finally{if(!closed)lock(false);}}
  lock(true);closeButton.focus();try{config=await api.desktopConfig();if(closed)return;mode.value=config.proxyMode||'system';proxy.value=config.proxy||'';doh.checked=!!config.doh;feedback.textContent='При смене VPN нажми «Переподключить», затем проверь соединение.';}catch{feedback.textContent='Не удалось прочитать настройки';}finally{if(!closed)lock(false);}
 }
 window.KadrNetwork={open,message,request,forgetRoute};
})();
