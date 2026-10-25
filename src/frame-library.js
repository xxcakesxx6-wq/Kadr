/* Кадр: desktop collections, backed by the existing Lampa.Favorite store. */
(function(){
  'use strict';
  const names={book:'Закладки',like:'Нравится',wath:'Позже',history:'История просмотров',look:'Смотрю',viewed:'Просмотрено',scheduled:'Запланировано',continued:'Продолжаю',thrown:'Брошено'};
  const primary=['book','like','wath'];let closeDialog=null;
  function el(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
  function add(n,...children){children.forEach(x=>n.appendChild(x));return n;}
  function button(text,fn,cls){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function picker(movie,origin){
    if(closeDialog)closeDialog();
    const previous=Lampa.Controller.enabled()?.name||'content',focus=origin||document.activeElement;
    const overlay=el('div','kadr-collection-overlay'),dialog=el('section','kadr-collection-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Добавить в коллекцию');
    const head=el('header'),title=el('div');add(title,el('span','kadr-library-eyebrow','ТВОЯ КОЛЛЕКЦИЯ'),el('h2','','Сохранить фильм'),el('p','',movie.title||movie.name||''));
    const close=button('×',()=>finish(),'kadr-collection-close');close.setAttribute('aria-label','Закрыть окно коллекции');add(head,title,close);
    const rows=el('div','kadr-collection-rows'),buttons=[];
    ['book','like','wath','history'].forEach(type=>{const b=button('',()=>{Lampa.Favorite.toggle(type,movie);refresh();},'kadr-collection-row');b.setAttribute('role','checkbox');const text=add(el('span'),el('strong','',names[type]),el('small','',{book:'Сохранить в своей подборке',like:'Фильмы, к которым хочется вернуться',wath:'Посмотреть в другой вечер',history:'Отметить в истории'}[type]));add(b,text,el('i','kadr-collection-check','✓'));b.dataset.list=type;buttons.push(b);rows.appendChild(b);});
    function refresh(){const status=Lampa.Favorite.check(movie);buttons.forEach(b=>{b.setAttribute('aria-checked',String(Boolean(status[b.dataset.list])));});}
    const footer=el('footer');add(footer,el('span','','Изменения сохраняются сразу'),button('Готово',()=>finish(),'kadr-collection-done'));add(dialog,head,rows,footer);overlay.appendChild(dialog);
    let closed=false;
    function finish(){if(closed)return;closed=true;Lampa.Listener.remove('state:changed',changed);overlay.remove();document.body.classList.remove('kadr-collection-open');closeDialog=null;Lampa.Controller.toggle(previous);if(focus?.isConnected)focus.focus();}
    function changed(e){if(e.target==='favorite')refresh();}
    Lampa.Listener.follow('state:changed',changed);overlay.onclick=e=>{if(e.target===overlay)finish();};
    overlay.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish();}else if(e.key==='Tab'){const items=Array.from(dialog.querySelectorAll('button')),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});overlay.addEventListener('keyup',e=>e.stopPropagation());
    document.body.appendChild(overlay);document.body.classList.add('kadr-collection-open');Lampa.Controller.add('kadr-collection',{toggle:()=>{},back:finish});Lampa.Controller.toggle('kadr-collection');closeDialog=finish;refresh();buttons[0].focus();
  }
  function Library(object){
    const history=object.type==='history',state=Object.assign({tab:history?'history':(names[object.type]?object.type:'all'),query:'',media:'all',sort:'added'},object.libraryState||{});let destroyed=false,shown=0,filtered=[];
    const root=el('section','kadr-library'),head=el('header','kadr-library-head');add(head,el('span','kadr-library-eyebrow','ТВОЙ КИНОЗАЛ'),el('h1','',history?'История просмотров':'Избранное'),el('p','',history?'Фильмы и сериалы, которые ты открывал.':'Всё, что сохранил на хороший вечер.'));
    const tabs=el('nav','kadr-library-tabs');tabs.setAttribute('aria-label','Разделы коллекции');
    const tools=el('div','kadr-library-tools'),search=el('input');search.type='search';search.placeholder='Поиск в коллекции';search.setAttribute('aria-label','Поиск в коллекции');search.value=state.query;search.oninput=()=>{state.query=search.value;draw();};
    function select(key,label,items){const s=el('select');s.setAttribute('aria-label',label);items.forEach(([v,t])=>{const o=el('option','',t);o.value=v;s.appendChild(o);});s.value=state[key];s.onchange=()=>{state[key]=s.value;draw();};return s;}
    add(tools,search,select('media','Тип в коллекции',[['all','Фильмы и сериалы'],['movie','Фильмы'],['tv','Сериалы']]),select('sort','Порядок в коллекции',[['added','Порядок списка'],['name','По названию'],['rating','По рейтингу'],['year','Сначала новые']]));
    const count=el('p','kadr-library-count'),grid=el('div','kadr-related-grid'),empty=el('div','kadr-library-empty'),more=button('Показать ещё',batch,'kadr-more-button');add(root,head,tabs,tools,count,grid,empty,more);
    root.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();Lampa.Activity.backward();}});root.addEventListener('keyup',e=>e.stopPropagation());root.addEventListener('wheel',e=>{if(!e.ctrlKey)e.stopImmediatePropagation();},{capture:true});
    function all(){const collections=Lampa.Favorite.all(),types=primary.concat(Object.keys(names).filter(k=>!primary.includes(k)&&k!=='history'&&(collections[k]||[]).length));const seen=new Set(),items=[];types.forEach(k=>(collections[k]||[]).forEach(m=>{const key=m.source+':'+m.id;if(!seen.has(key)){seen.add(key);items.push(m);}}));return {collections,types,items};}
    function draw(preserve=false){
      if(destroyed)return;const limit=preserve?Math.max(shown,object.libraryShown||0,24):24,scroll=preserve?root.scrollTop:0;const {collections,types,items}=all();object.libraryState=Object.assign({},state);const focused=document.activeElement?.dataset?.tab;tabs.replaceChildren();
      const keys=history?['history']:['all',...types];if(!keys.includes(state.tab))state.tab=history?'history':'all';
      keys.forEach(type=>{const label=type==='all'?'Все':names[type],b=button('',()=>{state.tab=type;draw();root.scrollTop=0;},'kadr-library-tab');b.dataset.tab=type;b.classList.toggle('active',state.tab===type);b.setAttribute('aria-pressed',String(state.tab===type));add(b,el('span','',label),el('small','',String(type==='all'?items.length:(collections[type]||[]).length)));tabs.appendChild(b);if(focused===type)b.focus();});
      filtered=(state.tab==='all'?items:(collections[state.tab]||[])).filter(m=>(state.media==='all'||(m.name||m.first_air_date?'tv':'movie')===state.media)&&(m.title||m.name||'').toLocaleLowerCase('ru').includes(state.query.toLocaleLowerCase('ru')));
      if(state.sort!=='added')filtered.sort((a,b)=>state.sort==='name'?(a.title||a.name||'').localeCompare(b.title||b.name||'','ru'):state.sort==='rating'?(b.vote_average||0)-(a.vote_average||0):(b.release_date||b.first_air_date||'').localeCompare(a.release_date||a.first_air_date||''));
      count.textContent='В списке: '+filtered.length;grid.replaceChildren();shown=0;empty.replaceChildren();empty.hidden=Boolean(filtered.length);if(!filtered.length)add(empty,el('h2','',state.query?'Ничего не нашлось':'Здесь пока пусто'),el('p','',state.query?'Попробуй другое название или измени фильтры.':'Открой карточку фильма и нажми «В коллекцию».'));batch();while(shown<limit&&shown<filtered.length)batch();root.scrollTop=scroll;
    }
    function batch(){filtered.slice(shown,shown+24).forEach(m=>{const title=m.title||m.name||'Без названия',item=el('article','kadr-saved-card'),open=button('',()=>Lampa.Activity.push({component:'full',id:m.id,method:m.name||m.first_air_date?'tv':'movie',source:m.source||'tmdb',card:m}),'kadr-related-card');open.setAttribute('aria-label','Открыть: '+title);const poster=el('div','kadr-related-poster');if(m.poster_path){const img=el('img');img.src=/^https?:/.test(m.poster_path)?m.poster_path:Lampa.TMDB.image('t/p/w500'+m.poster_path);img.alt=title;img.loading='lazy';img.onerror=()=>{img.remove();poster.classList.add('kadr-image-missing');};poster.appendChild(img);}else poster.classList.add('kadr-image-missing');if(m.vote_average>0)poster.appendChild(el('span','kadr-related-rating',Number(m.vote_average).toFixed(1)));add(open,poster,el('strong','',title),el('small','',[(m.release_date||m.first_air_date||'').slice(0,4),m.name||m.first_air_date?'Сериал':'Фильм'].filter(Boolean).join(' · ')));
      const edit=button(state.tab==='all'?'Изменить коллекции':'Убрать из списка',()=>{if(state.tab==='all')picker(m,edit);else Lampa.Favorite.remove(state.tab,m);},'kadr-saved-edit');edit.setAttribute('aria-label',state.tab==='all'?'Изменить коллекции: '+title:'Удалить из «'+names[state.tab]+'»: '+title);add(item,open,edit);grid.appendChild(item);});shown+=24;object.libraryShown=Math.min(shown,filtered.length);more.hidden=shown>=filtered.length;}
    function changed(e){if(e.target==='favorite')draw(true);}
    this.create=()=>{draw(true);Lampa.Listener.follow('state:changed',changed);};this.render=js=>js?root:window.$(root);this.start=()=>{draw(true);Lampa.Controller.add('kadr-library',{toggle:()=>{},back:()=>Lampa.Activity.backward()});Lampa.Controller.toggle('kadr-library');root.scrollTop=object.libraryScroll||0;};this.pause=()=>{object.libraryScroll=root.scrollTop;};this.stop=this.pause;this.destroy=()=>{destroyed=true;Lampa.Listener.remove('state:changed',changed);root.remove();};
  }
  function wait(){if(!window.Lampa?.Component)return setTimeout(wait,25);Lampa.Component.add('bookmarks',Library);Lampa.Component.add('favorite',Library);window.KadrCollection={open:picker};}
  wait();
})();
