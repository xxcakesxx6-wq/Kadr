/* Кадр 1.0.0 — shared application shell, film layout and preferences.
 * Native selectors/events are an adapter for Lampa plugins, not the visual UI.
 */
(function(){
  'use strict';
  const svg={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',film:'M4 3h16v18H4z M4 8h16 M4 16h16 M8 3v18 M16 3v18',bookmark:'M6 3h12v18l-6-4-6 4Z',clock:'M12 7v6l4 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',plug:'M8 3v5 M16 3v5 M6 8h12v4a6 6 0 0 1-12 0Z M12 18v4',search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',back:'m14 6-6 6 6 6',close:'m6 6 12 12 M6 18 18 6',play:'m9 5 11 7-11 7Z',chevron:'m9 6 6 6-6 6',globe:'M3 12h18 M12 3c5 6 5 12 0 18-5-6-5-12 0-18 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',sliders:'M4 7h16 M4 17h16 M8 4v6 M16 14v6'};
  function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(svg[name]||svg.grid)+'"/></svg>';}
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function add(n,...children){children.forEach(c=>n.appendChild(c));return n;}
  function btn(text,cls,action,ico){const n=el('button',cls);n.type='button';if(cls==='kadr-nav-button'||cls==='kadr-brand'){n.title=text;n.setAttribute('aria-label',text);}if(ico)n.innerHTML=icon(ico);add(n,el('span','',text));n.addEventListener('click',action);return n;}
  function desktopKeys(n){n.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();Lampa.Controller.back();}});n.addEventListener('keyup',e=>e.stopPropagation());}
  function resume(){if(document.querySelector('.extensions'))Lampa.Controller.back();Lampa.Controller.toggle('content');const a=Lampa.Activity.active();if(a&&a.activity)a.activity.toggle();}
  function catalog(tab,query){
    resume();const a=Lampa.Activity.active();
    if(a&&a.component==='frame')window.dispatchEvent(new CustomEvent('frame:navigate',{detail:{tab:tab||'catalog',query:query||''}}));
    else Lampa.Activity.push({component:'frame',title:'Каталог',page:1,frameState:{tab:tab||'catalog',query:query||''}});
  }
  function settings(component){
    if(component&&!visiblePreferences.has(component))component=undefined;
    if(document.querySelector('.extensions'))Lampa.Controller.back();
    Lampa.Controller.toggle('settings');
    if(component){const target=Lampa.Settings.main().render().find('[data-component="'+component+'"]');if(target.length)target.trigger('hover:enter');}
  }
  function nativeMenu(action){resume();const target=document.querySelector('.menu__item[data-action="'+action+'"]');if(target)window.$(target).trigger('hover:enter');}
  const preferences={
    interface:['Внешний вид','Размеры, оформление и поведение интерфейса','sliders'],
    player:['Воспроизведение','Плеер, дорожки, субтитры и продолжение просмотра','play'],
    desktop_app:['Подключение','Помощь, если не загружаются каталог или постеры','globe'],
    parser:['Источники','Поиск раздач и подключение сервисов','search'],
    server:['TorrServer','Сервер для воспроизведения торрентов','film'],
    tmdb:['Каталог и постеры','Язык данных и подключение к TMDB','grid'],
    account:['Синхронизация','Аккаунт, закладки и история','bookmark'],
    more:['Данные и обслуживание','Хранилище и дополнительные параметры','settings']
  };
  preferences.torrserver=preferences.server;
  preferences.iptv=['ТВ-каналы','Плейлисты и телевизионные трансляции','film'];
  preferences.data=['Хранилище','Кэш, история и сохранённые данные','settings'];
  preferences.remote_configuration=['Перенос настроек','Импорт конфигурации приложения','plug'];
  const visiblePreferences=new Set(['interface','player','desktop_app']);
  const simpleFields={player:new Set(['player_normalization','playlist_next','subtitles_start','subtitles_lang','video_quality_default']),desktop_app:new Set(['desktop_connection'])};
  let shell,contextTitle,prefsTitle,prefsDescription;
  function installTemplates(){
    Lampa.Template.add('settings_interface',`<div></div>`);
    [
      {param:{name:'frame_poster_size',type:'select',values:{'196':'Крупные','230':'Очень крупные','270':'Максимальные'},default:'196'},field:{name:'Размер постеров',description:'Плотность сетки каталога. Размер меняется сразу.'}},
      {param:{name:'frame_show_ratings',type:'trigger',default:true},field:{name:'Рейтинги на постерах',description:'Показывать оценку TMDB в каталоге.'}},
      {param:{name:'frame_show_metadata',type:'trigger',default:true},field:{name:'Год и жанр под постером'}},
      {param:{name:'frame_motion',type:'trigger',default:true},field:{name:'Плавные переходы',description:'Эффекты при наведении и загрузке.'}}
    ].forEach(p=>Lampa.SettingsApi.addParam(Object.assign({component:'interface',onChange:applyAppearance},p)));
    Lampa.Template.add('full_start_new',`<section class="full-start-new kadr-film">
      <div class="kadr-film-banner"><img class="kadr-film-backdrop" alt=""/><div class="kadr-film-banner-shade"></div><span class="kadr-film-banner-label">ВЕЧЕР ДЛЯ ХОРОШЕГО КИНО</span></div>
      <div class="full-start-new__body kadr-film-layout">
        <aside class="full-start-new__left"><div class="full-start-new__poster"><img class="full-start-new__img full--poster"/></div><div class="kadr-film-original">{original_title}</div></aside>
        <div class="full-start-new__right">
          <div class="kadr-film-eyebrow"><span class="kadr-film-kind">ФИЛЬМ</span><span class="full-start-new__head"></span></div>
          <h1 class="full-start-new__title">{title}</h1>
          <div class="full-start-new__tagline full--tagline">{tagline}</div>
          <div class="full-start-new__rate-line kadr-film-ratings">
            <div class="full-start__rate rate--tmdb"><div>{rating}</div><div class="source--name">TMDB</div></div>
            <div class="full-start__rate rate--imdb hide"><div></div><div>IMDb</div></div>
            <div class="full-start__rate rate--kp hide"><div></div><div>Кинопоиск</div></div>
            <div class="full-start__pg hide"></div><div class="full-start__status hide"></div>
          </div>
          <div class="full-start-new__details"></div>
          <p class="kadr-film-overview"></p>
          <div class="full-start-new__buttons">
            <div class="full-start__button selector button--play">${icon('play')}<span>Смотреть</span></div>
            <div class="full-start__button selector button--book">${icon('bookmark')}<span>В коллекцию</span></div>
            <div class="full-start__button selector button--reaction">${icon('spark')}<span>Оценить</span></div>
            <div class="full-start__button selector button--subscribe hide">${icon('clock')}<span>Следить</span></div>

          </div>
          <div class="kadr-film-creditline"></div>
        </div>
      </div>
      <div class="full-start-new__reactions hide"></div>
      <div class="hide buttons--container"><div class="full-start__button view--torrent hide">${icon('film')}<span>Торренты</span></div><div class="full-start__button selector view--trailer">${icon('play')}<span>Трейлер</span></div></div>
    </section>`);
    Lampa.Template.add('settings',`<section class="settings kadr-preferences"><div class="settings__layer"></div>
      <div class="settings__content layer--height"><header class="settings__head"><div><div class="kadr-eyebrow">ТВОЙ КИНОЗАЛ · ТВОИ ПРАВИЛА</div><div class="settings__title">Настройки</div><p class="kadr-preferences-description">Всё, чтобы смотреть с удовольствием.</p></div><button type="button" class="kadr-dialog-close" data-kadr-close="settings" aria-label="Закрыть настройки">${icon('close')}</button></header>
      <div class="kadr-preferences-workspace"><nav class="kadr-preferences-nav"></nav><div class="settings__body"></div></div>
      <footer class="kadr-preferences-footer"><span>Изменения сохраняются автоматически</span><button type="button" data-kadr-overview>Все настройки</button></footer></div></section>`);
    Lampa.Template.add('selectbox',`<section class="selectbox kadr-choice" role="dialog" aria-modal="true"><div class="selectbox__layer"></div><div class="selectbox__content layer--height"><div class="selectbox__head"><div class="kadr-eyebrow">КАДР / ВЫБОР ДЕЙСТВИЯ</div><div class="selectbox__title"></div><button type="button" class="kadr-dialog-close" data-kadr-close="select" aria-label="Закрыть окно">${icon('close')}</button></div><div class="selectbox__body"></div><div class="kadr-choice-footer">Esc — назад<span>Выбери подходящий вариант</span></div></div></section>`);
    Lampa.Template.add('selectbox_item',`<div class="selectbox-item selector"><div class="kadr-choice-item-content"><div class="selectbox-item__title">{title}</div><div class="selectbox-item__subtitle">{subtitle}</div></div><div class="kadr-choice-arrow">${icon('chevron')}</div></div>`);
    Lampa.Template.add('selectbox_icon',`<div class="selectbox-item selectbox-item--icon selector"><div class="selectbox-item__icon">{icon}</div><div class="kadr-choice-item-content"><div class="selectbox-item__title">{title}</div><div class="selectbox-item__subtitle">{subtitle}</div></div><div class="kadr-choice-arrow">${icon('chevron')}</div></div>`);
    Lampa.Template.add('extensions',`<section class="extensions kadr-extensions"><header class="kadr-ext-heading"><div class="kadr-eyebrow">БОЛЬШЕ ВОЗМОЖНОСТЕЙ</div><h1>Расширения</h1><p>Добавляй только то, чем пользуешься.</p><div class="kadr-builtin"><span>ВСТРОЕНО</span><strong>Онлайн-просмотр</strong><p>z01.online и Lumio · Смотреть → Фильм → выбор источника</p></div></header><div class="extensions__body"></div></section>`);
  }
  function applyAppearance(){
    const size=String(Lampa.Storage.get('frame_poster_size','196'));
    document.body.style.setProperty('--kadr-poster-min',['196','230','270'].includes(size)?size+'px':'196px');
    document.body.classList.toggle('kadr-hide-ratings',!Lampa.Storage.get('frame_show_ratings',true));
    document.body.classList.toggle('kadr-hide-metadata',!Lampa.Storage.get('frame_show_metadata',true));
    document.body.classList.toggle('kadr-reduced-motion',!Lampa.Storage.get('frame_motion',true));
  }
  function makeShell(){
    if(shell)return;
    shell=el('div','kadr-shell');desktopKeys(shell);
    const sidebar=el('aside','kadr-sidebar');
    const brand=btn('кадр.','kadr-brand',()=>catalog());brand.insertAdjacentHTML('afterbegin','<i class="kadr-brand-icon"></i>');
    const collapse=btn('Свернуть меню','kadr-sidebar-toggle',()=>{const collapsed=!document.body.classList.contains('kadr-sidebar-collapsed');Lampa.Storage.set('kadr_sidebar_collapsed',collapsed);applySidebar(collapsed);},'back');
    function applySidebar(collapsed){document.body.classList.toggle('kadr-sidebar-collapsed',collapsed);const text=collapsed?'Развернуть меню':'Свернуть меню';collapse.title=text;collapse.setAttribute('aria-label',text);collapse.setAttribute('aria-expanded',String(!collapsed));}
    applySidebar(Boolean(Lampa.Storage.get('kadr_sidebar_collapsed',false)));add(sidebar,collapse);
    add(sidebar,brand,el('div','kadr-sidebar-note','КИНО В ЦЕНТРЕ ВНИМАНИЯ'));
    const nav=el('nav','kadr-nav');
    [['catalog','Каталог','grid'],['new','Новинки','spark']].forEach(([id,text,ico])=>{const b=btn(text,'kadr-nav-button',()=>catalog(id),ico);b.dataset.route=id;nav.appendChild(b);});
    add(sidebar,nav,el('div','kadr-nav-caption','ТВОЯ КОЛЛЕКЦИЯ'),btn('Избранное','kadr-nav-button',()=>nativeMenu('favorite'),'bookmark'),btn('История','kadr-nav-button',()=>nativeMenu('history'),'clock'));
    const plugins=el('div','kadr-plugin-links');plugins.hidden=true;add(sidebar,plugins);
    const bottom=el('div','kadr-sidebar-bottom');add(bottom,btn('Настройки','kadr-nav-button',()=>settings(),'settings'),el('div','kadr-sidebar-signature','УСТРАИВАЙСЯ ПОУДОБНЕЕ'));
    sidebar.appendChild(bottom);
    const context=el('header','kadr-contextbar');const back=btn('Назад','kadr-back-button',()=>{if(document.querySelector('.extensions')){resume();}else{resume();Lampa.Activity.backward();}},'back');
    contextTitle=el('span','kadr-context-title','Каталог');
    const tools=el('div','kadr-context-tools');add(tools,btn('Поиск','kadr-context-action',()=>{catalog();setTimeout(()=>document.querySelector('.activity--active .frame-search input')?.focus(),100);},'search'));
    add(context,back,contextTitle,tools);add(shell,sidebar,context);document.body.appendChild(shell);
    if(!document.querySelector('.kadr-window-bar')){const bar=el('div','kadr-window-bar');bar.innerHTML='<span class="kadr-window-icon">[ ]</span><span>Кадр</span>';document.body.appendChild(bar);}
    document.body.addEventListener('click',e=>{
      const close=e.target.closest('[data-kadr-close]');if(close){if(close.dataset.kadrClose==='settings')resume();else Lampa.Controller.back();}
      if(e.target.closest('[data-kadr-overview]'))settings();
    });
    ['keydown','keyup'].forEach(type=>document.body.addEventListener(type,e=>{if(e.target.closest('.kadr-preferences button,.kadr-choice button'))e.stopPropagation();}));
    refreshPluginLinks();
    const native=document.querySelector('.menu');if(native)new MutationObserver(refreshPluginLinks).observe(native,{childList:true,subtree:true});
    const a=Lampa.Activity.active();if(a)activityChanged({component:a.component,object:a});
  }
  function refreshPluginLinks(){
    const container=shell?.querySelector('.kadr-plugin-links');if(!container)return;
    container.replaceChildren();
    const builtins=['main','feed','movie','cartoon','tv','myperson','catalog','filter','relise','anime','favorite','history','subscribes','timetable','mytorrents','settings','about','console','edit'];
    const extra=Array.from(document.querySelectorAll('.menu .menu__item')).filter(n=>!builtins.includes(n.dataset.action)&&!['plugins','extensions'].includes(n.dataset.action)&&!n.textContent.includes('Кадр — каталог')&&!n.textContent.trim().match(/^Расширения$/i));
    container.hidden=!extra.length;if(extra.length)container.appendChild(el('div','kadr-nav-caption','ТВОИ ПЛАГИНЫ'));
    extra.forEach(n=>container.appendChild(btn(n.textContent.trim(),'kadr-nav-button',()=>{resume();window.$(n).trigger('hover:enter');},'plug')));
  }
  function activityChanged(e){
    document.body.classList.toggle('frame-mode',e.component==='frame');document.body.dataset.kadrPage=e.component;
    if(contextTitle)contextTitle.textContent=e.component==='full'?'О фильме':e.object?.title||'Твоя коллекция';
    updateNav(e.component==='frame'?(e.object?.frameState?.tab||'catalog'):'');
    const splash=document.querySelector('.kadr-splash');if(splash){splash.classList.add('kadr-splash-done');setTimeout(()=>splash.remove(),350);}
    document.body.classList.remove('kadr-booting');
  }
  function updateNav(tab){shell?.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===tab));}
  let overviewId=0;
  const overviewResize=new ResizeObserver(entries=>entries.forEach(({target})=>{
    if(!target.isConnected){overviewResize.unobserve(target);return;}
    const toggle=target.nextElementSibling;
    if(toggle?.classList.contains('kadr-overview-toggle'))toggle.hidden=!target.classList.contains('kadr-overview-expanded')&&target.scrollHeight<=target.clientHeight+1;
  }));
  function filmReady(e){
    if(e.type!=='complite')return;
    const host=e.object.activity.render()[0];const film=host.querySelector('.kadr-film');if(!film)return;
    const movie=e.data?.movie||e.object.card||{};
    const overview=film.querySelector('.kadr-film-overview');
    overview.textContent=movie.overview||'Описание пока не добавлено.';
    overview.id='kadr-overview-'+(++overviewId);
    film.querySelector('.kadr-overview-toggle')?.remove();
    if(movie.overview){
      const toggle=btn('Полное описание','kadr-overview-toggle',()=>{const expanded=overview.classList.toggle('kadr-overview-expanded');toggle.setAttribute('aria-expanded',String(expanded));toggle.querySelector('span').textContent=expanded?'Свернуть описание':'Полное описание';});
      toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',overview.id);
      toggle.addEventListener('keydown',e=>e.stopPropagation());toggle.addEventListener('keyup',e=>e.stopPropagation());
      overview.after(toggle);overviewResize.observe(overview);
    }
    const tagline=film.querySelector('.full-start-new__tagline');if(tagline)tagline.hidden=!movie.tagline;

    film.querySelector('.kadr-film-kind').textContent=movie.name?'СЕРИАЛ':'ФИЛЬМ';
    const backdrop=film.querySelector('.kadr-film-backdrop');film.classList.toggle('kadr-film-no-backdrop',!movie.backdrop_path);if(movie.backdrop_path){backdrop.src=Lampa.TMDB.image('t/p/w1280'+movie.backdrop_path);backdrop.onerror=()=>{film.classList.add('kadr-film-no-backdrop');backdrop.remove();};}else backdrop.remove();
    const crew=e.data?.persons?.crew||[];const directors=crew.filter(p=>p.job==='Director').map(p=>p.name).slice(0,3);
    const cast=(e.data?.persons?.cast||[]).slice(0,4).map(p=>p.name);
    const credits=film.querySelector('.kadr-film-creditline');
    if(directors.length)add(credits,el('span','', 'Режиссёр'),el('strong','',directors.join(', ')));
    if(cast.length)add(credits,el('span','','В ролях'),el('strong','',cast.join(' · ')));
    const fullDescr=host.querySelector('.full-descr__text');if(fullDescr)fullDescr.classList.add('kadr-duplicate-description');
    film.querySelectorAll('.full-start__button').forEach(n=>{if(!n.getAttribute('title'))n.setAttribute('title',n.textContent.trim());});
  }
  function playerPicker(body){
    const panel=el('section','kadr-player-choice');panel.setAttribute('aria-label','Выбор плеера');
    add(panel,el('h3','','Где смотреть'),el('p','','Встроенный плеер или приложение на твоём компьютере.'));
    const controls=el('div','kadr-player-choice-controls'),select=el('select');select.setAttribute('aria-label','Приложение для просмотра');select.disabled=true;
    const status=el('p','kadr-player-choice-status','Ищем установленные плееры…');status.setAttribute('role','status');
    let items=[],selected=Lampa.Storage.get('player_nw_path',''),external=Lampa.Storage.get('player','inner')==='other';
    function name(path){const file=String(path).split(/[\\/]/).pop().toLowerCase();return /vlc/.test(file)?'VLC':/mpc-be/.test(file)?'MPC-BE':/mpc-hc/.test(file)?'MPC-HC':/potplayer/.test(file)?'PotPlayer':/mpvnet/.test(file)?'mpv.net':/mpv/.test(file)?'mpv':/kmplayer/.test(file)?'KMPlayer':/smplayer/.test(file)?'SMPlayer':file;}
    function exists(path){return Boolean(path&&window.api?.fileExists(path));}
    function draw(){
      if(!panel.isConnected)return;select.replaceChildren();const builtin=el('option','','Встроенный плеер Кадра');builtin.value='';select.appendChild(builtin);
      const paths=Array.from(new Set(items.map(p=>p.path).concat(selected?[selected]:[])));
      paths.forEach(path=>{if(!exists(path)&&path!==selected)return;const option=el('option','',name(path)+(exists(path)?'':' — не найден'));option.value=path;option.disabled=!exists(path);select.appendChild(option);});
      if(external&&!selected){const missing=el('option','','Выбери внешний плеер');missing.value='missing';missing.disabled=true;select.appendChild(missing);}
      select.value=external?(selected||'missing'):'';select.disabled=false;
      status.textContent=external?(exists(selected)?'Видео будет открываться в '+name(selected)+'.':'Плеер не найден. Выбери установленное приложение.'):items.length?'Можно смотреть здесь или выбрать установленный плеер.':'Внешние плееры не найдены. Если плеер уже установлен, укажи его через «Выбрать приложение».';
      fullscreen.hidden=!external;
    }
    function save(path){
      if(path&&!exists(path)){status.textContent='Плеер не найден. Выбери его заново.';return;}
      external=Boolean(path);if(path){selected=path;Lampa.Storage.set('player_nw_path',path);}
      ['player','player_torrent','player_iptv'].forEach(key=>Lampa.Storage.set(key,external?'other':'inner'));
      draw();
    }
    select.addEventListener('change',()=>save(select.value));
    const browse=btn('Выбрать приложение…','kadr-player-browse',async()=>{
      if(!window.api?.choosePlayer){status.textContent='Выбор приложения доступен в Windows-версии Кадра.';return;}
      browse.disabled=true;select.disabled=true;
      try{const result=await api.choosePlayer();if(!panel.isConnected||result.canceled)return;if(!result.ok){status.textContent=result.error||'Не удалось выбрать плеер.';return;}items.push(result);save(result.path);}catch{if(panel.isConnected)status.textContent='Не удалось открыть выбор приложения. Попробуй ещё раз.';}finally{browse.disabled=false;select.disabled=false;}
    });
    add(controls,select,browse);panel.appendChild(controls);panel.appendChild(status);
    const fullscreen=el('label','kadr-player-fullscreen'),check=el('input');check.type='checkbox';check.checked=Boolean(Lampa.Storage.get('player_external_fullscreen',true));check.addEventListener('change',()=>Lampa.Storage.set('player_external_fullscreen',check.checked));add(fullscreen,check,el('span','','Открывать внешний плеер на весь экран'));panel.appendChild(fullscreen);fullscreen.hidden=!external;
    panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();Lampa.Controller.back();}});panel.addEventListener('keyup',event=>event.stopPropagation());
    body.prepend(panel);body.addEventListener('wheel',event=>{if(!event.ctrlKey)event.stopPropagation();});
    Promise.resolve(window.api?.detectPlayers?.()||[]).then(found=>{items=items.concat(found||[]);draw();}).catch(()=>{draw();});
  }
  function preferencesOpened(e){
    const root=document.querySelector('.kadr-preferences');if(!root)return;
    const main=Lampa.Settings.main().render()[0];
    [root,main].forEach(container=>container.querySelectorAll('[data-component]').forEach(folder=>{if(!visiblePreferences.has(folder.dataset.component))folder.remove();}));
    const nav=root.querySelector('.kadr-preferences-nav');nav.replaceChildren();
    const overview=btn('Обзор','kadr-pref-tab',()=>settings(),'grid');overview.classList.toggle('active',e.name==='main');nav.appendChild(overview);
    const folders=Array.from(main.querySelectorAll('[data-component]')).filter(f=>visiblePreferences.has(f.dataset.component));
    folders.forEach(folder=>{
      const id=folder.dataset.component;const info=preferences[id]||[folder.querySelector('.settings-folder__name')?.textContent.trim()||id,'Дополнительные параметры','plug'];
      const b=btn(info[0],'kadr-pref-tab',()=>settings(id),info[2]);b.dataset.pref=id;b.classList.toggle('active',id===e.name);nav.appendChild(b);
      // Replace the native TV icons/labels with the same visual vocabulary as the app.
      const ico=folder.querySelector('.settings-folder__icon');if(ico)ico.innerHTML=icon(info[2]);
      const name=folder.querySelector('.settings-folder__name');if(name)name.textContent=info[0];
      if(!folder.querySelector('.kadr-setting-summary'))folder.appendChild(el('div','kadr-setting-summary',info[1]));
    });
    root.querySelector('.settings__title').textContent=e.name==='main'?'Настройки':(preferences[e.name]?.[0]||folders.find(f=>f.dataset.component===e.name)?.querySelector('.settings-folder__name')?.textContent||'Параметры расширения');
    root.querySelector('.kadr-preferences-description').textContent=e.name==='main'?'Всё, чтобы смотреть с удовольствием.':(preferences[e.name]?.[1]||'Настрой этот раздел под себя.');
    root.dataset.section=e.name;root.querySelector('.settings__body').classList.toggle('kadr-preferences-overview',e.name==='main');
    if(simpleFields[e.name]){
      const body=root.querySelector('.settings__body');
      body.querySelectorAll('.settings-param').forEach(field=>{if(!simpleFields[e.name].has(field.dataset.name))field.remove();});
      body.querySelectorAll('.settings-param-title').forEach(title=>title.remove());
      const labels={player:'Плеер',player_normalization:'Выравнивать громкость',subtitles_start:'Субтитры при запуске',video_quality_default:'Качество по умолчанию',desktop_connection:'Проверить подключение к каталогу'};
      body.querySelectorAll('.settings-param').forEach(field=>{const name=field.querySelector('.settings-param__name');if(name&&labels[field.dataset.name])name.textContent=labels[field.dataset.name];});
    }
    if(e.name==='interface'&&window.KadrThemes){const body=root.querySelector('.settings__body .scroll__body');if(body&&!body.querySelector('.kadr-theme-picker')){body.prepend(KadrThemes.picker());body.addEventListener('wheel',event=>{if(!event.ctrlKey)event.stopPropagation();});}}
    if(e.name==='player'){const body=root.querySelector('.settings__body .scroll__body');if(body&&!body.querySelector('.kadr-player-choice'))playerPicker(body);}
  }
  function wait(){
    if(!window.Lampa?.Template||!Lampa.Component)return setTimeout(wait,20);
    installTemplates();applyAppearance();
    Lampa.Listener.follow('app',e=>{if(e.type==='ready')makeShell();});
    Lampa.Listener.follow('activity',e=>{if(e.type==='start'){makeShell();activityChanged(e);}});
    Lampa.Listener.follow('full',filmReady);
    Lampa.Settings.listener.follow('open',preferencesOpened);
    Lampa.Extensions.listener.follow('open',()=>{document.body.classList.add('kadr-extensions-open');if(contextTitle)contextTitle.textContent='Расширения';});
    Lampa.Extensions.listener.follow('close',()=>{document.body.classList.remove('kadr-extensions-open');const a=Lampa.Activity.active();if(contextTitle)contextTitle.textContent=a?.component==='full'?'О фильме':a?.title||'Каталог';});
    Lampa.Controller.listener.follow('toggle',e=>{
      if(e.name==='menu'||e.name==='head')setTimeout(()=>{if(['menu','head'].includes(Lampa.Controller.enabled().name)){resume();shell?.querySelector('.kadr-nav-button')?.focus();}},0);
    });
    window.addEventListener('frame:state',e=>{if(Lampa.Activity.active()?.component==='frame')updateNav(e.detail.tab);});
    if(window.appready)makeShell();
    window.KadrShell={catalog,settings,resume};
  }
  wait();
})();
