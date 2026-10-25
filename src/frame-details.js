/* Кадр: desktop movie details. The native full component remains the plugin API. */
(function(){
  'use strict';
  function node(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
  function append(parent,...children){children.forEach(n=>parent.appendChild(n));return parent;}
  function button(label,cls,fn){const b=node('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
  function section(parent,title,subtitle){const s=node('section','kadr-detail-section');const h=node('header','kadr-section-heading');append(h,node('h2','',title),node('p','',subtitle));append(s,h);parent.appendChild(s);return s;}
  function picture(path,size,cls,name){const wrap=node('div',cls);if(path){const img=node('img');img.src=Lampa.TMDB.image('t/p/'+size+path);img.alt=name||'';img.loading='lazy';img.onerror=()=>{img.remove();wrap.classList.add('kadr-image-missing');};wrap.appendChild(img);}else wrap.classList.add('kadr-image-missing');return wrap;}
  function category(movie,params,title){Lampa.Activity.push(Object.assign({component:'category_full',url:movie.name?'tv':'movie',source:movie.source||'tmdb',title,page:1},params));}
  const fullEvents=new WeakMap();
  function details(e){
    if(e.type!=='complite')return;
    const host=e.object.activity.render()[0],film=host.querySelector('.kadr-film');if(!film)return;
    fullEvents.set(film,e);
    const data=e.data||{},movie=data.movie||{},scroll=film.closest('.scroll'),body=scroll?.querySelector('.scroll__body');if(!body)return;
    scroll.classList.add('kadr-page-scroll');
    body.querySelector('.kadr-film-sections')?.remove();
    const content=node('div','kadr-film-sections');body.appendChild(content);
    const info=section(content,'Детали','Контекст, из которого складывается история');
    const facts=node('div','kadr-facts');
    function chips(label,items,fn){if(!items?.length)return;const row=node('div','kadr-fact-row');append(row,node('h3','',label));const list=node('div','kadr-chips');items.forEach(x=>list.appendChild(button(x.name,'kadr-chip',()=>fn(x))));append(row,list);facts.appendChild(row);}
    chips('Жанры',movie.genres,x=>category(movie,{genres:x.id},x.name));
    chips('Производство',movie.production_companies,x=>Lampa.Activity.push({component:'company',url:movie.name?'tv':'movie',id:x.id,title:x.name,company:x,card:movie,source:'tmdb',page:1}));
    chips('Темы',(movie.keywords?.keywords||movie.keywords?.results||[]).slice(0,18),x=>category(movie,{url:'discover/'+(movie.name?'tv':'movie'),keywords:x.id},x.name));
    const extra=node('div','kadr-film-facts');
    [['Премьера',(movie.release_date||movie.first_air_date)?new Date((movie.release_date||movie.first_air_date)+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):null],['Страна',(movie.production_countries||[]).map(x=>{try{return new Intl.DisplayNames(['ru'],{type:'region'}).of(x.iso_3166_1)||x.name;}catch(_){return x.name;}}).join(', ')],['Бюджет',movie.budget?'$ '+Number(movie.budget).toLocaleString('ru-RU'):null]].forEach(([label,value])=>{if(value)append(extra,append(node('div'),node('span','',label),node('strong','',value)));});
    append(info,facts,extra);
    function people(title,items,role){if(!items.length)return;const s=section(content,title,role?'Люди, которые создали этот фильм':'Знакомые лица и новые имена');const grid=node('div','kadr-people-grid');s.appendChild(grid);
      let shown=0;function more(){items.slice(shown,shown+12).forEach(p=>{const b=button('','kadr-person',()=>Lampa.Activity.push({component:'actor',job:(p.known_for_department||'actor').toLowerCase(),id:p.id,title:p.name,source:'tmdb',page:1}));append(b,picture(p.profile_path,'w185','kadr-person-photo',p.name),append(node('span','kadr-person-caption'),node('strong','',p.name),node('small','',role||p.character||'')));grid.appendChild(b);});shown+=12;load.hidden=shown>=items.length;}
      const load=button('Показать ещё','kadr-more-button',more);s.appendChild(load);more();
    }
    people('Режиссёр',(data.persons?.crew||[]).filter(p=>p.job==='Director'),'Режиссёр');
    people('В ролях',data.persons?.cast||[]);
    function movies(title,subtitle,items){if(!items?.length)return;const s=section(content,title,subtitle),grid=node('div','kadr-related-grid');s.appendChild(grid);let shown=0;
      function more(){items.slice(shown,shown+10).forEach(m=>{const name=m.title||m.name||'Без названия';const card=button('','kadr-related-card',()=>Lampa.Activity.push({component:'full',id:m.id,method:m.name?'tv':'movie',source:m.source||'tmdb',card:Object.assign({},m,{source:m.source||'tmdb'})}));const poster=picture(m.poster_path,'w500','kadr-related-poster',name);if(Number(m.vote_average)>0)poster.appendChild(node('span','kadr-related-rating',Number(m.vote_average).toFixed(1)));append(card,poster,node('strong','',name),node('small','',(m.release_date||m.first_air_date||'').slice(0,4)+(m.name?' · Сериал':' · Фильм')));grid.appendChild(card);});shown+=10;load.hidden=shown>=items.length;}
      const load=button('Больше фильмов','kadr-more-button',more);s.appendChild(load);more();return s;
    }
    movies('Из этой коллекции','Истории, которые продолжаются',data.collection?.results);
    const recommended=movies('Рекомендуем','Что посмотреть следующим',data.recomend?.results);
    const similar=movies('Похожее','Если хочется остаться в этом настроении',data.simular?.results);
    if(recommended)content.insertBefore(recommended,info);
    if(similar)content.insertBefore(similar,info);
    // Native grouping runs after full.complete; override only the primary action afterwards.
    setTimeout(()=>{
      const play=film.querySelector('.button--play');if(!play)return;
      play.classList.remove('hide');
      window.$(play).off('hover:enter').on('hover:enter',()=>watch(film,movie));
      const book=film.querySelector('.button--book');if(book)window.$(book).off('hover:enter').on('hover:enter',()=>window.KadrCollection.open(movie,book));
    },0);
  }
  window.KadrWatch=function(film){watch(film);};
  function watch(film,movie){
    Lampa.Select.show({title:'Смотреть',items:[{title:'Трейлер',subtitle:'Познакомиться с фильмом',kind:'trailer'},{title:'Фильм',subtitle:'Выбрать источник просмотра',kind:'movie'}],onBack:()=>Lampa.Controller.toggle('content'),onSelect:item=>{
      Lampa.Select.close();Lampa.Controller.toggle('content');
      if(item.kind==='trailer'){
        const source=film.querySelector('.view--trailer');if(source)window.$(source).trigger('hover:enter');else Lampa.Noty.show('Для этого фильма трейлер пока не найден.');
      }else{
        window.KadrSources.choose(film,(fullEvents.get(film)?.data||{}).movie||movie);
      }
    }});
  }
  // A vertical wheel always belongs to the page. Native Lampa wheel handlers
  // switch focus and scroll horizontal rows; capture prevents that interception.
  function wheel(e){
    if(Lampa.Select.opened()||Lampa.Modal.opened()||document.body.classList.contains('settings--open')||document.body.classList.contains('kadr-extensions-open')||document.body.dataset.kadrPage!=='full')return;
    const scroll=e.target.closest('.kadr-page-scroll');if(!scroll)return;
    if(e.ctrlKey)return;
    e.stopImmediatePropagation();e.preventDefault();
    const delta=e.deltaY||(e.wheelDelta?-e.wheelDelta:0);
    scroll.scrollTop+=delta*(e.deltaMode===1?24:e.deltaMode===2?scroll.clientHeight:1);
  }
  document.addEventListener('wheel',wheel,{capture:true,passive:false});
  document.addEventListener('mousewheel',wheel,{capture:true,passive:false});
  function wait(){if(!window.Lampa?.Listener)return setTimeout(wait,20);Lampa.Listener.follow('full',details);}
  wait();
})();
