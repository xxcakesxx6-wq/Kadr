/* КАДР: desktop catalog. The original Lampa full component and plugin API remain intact. */
(function () {
  'use strict';
  window.start_deep_link = {component: 'frame', title: 'Каталог', page: 1};
  const commonGenres=[[28,'Боевик'],[12,'Приключения'],[16,'Анимация'],[35,'Комедия'],[80,'Криминал'],[99,'Документальный'],[18,'Драма'],[14,'Фэнтези'],[27,'Ужасы'],[9648,'Детектив'],[10749,'Мелодрама'],[878,'Фантастика'],[53,'Триллер'],[10752,'Военный'],[37,'Вестерн'],[36,'Исторический'],[10402,'Музыка'],[10751,'Семейный']];
  const genres={movie:commonGenres,tv:commonGenres};
  const categories={movie:'Фильмы',tv:'Сериалы',cartoon:'Мультфильмы',anime:'Аниме',drama:'Дорамы'};
  const studios=[{"id":"disney","name":"Disney","companies":[6125,5391,3475],"logo":"img/studios/disney.png"},{"id":"pixar","name":"Pixar","companies":[3],"logo":"img/studios/pixar.png"},{"id":"dreamworks","name":"DreamWorks","companies":[521,42141],"logo":"img/studios/dreamworks.png"},{"id":"illumination","name":"Illumination","companies":[6704],"logo":"img/studios/illumination.png"},{"id":"sony","name":"Sony Animation","companies":[2251],"logo":"img/studios/sony.png"},{"id":"bluesky","name":"Blue Sky","companies":[9383],"logo":"img/studios/bluesky.png"},{"id":"soyuzmultfilm","name":"Союзмультфильм","companies":[14599,7501,52303],"logo":"img/studios/soyuzmultfilm.png"},{"id":"melnitsa","name":"Мельница","companies":[5306],"logo":"img/studios/melnitsa.png"}];
  const dramaCountries=['KR','JP','CN','TW','TH'];
  function categoryMatch(data,category){
    const animation=(data.genre_ids||[]).includes(16);
    if(category==='anime')return animation&&data.original_language==='ja';
    if(category==='cartoon')return animation&&data.original_language!=='ja';
    if(category==='drama')return !animation&&(data.origin_country||[]).some(c=>dramaCountries.includes(c))&&!(data.genre_ids||[]).some(g=>[99,10763,10764,10767].includes(g));
    return !animation;
  }
  // Common UI labels map to TMDB's separate TV classification. Keywords use OR.
  const tvRules={
    28:{genre:10759,note:'В базе сериалов боевик и приключения объединены в один жанр.'},
    12:{genre:10759,note:'В базе сериалов боевик и приключения объединены в один жанр.'},
    14:{genre:10765,keywords:'293198',note:'Фэнтези: тематический поиск по тегам сериалов. Разметка базы может быть неполной.'},
    878:{genre:10765,keywords:'281358',note:'Фантастика: тематический поиск по тегам сериалов. Разметка базы может быть неполной.'},
    27:{keywords:'315058',note:'Ужасы: тематический поиск по тегам сериалов. Разметка базы может быть неполной.'},
    53:{keywords:'316362|12565',note:'Триллер: тематический поиск по тегам сериалов. Разметка базы может быть неполной.'},
    10749:{keywords:'9840',note:'Мелодрама: тематический поиск по тегам о романтических отношениях.'},
    10752:{genre:10768,note:'В базе сериалов военный и политический жанры объединены.'},
    36:{keywords:'282633',note:'Исторический: тематический поиск по тегам сериалов.'},
    10402:{keywords:'283297',note:'Музыка: тематический поиск по тегам сериалов.'}
  };
  function genreRule(media,id){return id?(media==='tv'&&tvRules[id]||{genre:Number(id)}):{};}
  const moods={
    short:{title:'До 90 минут',note:'Фильмы от 45 до 90 минут · оценка от 6',params:{'with_runtime.gte':45,'with_runtime.lte':90}},
    energy:{title:'Бодрое',note:'Боевики, приключения и триллеры · 80–125 минут',params:{with_genres:'28|12|53',without_genres:'99|18','with_runtime.gte':80,'with_runtime.lte':125}},
    dark:{title:'Мрачное',note:'Криминал, триллеры, детективы и ужасы · без комедий',params:{with_genres:'80|53|9648|27',without_genres:'35|10751','with_runtime.gte':80,'with_runtime.lte':160}},
    funny:{title:'Смешное',note:'Комедии · 70–125 минут · без ужасов и военных',params:{with_genres:'35',without_genres:'27|10752','with_runtime.gte':70,'with_runtime.lte':125}},
    together:{title:'На двоих',note:'Романтическое кино · 80–125 минут · без ужасов и военных',params:{with_genres:'10749',without_genres:'27|10752','with_runtime.gte':80,'with_runtime.lte':125}}
  };
  const paths = {
    grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    film:'M4 3h16v18H4z M4 8h16 M4 16h16 M8 3v18 M16 3v18',
    bookmark:'M6 3h12v18l-6-4-6 4Z',
    clock:'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
    sliders:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
    plus:'M12 4v16 M4 12h16',
    arrow:'m14 6-6 6 6 6',
    plug:'M8 3v5 M16 3v5 M6 8h12v4a6 6 0 0 1-12 0Z M12 18v4'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>'; }
  function el(tag, cls, text) {
    const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text;
    // Lampa replaces Element.append with a single-child helper. Keep standard variadic behavior locally.
    n.append=function(){Array.from(arguments).forEach(child=>n.appendChild(typeof child==='string'?document.createTextNode(child):child));};
    return n;
  }
  function button(text, cls, fn, ico) {const b=el('button',cls); b.type='button'; if(ico)b.innerHTML=icon(ico); b.append(el('span','',text)); if(fn)b.addEventListener('click',fn); return b;}
  function wait() {
    if(!window.Lampa || !Lampa.Component || !Lampa.TMDB || !Lampa.Storage) return setTimeout(wait,40);
    Lampa.Component.add('frame', Catalog);
    document.body.classList.add('frame-theme');
    Lampa.Listener.follow('activity', function(e){
      if(e.type==='start') document.body.classList.toggle('frame-mode',e.component==='frame');
    });
  }
  function Catalog(object) {
    const self=this;
    const root=el('section','frame-catalog');
    // Lampa's TV keypad suppresses ordinary typing and Tab; retain native desktop controls here.
    root.addEventListener('keydown',function(e){
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();if(!filters.hidden){setFilters(false,true);return;}Lampa.Activity.backward();}
      if(e.target.classList.contains('frame-card') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        const cards=Array.from(root.querySelectorAll('.frame-card'));const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key];const target=cards[cards.indexOf(e.target)+delta];
        if(target){e.preventDefault();target.focus();}
      }
    });
    root.addEventListener('keyup',function(e){e.stopPropagation();});
    const state=Object.assign({media:'movie',tab:'catalog',genre:'',year:'',country:'',rating:'',sort:'popularity.desc',query:'',mood:'',page:1},object.frameState||{});
    if(!studios.some(s=>s.id===state.studio))state.studio='';
    if(!categories[state.category])state.category=state.media==='tv'?'tv':'movie';
    if(state.category==='movie'||state.category==='tv')state.media=state.category;
    if(state.category==='drama')state.media='tv';
    if(!moods[state.mood])state.mood='';
    if(state.mood){state.media='movie';state.category='movie';}
    if(state.tab==='categories')state.tab='catalog';
    if(state.media==='tv')state.genre=String({10759:28,10765:878,10768:10752}[state.genre]||state.genre);
    let controller, destroyed=false, ticket=0, totalPages=1, totalResults=0, items=[], busy=false;
    const aside=el('aside','frame-sidebar');
    const brand=el('div','frame-brand'); brand.innerHTML='<div class="frame-mark"><i></i><i></i></div><span>кадр<span class="frame-brand-dot">.</span></span>';
    brand.setAttribute('role','button');brand.tabIndex=0;brand.title='Меню приложения';brand.setAttribute('aria-label','Открыть меню приложения');
    brand.addEventListener('click',()=>Lampa.Controller.toggle('menu'));
    brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();Lampa.Controller.toggle('menu');}});
    aside.append(brand,el('div','frame-sidebar-caption','ЛИЧНЫЙ КИНОЗАЛ'));
    const nav=el('nav','frame-nav');
    const navButtons={};
    [['catalog','Каталог','grid'],['new','Новинки','spark']].forEach(([id,title,ico])=>{
      navButtons[id]=button(title,'frame-nav-button',()=>{state.tab=id;state.query='';search.value='';state.genre='';genre.value='';state.sort=id==='new'?'primary_release_date.desc':'popularity.desc';sort.value=state.sort;updateTabs();load(true);},ico);nav.append(navButtons[id]);
    });
    aside.append(nav,el('div','frame-sidebar-caption frame-library-caption','МОЯ КОЛЛЕКЦИЯ'));
    function nativeMenu(action) {const target=document.querySelector('.menu__item[data-action="'+action+'"]');if(target) window.$(target).trigger('hover:enter');}
    aside.append(button('Избранное','frame-nav-button',()=>nativeMenu('favorite'),'bookmark'),button('История','frame-nav-button',()=>nativeMenu('history'),'clock'));
    const bottom=el('div','frame-sidebar-bottom');
    bottom.append(button('Настройки','frame-nav-button',()=>Lampa.Controller.toggle('settings'),'settings'),el('div','frame-build','КАДР / DESKTOP · 1.0.0'));
    aside.append(bottom);
    const main=el('main','frame-main');
    const top=el('header','frame-top');
    const media=el('div','frame-media');
    const categoryButtons={};
    Object.entries(categories).forEach(([id,label])=>{const b=button(label,'',()=>setCategory(id));b.setAttribute('aria-pressed','false');categoryButtons[id]=b;media.append(b);});
    const format=el('div','frame-format');format.setAttribute('role','group');format.setAttribute('aria-label','Формат');
    const formatButtons={};
    [['movie','Фильмы'],['tv','Сериалы']].forEach(([value,label])=>{
      const b=button(label,'frame-format-button',()=>{if(state.media===value)return;state.media=value;state.genre='';syncMedia();updateTabs();load(true);});
      b.setAttribute('aria-pressed','false');formatButtons[value]=b;format.append(b);
    });
    const searchForm=el('form','frame-search');searchForm.setAttribute('role','search');
    searchForm.innerHTML=icon('search');
    const search=el('input');search.type='search';search.placeholder='Найти фильм, сериал…';search.setAttribute('aria-label','Поиск по названию');search.value=state.query;
    const searchGo=button('Найти','frame-search-submit');searchGo.type='submit';
    searchForm.append(search,searchGo);searchForm.addEventListener('submit',e=>{e.preventDefault();state.mood='';state.query=search.value.trim();load(true);});
    top.append(media,searchForm);
    const heading=el('div','frame-heading');
    const headingText=el('div');const eyebrow=el('div','frame-eyebrow','ХОРОШИЙ ВЕЧЕР НАЧИНАЕТСЯ С ВЫБОРА');const title=el('h1','','Что посмотрим?');const sub=el('p','','Большое кино. Ничего лишнего.');headingText.append(eyebrow,title,sub);
    const filterToggle=button('Фильтры','frame-filter-toggle',()=>setFilters(filters.hidden),'sliders');filterToggle.setAttribute('aria-expanded','false');
    const filters=el('form','frame-filters');filters.hidden=true;filters.id='frame-catalog-filters';filterToggle.setAttribute('aria-controls',filters.id);filters.addEventListener('submit',e=>e.preventDefault());
    const filterDock=el('div','frame-filter-dock');filterDock.append(filterToggle,filters);top.append(filterDock);
    headingText.append(format);heading.append(headingText);
    function setFilters(open,focus){filters.hidden=!open;filterToggle.setAttribute('aria-expanded',String(open));if(open)genre.focus();else if(focus)filterToggle.focus();}
    function closeFiltersOutside(e){if(!filters.hidden&&!filterDock.contains(e.target))setFilters(false);}
    document.addEventListener('click',closeFiltersOutside);
    function select(label, values, key){const wrap=el('label','frame-select');wrap.append(el('span','',label));const s=el('select');s.setAttribute('aria-label',label);values.forEach(([v,t])=>{const opt=el('option','',t);opt.value=v;s.append(opt);});s.value=state[key];s.addEventListener('change',()=>{state.mood='';state[key]=s.value;load(true);});wrap.append(s);filters.append(wrap);return s;}
    const genre=select('Жанр',[['','Все жанры']].concat(genres[state.media]),'genre');
    const years=[['','Все годы']];for(let y=new Date().getFullYear();y>=1920;y--)years.push([String(y),String(y)]);
    const year=select('Год',years,'year');
    const country=select('Страна',[['','Все страны'],['US','США'],['GB','Великобритания'],['RU','Россия'],['FR','Франция'],['DE','Германия'],['KR','Южная Корея'],['JP','Япония'],['CN','Китай'],['TW','Тайвань'],['TH','Таиланд'],['IT','Италия'],['ES','Испания'],['CA','Канада'],['IN','Индия'],['AU','Австралия']],'country');
    const rating=select('Рейтинг',[['','Любой'],['9','От 9'],['8','От 8'],['7','От 7'],['6','От 6'],['5','От 5']],'rating');
    const sort=select('Порядок',[['popularity.desc','По популярности'],['vote_average.desc','По рейтингу'],['primary_release_date.desc','Сначала новые'],['primary_release_date.asc','Сначала старые']],'sort');
    sort.parentElement.classList.add('frame-sort');top.append(sort.parentElement);
    function resetFilters(){state.mood='';state.genre=state.year=state.country=state.rating=state.query='';state.sort=state.tab==='new'?'primary_release_date.desc':'popularity.desc';genre.value=year.value=country.value=rating.value=search.value='';sort.value=state.sort;load(true);}
    filters.append(button('Сбросить','frame-reset',resetFilters),button('Готово','frame-filter-done',()=>setFilters(false,true)));
    const chips=el('div','frame-active-filters');chips.setAttribute('aria-label','Применённые фильтры');
    const evening=el('section','frame-evening');
    const eveningHeading=el('div','frame-evening-heading');eveningHeading.append(el('h2','','Что посмотреть сегодня?'),el('span','','Выбери настроение — предложим 8 фильмов'));
    const moodButtons=el('div','frame-moods');
    Object.entries(moods).forEach(([id,m])=>{const b=button(m.title,'frame-mood',()=>{
      const next=state.mood===id?'':id;state.media='movie';state.category='movie';resetFields();state.mood=next;state.tab='catalog';state.sort='popularity.desc';sort.value=state.sort;syncMedia();updateTabs();setFilters(false);load(true);
    });b.dataset.mood=id;b.setAttribute('aria-pressed','false');moodButtons.append(b);});
    evening.append(eveningHeading,moodButtons);
    function resetFields(){state.genre=state.year=state.country=state.rating=state.query='';genre.value=year.value=country.value=rating.value=search.value='';}
    function renderChips(){
      chips.replaceChildren();
      const fields={genre,year,country,rating};
      Object.entries(fields).forEach(([key,field])=>{if(!state[key])return;const label=field.selectedOptions[0]?.textContent||state[key];const b=button(label+' ×','frame-filter-chip',()=>{state[key]='';field.value='';load(true);});b.setAttribute('aria-label','Убрать фильтр: '+label);chips.append(b);});
      if(state.query){const b=button('«'+state.query+'» ×','frame-filter-chip',()=>{state.query=search.value='';load(true);});b.setAttribute('aria-label','Убрать поиск');chips.append(b);}
      chips.hidden=!chips.childNodes.length;
      moodButtons.querySelectorAll('button').forEach(b=>{const active=b.dataset.mood===state.mood;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      filterToggle.querySelector('span').textContent='Фильтры'+(Object.values(fields).filter(f=>f.value).length?' · '+Object.values(fields).filter(f=>f.value).length:'');
    }
    const studioShelf=el('section','frame-studios');studioShelf.setAttribute('aria-label','Подборки по студиям');
    const studioHead=el('div','frame-studios-head');studioHead.append(el('h2','','Любимые студии'));
    const allStudios=button('Все студии','frame-studios-all',()=>chooseStudio(''));allStudios.setAttribute('aria-pressed','true');studioHead.append(allStudios);
    const studioGrid=el('div','frame-studio-grid');const studioButtons={};
    studios.forEach(studio=>{
      const tile=button('','frame-studio-tile',()=>chooseStudio(studio.id));tile.setAttribute('aria-label',studio.name);tile.setAttribute('aria-pressed','false');
      const plate=el('div','frame-studio-logo');const img=el('img');img.src=studio.logo;img.alt='';img.draggable=false;
      img.addEventListener('error',()=>{img.hidden=true;plate.textContent=studio.name;plate.classList.add('frame-studio-logo-fallback');},{once:true});
      plate.append(img);tile.replaceChildren();tile.append(plate,el('span','frame-studio-name',studio.name));studioGrid.append(tile);studioButtons[studio.id]=tile;
    });studioShelf.append(studioHead,studioGrid);
    function selectedStudio(){return state.category==='cartoon'?studios.find(s=>s.id===state.studio):null;}
    function syncStudios(){studioShelf.hidden=state.category!=='cartoon';allStudios.classList.toggle('active',!state.studio);allStudios.setAttribute('aria-pressed',String(!state.studio));Object.entries(studioButtons).forEach(([id,b])=>{b.classList.toggle('active',state.studio===id);b.setAttribute('aria-pressed',String(state.studio===id));});}
    function chooseStudio(id){if(state.studio===id)return;state.studio=id;syncStudios();load(true);}
    const genreNote=el('p','frame-genre-note');genreNote.setAttribute('role','status');
    const section=el('div','frame-section');const resultLabel=el('div','frame-result-label','Популярное сейчас');const resultCount=el('div','frame-result-count');section.append(resultLabel,resultCount);
    const grid=el('div','frame-grid');grid.setAttribute('aria-live','polite');
    const status=el('div','frame-status');status.setAttribute('role','status');
    const more=button('Показать ещё','frame-more',()=>{if(state.mood)load(true,state.page>=totalPages?1:state.page+1);else{state.page++;load(false);}});more.hidden=true;
    const foot=el('footer','frame-footer');foot.append(el('span','','Кино — в центре внимания.'),el('span','','Данные и изображения: TMDB'));
    main.append(top,chips,heading,studioShelf,evening,genreNote,section,grid,status,more,foot);root.append(aside,main);
    function save(){object.frameState=Object.assign({},state);window.dispatchEvent(new CustomEvent('frame:state',{detail:{tab:state.tab}}));}
    function navigate(e){if(Lampa.Activity.active()?.component!=='frame')return;Object.assign(state,{mood:'',tab:e.detail.tab==='new'?'new':'catalog',query:e.detail.query||'',genre:'',sort:e.detail.tab==='new'?'primary_release_date.desc':'popularity.desc'});search.value=state.query;genre.value='';sort.value=state.sort;updateTabs();load(true);}
    window.addEventListener('frame:navigate',navigate);
    function syncMedia(){genre.replaceChildren();[['','Все жанры']].concat(genres[state.media]).forEach(([v,t])=>{const o=el('option','',t);o.value=v;genre.append(o);});genre.value=state.genre;Object.entries(categoryButtons).forEach(([id,b])=>{b.classList.toggle('active',id===state.category);b.setAttribute('aria-pressed',String(id===state.category));});format.hidden=!['cartoon','anime'].includes(state.category);Object.entries(formatButtons).forEach(([id,b])=>{b.classList.toggle('active',id===state.media);b.setAttribute('aria-pressed',String(id===state.media));});}
    function setCategory(value){if(state.category===value&&!state.mood)return;state.category=value;state.studio='';state.media=value==='tv'||value==='drama'||value==='anime'?'tv':'movie';state.mood='';resetFields();syncMedia();updateTabs();load(true);}
    function updateTabs(){syncStudios();evening.hidden=state.tab==='new'||state.category!=='movie';Object.keys(navButtons).forEach(k=>navButtons[k].classList.toggle('active',state.tab===k));title.textContent=state.tab==='new'?'Новинки · '+categories[state.category]:categories[state.category];sub.textContent=state.tab==='new'?'Недавние премьеры. В порядке выхода.':'Большое кино. Ничего лишнего.';}
    async function api(path,params,signal){
      const p=new URLSearchParams(Object.assign({api_key:Lampa.TMDB.key(),language:'ru-RU'},params));
      if(window.KadrNetwork)return KadrNetwork.request(path+'?'+p,signal);
      const response=await fetch(Lampa.TMDB.api(path+'?'+p),{signal});if(!response.ok)throw new Error('HTTP '+response.status);return response.json();
    }
    function skeleton(){for(let i=0;i<10;i++){const n=el('div','frame-skeleton');n.append(el('div'),el('span'));grid.append(n);}}
    function card(data){
      data.source='tmdb'; const b=el('button','frame-card');b.type='button';b.setAttribute('aria-label','Открыть: '+(data.title||data.name));
      const poster=el('div','frame-poster');
      if(data.poster_path){const img=el('img');img.src=Lampa.TMDB.image('t/p/w500'+data.poster_path);img.alt=data.title||data.name;img.loading='lazy';img.addEventListener('error',()=>{img.remove();poster.classList.add('frame-no-poster');poster.append(el('span','',data.title||data.name));},{once:true});poster.append(img);}else{poster.classList.add('frame-no-poster');poster.append(el('span','',data.title||data.name));}
      if(data.vote_average>0){const badge=el('span','frame-rating',Number(data.vote_average).toFixed(1));poster.append(badge);}
      const hover=el('div','frame-card-hover');hover.innerHTML=icon('plus');hover.append(el('span','',state.media==='tv'?'О сериале':'О фильме'));poster.append(hover);
      const info=el('div','frame-card-info');info.append(el('h2','',data.title||data.name||'Без названия'));
      const year=(data.release_date||data.first_air_date||'').slice(0,4);const cardGenres=state.media==='tv'?[[10759,'Боевик и приключения'],[10765,'Фантастика и фэнтези'],[10768,'Война и политика']].concat(commonGenres.filter(g=>!tvRules[g[0]])):commonGenres;const genreInfo=cardGenres.find(g=>(data.genre_ids||[]).includes(g[0]));info.append(el('p','',[year,genreInfo&&genreInfo[1]].filter(Boolean).join(' · ')));
      b.append(poster,info);b.addEventListener('click',()=>{save();Lampa.Activity.push({component:'full',id:data.id,method:state.media,source:'tmdb',card:data});});return b;
    }
    async function load(reset,moodPage){
      if(reset){state.page=moodPage||1;items=[];grid.replaceChildren();skeleton();main.scrollTop=0;}else if(busy){state.page--;return;}
      renderChips();save();sort.disabled=Boolean(state.query);busy=true;more.disabled=true;more.hidden=true;status.replaceChildren();const seq=++ticket;if(controller)controller.abort();controller=new AbortController();
      let timedOut=false;const requestController=controller;const timeout=setTimeout(()=>{timedOut=true;requestController.abort();},20000);
      let path='discover/'+state.media;
      const params={page:state.page,include_adult:'false',sort_by:state.sort,'vote_count.gte':state.sort==='vote_average.desc'?100:10};
      if(state.media==='tv') params.sort_by=state.sort.replace('primary_release_date','first_air_date');
      const today=new Date().toLocaleDateString('en-CA');
      params[state.media==='tv'?'first_air_date.lte':'primary_release_date.lte']=today;
      if(state.tab==='new'){const d=new Date();d.setMonth(d.getMonth()-6);params[state.media==='tv'?'first_air_date.gte':'primary_release_date.gte']=d.toISOString().slice(0,10);}
      const rule=genreRule(state.media,state.genre);
      const categoryNote=state.category==='anime'?'Японская анимация · фильмы и сериалы':state.category==='cartoon'?'Анимация · японское аниме вынесено в отдельный раздел':state.category==='drama'?'Игровые сериалы: Южная Корея, Япония, Китай, Тайвань и Таиланд':'';
      genreNote.textContent=[categoryNote,rule.note].filter(Boolean).join(' · ');genreNote.hidden=!genreNote.textContent;
      if(rule.genre)params.with_genres=rule.genre;
      if(rule.keywords)params.with_keywords=rule.keywords;
      if(state.country)params.with_origin_country=state.country;
      if(state.rating)params['vote_average.gte']=state.rating;
      if(state.year)params[state.media==='tv'?'first_air_date_year':'primary_release_year']=state.year;
      if(state.category==='cartoon'||state.category==='anime'){
        params.with_genres=rule.genre&&rule.genre!==16?'16,'+rule.genre:'16';
        if(state.category==='anime')params.with_original_language='ja';
      }else params.without_genres=state.category==='drama'?'16,99,10763,10764,10767':'16';
      if(state.category==='drama')params.with_origin_country=state.country?(dramaCountries.includes(state.country)?state.country:'ZZ'):dramaCountries.join('|');
      const studio=selectedStudio();if(studio)params.with_companies=studio.companies.join('|');
      if(state.query){path='search/'+state.media;params.query=state.query;delete params.sort_by;if(state.year)params[state.media==='tv'?'first_air_date_year':'primary_release_year']=state.year;}
      if(state.mood){Object.assign(params,{'vote_average.gte':6,'vote_count.gte':200,include_video:'false'},moods[state.mood].params);genreNote.textContent=moods[state.mood].note+' · минимум 200 оценок TMDB';genreNote.hidden=false;}
      try{
        const result=await api(path,params,controller.signal);if(seq!==ticket||destroyed)return;
        if(reset)grid.replaceChildren();let found=result.results||[];if(state.mood)found=found.filter(d=>d.poster_path).slice(0,8);
        // TMDB text search has no genre/country/rating filtering. Filter each page honestly.
        if(state.query){
          found=found.filter(d=>(!rule.genre||(d.genre_ids||[]).includes(rule.genre))&&(!state.rating||d.vote_average>=Number(state.rating))&&(!state.country||state.media==='movie'||(d.origin_country||[]).includes(state.country)));
          if(studio||rule.keywords||(state.country&&state.media==='movie')){
            const candidates=await Promise.all(found.map(async d=>{const details=await api(state.media+'/'+d.id,{append_to_response:'keywords'},requestController.signal);const tags=details.keywords?.results||details.keywords?.keywords||[];const matchesKeywords=!rule.keywords||rule.keywords.split('|').some(id=>tags.some(t=>String(t.id)===id));const matchesCountry=!state.country||state.media!=='movie'||(details.production_countries||[]).some(c=>c.iso_3166_1===state.country);const matchesStudio=!studio||(details.production_companies||[]).some(c=>studio.companies.includes(c.id));return matchesKeywords&&matchesCountry&&matchesStudio?d:null;}));
            if(seq!==ticket||destroyed)return;found=candidates.filter(Boolean);
          }
        }
        found=found.filter(d=>categoryMatch(d,state.category));
        const known=new Set(items.map(d=>d.id));found=found.filter(d=>!known.has(d.id));items=items.concat(found);found.forEach(d=>grid.append(card(d)));
        totalPages=Math.min(result.total_pages||1,500);totalResults=result.total_results||0;
        const filteredSearch=Boolean(state.query)||state.category==='cartoon';resultCount.textContent=filteredSearch?'Показано: '+items.length+' · фильтры по загруженным страницам':totalResults.toLocaleString('ru-RU')+' результатов';
        if(state.mood)resultCount.textContent=items.length+' фильмов для вечера';
        resultLabel.textContent=state.mood?moods[state.mood].title:state.query?'Поиск: «'+state.query+'»':state.tab==='new'?'Премьеры за последние 6 месяцев':state.genre?(genres[state.media].find(g=>String(g[0])===state.genre)||[])[1]:({'vote_average.desc':'По рейтингу','primary_release_date.desc':'Сначала новые','primary_release_date.asc':'Сначала старые'}[state.sort]||'Популярное сейчас');
        if(studio)resultLabel.textContent=studio.name+' · '+resultLabel.textContent;
        if(!items.length)status.append(el('h2','','Пока ничего не нашлось'),el('p','',state.page<totalPages?'На этой странице совпадений нет. Попробуй загрузить ещё или ослабить фильтры.':'Попробуй другое название или сбрось фильтры.'));
        more.hidden=state.mood?totalPages<=1:state.page>=totalPages;more.textContent=state.mood?'Другие варианты':'Показать ещё';
      }catch(error){
        if((error.name==='AbortError'&&!timedOut)||seq!==ticket||destroyed)return;
        const code=timedOut?'ERR_TIMED_OUT':error.netCode||error.message;
        console.error('Кадр: загрузка',code);
        if(reset)grid.replaceChildren();else state.page--;
        const description=window.KadrNetwork?.message(code)||'Проверь подключение к TMDB.';
        const retry=button('Повторить','frame-retry',async()=>{retry.disabled=true;try{window.KadrNetwork?.forgetRoute();await window.api?.networkReset?.();}catch{}if(!destroyed){if(!reset)state.page++;load(reset,moodPage);}});
        status.append(el('h2','','Не удалось загрузить каталог'),el('p','',description),el('p','frame-network-code',code),retry);
        if(window.KadrNetwork)status.append(button('Проверить соединение','frame-retry',()=>KadrNetwork.open()));
      }
      finally{clearTimeout(timeout);if(seq===ticket){busy=false;more.disabled=false;save();}}
    }
    this.create=function(){syncMedia();updateTabs();load(true);};
    this.render=function(js){return js?root:window.$(root);};
    this.start=function(){document.body.classList.add('frame-mode');Lampa.Controller.add('frame',{toggle:function(){},back:function(){Lampa.Activity.backward();}});Lampa.Controller.toggle('frame');};
    this.pause=function(){document.body.classList.remove('frame-mode');};
    this.stop=this.pause;
    this.destroy=function(){destroyed=true;ticket++;if(controller)controller.abort();window.removeEventListener('frame:navigate',navigate);document.removeEventListener('click',closeFiltersOutside);root.remove();};
    this.resize=function(){};
  }
  wait();
})();
