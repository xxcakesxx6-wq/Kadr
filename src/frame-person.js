/* Кадр: desktop person page; replaces Lampa's actor component for every entry point. */
(function(){
  'use strict';
  function el(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
  function add(n,...items){items.forEach(x=>n.appendChild(x));return n;}
  function button(text,fn,cls){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function Person(object){
    const root=el('section','kadr-person-page');let abort=new AbortController(),destroyed=false,loaded=false,credits=[],shown=0;
    const state=Object.assign({role:'all',media:'all',sort:'date',query:''},object.personState||{});
    const header=el('header','kadr-person-header'),portrait=el('div','kadr-person-portrait'),intro=el('div','kadr-person-intro');
    const name=el('h1','',object.title||'Персона'),occupation=el('p','kadr-person-job'),facts=el('div','kadr-person-facts');
    const bio=el('p','kadr-person-bio'),bioToggle=button('Читать полностью',()=>{const expanded=bio.classList.toggle('expanded');bioToggle.textContent=expanded?'Свернуть':'Читать полностью';bioToggle.setAttribute('aria-expanded',String(expanded));},'kadr-person-bio-toggle');bioToggle.hidden=true;bioToggle.setAttribute('aria-expanded','false');
    add(intro,el('span','kadr-person-eyebrow','ЛЮДИ КИНО'),name,occupation,facts,bio,bioToggle);add(header,portrait,intro);
    const work=el('section','kadr-person-works'),heading=el('header','kadr-person-works-head'),count=el('span','kadr-person-count');add(heading,el('h2','','Фильмография'),count);
    const filters=el('div','kadr-person-filters');
    function select(label,key,options){const wrap=el('label'),s=el('select');add(wrap,el('span','',label),s);s.setAttribute('aria-label',label);options.forEach(([v,t])=>{const o=el('option','',t);o.value=v;s.appendChild(o);});s.value=state[key];s.onchange=()=>{state[key]=s.value;draw();};filters.appendChild(wrap);return s;}
    const role=select('Участие','role',[['all','Все работы']]);select('Тип','media',[['all','Фильмы и сериалы'],['movie','Фильмы'],['tv','Сериалы']]);select('Порядок','sort',[['date','Сначала новые'],['rating','По рейтингу'],['popular','По популярности']]);
    const search=el('input');search.type='search';search.placeholder='Название фильма или сериала';search.setAttribute('aria-label','Найти в фильмографии');search.value=state.query;search.oninput=()=>{state.query=search.value;draw();};filters.appendChild(search);
    const grid=el('div','kadr-related-grid'),status=el('div','kadr-person-status','Загружаем фильмографию…'),more=button('Показать ещё',()=>renderBatch(),'kadr-more-button');more.hidden=true;
    add(work,heading,filters,grid,status,more);add(root,header,work);
    root.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();Lampa.Activity.backward();}});root.addEventListener('keyup',e=>e.stopPropagation());
    root.addEventListener('wheel',e=>{if(e.ctrlKey||Lampa.Select.opened()||Lampa.Modal.opened())return;e.stopImmediatePropagation();},{capture:true});
    let filtered=[];
    function draw(){
      object.personState=Object.assign({},state);shown=0;grid.replaceChildren();
      filtered=credits.filter(m=>(state.role==='all'||m.roles.has(state.role))&&(state.media==='all'||m.media_type===state.media)&&(m.title||m.name||'').toLocaleLowerCase('ru').includes(state.query.toLocaleLowerCase('ru')));
      const date=m=>Date.parse(m.release_date||m.first_air_date||'')||0;
      filtered.sort((a,b)=>state.sort==='rating'?(b.vote_average||0)-(a.vote_average||0):state.sort==='popular'?(b.popularity||0)-(a.popularity||0):date(b)-date(a));
      count.textContent=filtered.length+' '+({one:'работа',few:'работы',many:'работ',other:'работы'}[new Intl.PluralRules('ru').select(filtered.length)]);status.textContent=filtered.length?'':'По этим фильтрам ничего не нашлось.';renderBatch();
    }
    function renderBatch(){
      filtered.slice(shown,shown+24).forEach(m=>{const title=m.title||m.name||'Без названия',b=button('',()=>Lampa.Activity.push({component:'full',id:m.id,method:m.media_type,source:'tmdb',card:Object.assign({},m,{source:'tmdb'})}),'kadr-related-card');b.setAttribute('aria-label','Открыть: '+title);
        const poster=el('div','kadr-related-poster');if(m.poster_path){const img=el('img');img.src=Lampa.TMDB.image('t/p/w500'+m.poster_path);img.alt=title;img.loading='lazy';img.onerror=()=>{img.remove();poster.classList.add('kadr-image-missing');};poster.appendChild(img);}else poster.classList.add('kadr-image-missing');
        if(m.vote_average>0)poster.appendChild(el('span','kadr-related-rating',Number(m.vote_average).toFixed(1)));
        add(b,poster,el('strong','',title),el('small','',[(m.release_date||m.first_air_date||'').slice(0,4),m.media_type==='tv'?'Сериал':'Фильм',Array.from(m.characters).filter(Boolean).join(', ')].filter(Boolean).join(' · ')));grid.appendChild(b);
      });shown+=24;more.hidden=shown>=filtered.length;
    }
    async function load(){
      if(loaded||destroyed)return;loaded=true;abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),20000);
      try{
        const q=new URLSearchParams({api_key:Lampa.TMDB.key(),language:'ru-RU',append_to_response:'combined_credits'});
        const path='person/'+encodeURIComponent(object.id)+'?'+q;
        let p;if(window.KadrNetwork)p=await KadrNetwork.request(path,abort.signal);else{const response=await fetch(Lampa.TMDB.api(path),{signal:abort.signal});if(!response.ok)throw new Error('HTTP '+response.status);p=await response.json();}if(destroyed)return;
        name.textContent=p.name||object.title||'Персона';occupation.textContent=({'Acting':'Актёр / актриса','Directing':'Режиссура','Writing':'Сценарий','Production':'Продюсирование','Camera':'Операторская работа','Sound':'Музыка и звук'}[p.known_for_department]||p.known_for_department||'');
        if(p.profile_path){const img=el('img');img.src=Lampa.TMDB.image('t/p/w500'+p.profile_path);img.alt=p.name||'';img.onerror=()=>{img.remove();portrait.classList.add('kadr-image-missing');};portrait.appendChild(img);}else portrait.classList.add('kadr-image-missing');
        function fact(label,value){if(value)add(facts,add(el('div'),el('span','',label),el('strong','',value)));}
        const date=x=>x?new Date(x+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'';
        fact('Дата рождения',date(p.birthday));fact('Место рождения',p.place_of_birth);fact('Дата смерти',date(p.deathday));bio.textContent=p.biography||'Биография пока не добавлена.';bioToggle.hidden=(p.biography||'').length<360;
        const unique=new Map(),roles=new Set();const data=p.combined_credits||{};
        [...(data.cast||[]).map(m=>Object.assign({},m,{kadrRole:'cast'})),...(data.crew||[]).map(m=>Object.assign({},m,{kadrRole:m.job==='Director'?'director':m.job==='Writer'||m.job==='Screenplay'||m.department==='Writing'?'writer':m.department==='Production'?'producer':'crew'}))].forEach(m=>{
          if(!['movie','tv'].includes(m.media_type))return;const key=m.media_type+':'+m.id;let item=unique.get(key);if(!item){item=Object.assign({},m,{roles:new Set(),characters:new Set()});unique.set(key,item);}item.roles.add(m.kadrRole);roles.add(m.kadrRole);if(m.character)item.characters.add(m.character);
        });credits=Array.from(unique.values());
        const labels={cast:'В ролях',director:'Режиссура',writer:'Сценарий',producer:'Продюсирование',crew:'Другие работы'};
        Object.keys(labels).filter(k=>roles.has(k)).forEach(k=>{const o=el('option','',labels[k]);o.value=k;role.appendChild(o);});if(!roles.has(state.role))state.role='all';role.value=state.role;draw();
      }catch(e){if(destroyed)return;loaded=false;status.replaceChildren(el('p','','Не удалось загрузить страницу. Проверь подключение к каталогу.'),button('Повторить',load,'kadr-more-button'));}finally{clearTimeout(timeout);}
    }
    this.create=load;this.render=js=>js?root:window.$(root);this.start=()=>{load();Lampa.Controller.add('kadr-person',{toggle:()=>{},back:()=>Lampa.Activity.backward()});Lampa.Controller.toggle('kadr-person');};this.pause=()=>{};this.stop=this.pause;this.destroy=()=>{destroyed=true;abort.abort();root.remove();};
  }
  function wait(){if(!window.Lampa?.Component)return setTimeout(wait,25);Lampa.Component.add('actor',Person);}
  wait();
})();
