/* Кадр — desktop player controls. Lampa's media engine remains the plugin adapter. */
(function(){
  'use strict';
  const paths={back:'M20 12H4m6-6-6 6 6 6',play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',volume:'M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',mute:'M11 5 6 9H3v6h3l5 4ZM16 9l6 6m0-6-6 6',next:'m5 5 10 7-10 7ZM19 5v14',tracks:'M4 4h16v13h-7l-5 4v-4H4ZM7 8h10M7 12h7',settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',fullscreen:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',check:'m5 12 4 4L19 6',chevron:'m9 6 6 6-6 6'};
  let root,popover,settingsButton,trackButton,playButton,nextButton,seek,volume,currentLabel,remainingLabel,titleLabel,subtitleLabel,clockLabel,finishLabel,statusLabel,retryButton;
  let active=false,data={},timer=null,hideTimer=null,pop='',seeking=false,hover=false,previousFocus=null,lastVolume=.7,errorText='',scaleMode='default',keyboardMode=false,pendingError=null;
  function icon(name){if(name==='rewind'||name==='forward')return '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(name==='rewind'?'M7 7a10 10 0 1 1-2 10M7 2v6H2':'M21 7a10 10 0 1 0 2 10M21 2v6h5')+'"/><text x="14" y="18" text-anchor="middle" fill="currentColor" stroke="none" font-size="10" font-family="Segoe UI,sans-serif">10</text></svg>';return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';}
  function el(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
  function add(n,...children){children.forEach(c=>n.appendChild(c));return n;}
  function button(label,name,action,cls){const b=el('button','kp-button '+(cls||''));b.type='button';b.title=label;b.setAttribute('aria-label',label);if(name)b.innerHTML=icon(name);else b.textContent=label;b.addEventListener('click',()=>{action();wake();});return b;}
  function media(){try{return Lampa.PlayerVideo.video();}catch(_){return null;}}
  function format(seconds){if(!Number.isFinite(seconds))return '—';const s=Math.max(0,Math.floor(seconds)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return [h,m,s%60].map(n=>String(n).padStart(2,'0')).join(':');}
  function timeOf(date){return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(date);}
  function finishTime(duration,current,rate,now){if(!Number.isFinite(duration)||duration<=0)return null;return new Date((now??Date.now())+Math.max(0,duration-current)/Math.max(.1,rate||1)*1000);}
  function wake(){if(!active||!root)return;root.classList.remove('kp-hidden');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{const v=media();if(active&&!pop&&!hover&&!seeking&&!v?.paused&&(!keyboardMode||!root.contains(document.activeElement))){root.classList.add('kp-hidden');}},2800);}
  function plain(value){const box=document.createElement('div');box.innerHTML=String(value||'');return box.textContent.trim();}
  function nativeChoice(name){let captured=null;const original=Lampa.Select.show;try{Lampa.Select.show=opts=>{captured=opts;};Lampa.PlayerPanel.render().find('.player-panel__'+name).first().trigger('hover:enter');}finally{Lampa.Select.show=original;}return captured;}
  function qualityLabel(){const text=Lampa.PlayerPanel.render().find('.player-panel__quality').text().trim();return text&&text!=='auto'?text:'Авто';}
  function closePopover(focus){pop='';popover.hidden=true;settingsButton.setAttribute('aria-expanded','false');trackButton.setAttribute('aria-expanded','false');if(focus)settingsButton.focus();wake();}
  function heading(text,back){const h=el('header','kp-menu-head');if(back)h.appendChild(button('Назад','back',back));h.appendChild(el('h2','',text));popover.appendChild(h);}
  function row(label,value,fn){const b=button('',null,fn,'kp-menu-row');b.setAttribute('aria-label',label);b.textContent='';add(b,el('span','',label),el('span','kp-row-value',value));b.insertAdjacentHTML('beforeend',icon('chevron'));return b;}
  function selectMenu(label,choice,back){popover.replaceChildren();heading(label,back);if(!choice?.items?.length){popover.appendChild(el('p','kp-empty','В этом потоке нет доступных вариантов.'));return;}
    const list=el('div','kp-menu-list');choice.items.forEach(item=>{if(item.separator){list.appendChild(el('p','kp-menu-caption',plain(item.title)));return;}const b=button('',null,()=>{closePopover();choice.onSelect?.(item);tick();},'kp-menu-option');b.textContent='';add(b,el('span','',plain(item.title)));if(item.selected||item.enabled){b.classList.add('selected');b.insertAdjacentHTML('beforeend',icon('check'));}list.appendChild(b);});popover.appendChild(list);
  }
  function speedValue(){return Number(media()?.playbackRate)||parseFloat(Lampa.Storage.get('player_speed',1))||1;}
  function settings(){popover.replaceChildren();heading('Настройки');popover.appendChild(el('p','kp-menu-caption','Скорость воспроизведения'));const speeds=el('div','kp-speeds');[.5,.75,1,1.25,1.5,2].forEach(value=>{const b=button(String(value).replace('.',',')+'×',null,()=>{Lampa.PlayerVideo.speed(value);Lampa.Storage.set('player_speed',value);settings();tick();});b.dataset.speed=String(value);b.classList.toggle('selected',Math.abs(speedValue()-value)<.01);b.setAttribute('aria-pressed',String(Math.abs(speedValue()-value)<.01));speeds.appendChild(b);});popover.appendChild(speeds);
    popover.appendChild(row('Качество',qualityLabel(),()=>selectMenu('Качество',nativeChoice('quality'),settings)));
    popover.appendChild(row('Масштаб',{default:'По размеру',cover:'Заполнить',fill:'Растянуть',s115:'115%',s130:'130%'}[scaleMode]||'По размеру',()=>{
      popover.replaceChildren();heading('Масштаб',settings);const list=el('div','kp-menu-list');[['default','По размеру'],['cover','Заполнить экран'],['fill','Растянуть'],['s115','Увеличить до 115%'],['s130','Увеличить до 130%']].forEach(([mode,label])=>{const b=button(label,null,()=>{scaleMode=mode;Lampa.Storage.set('kadr_player_scale',mode);applyScale();settings();},'kp-menu-option');b.classList.toggle('selected',mode===scaleMode);list.appendChild(b);});popover.appendChild(list);
    }));
  }
  function tracksMenu(){popover.replaceChildren();heading('Озвучка и субтитры');const audio=nativeChoice('tracks'),subs=nativeChoice('subs');popover.appendChild(row('Аудиодорожка',audio?.items?.length?'Выбрать':'Дорожка источника',()=>selectMenu('Аудиодорожка',audio,tracksMenu)));popover.appendChild(row('Субтитры',subs?.items?.length?'Выбрать':'Нет в потоке',()=>selectMenu('Субтитры',subs,tracksMenu)));if(!audio?.items?.length)popover.appendChild(el('p','kp-empty','Другую озвучку можно выбрать на экране источников.'));}
  function togglePopover(kind){if(pop===kind){closePopover();return;}pop=kind;popover.hidden=false;settingsButton.setAttribute('aria-expanded',String(kind==='settings'));trackButton.setAttribute('aria-expanded',String(kind==='tracks'));if(kind==='settings')settings();else tracksMenu();wake();}
  function applyScale(){const v=media();if(!v)return;Lampa.PlayerVideo.size(scaleMode==='cover'?'default':scaleMode);if(v.style){v.style.objectFit=scaleMode==='cover'?'cover':scaleMode==='fill'?'fill':'contain';}Lampa.Storage.set('player_size',scaleMode==='cover'?'default':scaleMode);}
  function seekBy(delta){const v=media();if(v&&Number.isFinite(v.duration))seekTo(v.currentTime+delta);}
  function seekTo(value){const v=media();if(!v)return;const target=Math.max(0,Math.min(value,v.duration));if(v instanceof HTMLMediaElement)v.currentTime=target;else{const paused=v.paused;Lampa.PlayerVideo.to(target);if(paused)Lampa.PlayerVideo.pause();}tick();}
  function toggleMute(){const v=media();if(!v)return;if(v.muted){v.muted=false;if(v.volume===0)Lampa.PlayerVideo.volume(lastVolume||.7);}else if(v.volume>0){lastVolume=v.volume;v.muted=true;}else Lampa.PlayerVideo.volume(lastVolume||.7);tick();}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){toast('Не удалось включить полноэкранный режим');}}
  function toast(text){statusLabel.textContent=text;statusLabel.hidden=false;setTimeout(()=>{if(active&&!errorText)statusLabel.hidden=true;},2000);}
  function leave(){closePopover();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});Lampa.Player.close();}
  function make(){
    root=el('section','kadr-player');root.setAttribute('aria-label','Видеоплеер Кадр');
    const top=el('header','kp-top');const back=button('Назад к фильму','back',leave,'kp-back');back.appendChild(el('span','','Назад к фильму'));
    const clock=el('div','kp-clock');clockLabel=el('time','');finishLabel=el('span','');add(clock,clockLabel,finishLabel);add(top,back,clock);
    const bottom=el('div','kp-bottom');const seekWrap=el('div','kp-seek-wrap');seek=el('input','kp-seek');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.setAttribute('aria-label','Позиция воспроизведения');
    seek.addEventListener('pointerdown',()=>{seeking=true;wake();});seek.addEventListener('input',()=>{const v=media();if(v&&Number.isFinite(v.duration))currentLabel.textContent=format(v.duration*Number(seek.value)/1000);wake();});seek.addEventListener('change',()=>{const v=media();if(v&&Number.isFinite(v.duration))seekTo(v.duration*Number(seek.value)/1000);seeking=false;wake();});seek.addEventListener('pointercancel',()=>{seeking=false;tick();});seekWrap.appendChild(seek);
    const timeRow=el('div','kp-times');currentLabel=el('span','','00:00:00');remainingLabel=el('span','','—');add(timeRow,currentLabel,remainingLabel);
    const controls=el('div','kp-controls');const left=el('div','kp-transport');playButton=button('Пауза','pause',()=>Lampa.PlayerVideo.playpause());add(left,playButton,button('Назад на 10 секунд','rewind',()=>seekBy(-10)),button('Вперёд на 10 секунд','forward',()=>seekBy(10)));
    const vol=el('div','kp-volume');const mute=button('Выключить звук','volume',toggleMute);mute.dataset.kpMute='true';volume=el('input','kp-volume-slider');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.setAttribute('aria-label','Громкость');volume.addEventListener('input',()=>{const v=media();if(v)v.muted=false;Lampa.PlayerVideo.volume(Number(volume.value));tick();wake();});add(vol,mute,volume);left.appendChild(vol);
    const title=el('div','kp-title');titleLabel=el('strong','');subtitleLabel=el('small','');add(title,titleLabel,subtitleLabel);
    const right=el('div','kp-tools');nextButton=button('Следующая серия','next',()=>{closePopover();if(Lampa.PlayerPlaylist.canNext())Lampa.PlayerPlaylist.next();});trackButton=button('Озвучка и субтитры','tracks',()=>togglePopover('tracks'));settingsButton=button('Настройки','settings',()=>togglePopover('settings'));settingsButton.setAttribute('aria-expanded','false');trackButton.setAttribute('aria-expanded','false');add(right,nextButton,trackButton,settingsButton,button('Полный экран · F','fullscreen',fullscreen));
    add(controls,left,title,right);add(bottom,seekWrap,timeRow,controls);popover=el('aside','kp-popover');popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Параметры воспроизведения');popover.id='kadr-player-menu';settingsButton.setAttribute('aria-controls',popover.id);trackButton.setAttribute('aria-controls',popover.id);
    statusLabel=el('div','kp-status');statusLabel.hidden=true;retryButton=button('Повторить',null,()=>{clearPlaybackError();Lampa.Player.play(Object.assign({},data,{launch_player:'inner',continue_play:true}));},'kp-retry');retryButton.hidden=true;
    add(root,top,bottom,popover,statusLabel,retryButton);document.body.appendChild(root);
    root.addEventListener('mousemove',()=>{keyboardMode=false;wake();});root.addEventListener('pointerdown',e=>{keyboardMode=false;if(!e.target.closest('.kp-popover,.kp-tools')&&pop)closePopover();});
    bottom.addEventListener('pointerenter',()=>{hover=true;wake();});bottom.addEventListener('pointerleave',()=>{hover=false;wake();});popover.addEventListener('pointerenter',()=>{hover=true;wake();});popover.addEventListener('pointerleave',()=>{hover=false;wake();});
    root.addEventListener('click',e=>{if(e.target===root){if(pop)closePopover();else Lampa.PlayerVideo.playpause();wake();}});root.addEventListener('dblclick',e=>{if(e.target===root)fullscreen();});
    root.addEventListener('focusin',wake);root.addEventListener('focusout',()=>setTimeout(wake,0));
  }
  // HLS reports recoverable fragment/network errors through this same channel.
  // Only confirm a fatal failure after playback has actually stopped, and discard
  // the message if the media recovers or another source replaces it.
  function clearPlaybackError(){pendingError=null;errorText='';if(statusLabel)statusLabel.hidden=true;if(retryButton)retryButton.hidden=true;}
  function playbackError(e){
    if(!active)return;const v=media();if(!v)return;
    const code=Number(v.error?.code)||0;
    if(e?.fatal===false||code===1)return;
    if(e?.fatal!==true&&![2,3,4].includes(code))return;
    if(pendingError?.video===v)return;
    pendingError={video:v,source:v.currentSrc||v.src||'',time:Number(v.currentTime)||0,since:performance.now(),message:String(e?.error||'Не удалось воспроизвести видео')};
  }
  function checkPlaybackError(v,current){
    if(!pendingError)return;
    if(pendingError.video!==v||pendingError.source!==(v.currentSrc||v.src||'')||v.ended){clearPlaybackError();return;}
    if(seeking||v.seeking){pendingError.time=current;pendingError.since=performance.now();return;}
    if(current>pendingError.time+.05){clearPlaybackError();return;}
    if(!errorText&&performance.now()-pendingError.since>=2000){
      errorText=pendingError.message;statusLabel.textContent='Не удалось воспроизвести видео. Попробуй другой источник или повтори загрузку.';statusLabel.hidden=false;retryButton.hidden=false;wake();
    }
  }
  function tick(){if(!active||!root)return;const v=media();if(!v)return;const duration=Number(v.duration),current=Number(v.currentTime)||0,rate=Number(v.playbackRate)||1,finite=Number.isFinite(duration)&&duration>0;
    checkPlaybackError(v,current);
    if(!seeking){seek.value=finite?String(Math.min(1000,current/duration*1000)):'0';currentLabel.textContent=format(current);}
    seek.disabled=!finite;seek.setAttribute('aria-valuetext',format(current)+(finite?' из '+format(duration):''));const progress=finite?Math.max(0,Math.min(100,current/duration*100)):0;let buffered=progress;try{if(v.buffered?.length)buffered=Math.min(100,v.buffered.end(v.buffered.length-1)/duration*100);}catch(_){}
    seek.style.setProperty('--played',progress+'%');seek.style.setProperty('--buffered',(finite?buffered:0)+'%');remainingLabel.textContent=finite?'−'+format(Math.max(0,duration-current)):duration===Infinity?'Прямой эфир':'—';
    const end=finishTime(duration,current,rate);clockLabel.textContent=timeOf(new Date());finishLabel.textContent=end?'Конец в '+timeOf(end):duration===Infinity?'Прямой эфир':'Время окончания —';finishLabel.title=end?'При текущей скорости '+rate+'×, без учёта будущих пауз и загрузок':'';
    const paused=Boolean(v.paused);playButton.innerHTML=icon(paused?'play':'pause');playButton.setAttribute('aria-label',paused?'Продолжить':'Пауза');playButton.title=paused?'Продолжить · Пробел':'Пауза · Пробел';
    if(paused)root.classList.remove('kp-hidden');volume.value=String(v.muted?0:v.volume??.7);volume.style.setProperty('--volume',(Number(volume.value)*100)+'%');const mute=root.querySelector('[data-kp-mute]');mute.innerHTML=icon(v.muted||v.volume===0?'mute':'volume');mute.title=v.muted?'Включить звук · M':'Выключить звук · M';mute.setAttribute('aria-label',v.muted?'Включить звук':'Выключить звук');
    nextButton.hidden=!Lampa.PlayerPlaylist.canNext();root.classList.toggle('kp-is-fullscreen',Boolean(document.fullscreenElement));
    if(!errorText){const loading=!paused&&Number(v.readyState)<3;statusLabel.hidden=!loading;statusLabel.textContent=loading?'Загрузка…':'';}
  }
  function activate(nextData){if(!Lampa.Player.opened())return;data=nextData||Lampa.Player.playdata()||{};if(!root)make();if(!active)previousFocus=document.activeElement;active=true;clearPlaybackError();document.body.classList.add('kadr-player-active');
    const movie=data.card||Lampa.Activity.active()?.movie||Lampa.Activity.active()?.card||{};titleLabel.textContent=movie.title||movie.name||data.title||'Просмотр';subtitleLabel.textContent=[data.season?'Сезон '+data.season:null,data.episode?'Серия '+data.episode:null,data.voice_name||(!data.season?(movie.release_date||movie.first_air_date||'').slice(0,4):null)].filter(Boolean).join(' · ');
    scaleMode=Lampa.Storage.get('kadr_player_scale','default');if(!['default','cover','fill','s115','s130'].includes(scaleMode))scaleMode='default';applyScale();closePopover();clearInterval(timer);timer=setInterval(tick,250);tick();wake();
  }
  function deactivate(){clearPlaybackError();active=false;clearInterval(timer);clearTimeout(hideTimer);timer=hideTimer=null;pop='';hover=seeking=false;document.body.classList.remove('kadr-player-active');root?.remove();root=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;}
  function keydown(e){if(!active||!root||(Lampa.Select.opened()||Lampa.Modal.opened())||document.body.classList.contains('keyboard-input--visible'))return;keyboardMode=true;const target=e.target;const control=target.closest?.('.kadr-player button,.kadr-player input');
    if(e.key==='Tab'){wake();const scope=pop?popover:root;const all=Array.from(scope.querySelectorAll('button,input')).filter(n=>!n.disabled&&n.getClientRects().length);if(!all.length)return;const index=all.indexOf(target);if(index<0||(e.shiftKey&&index===0)||(!e.shiftKey&&index===all.length-1)){e.preventDefault();(e.shiftKey?all[all.length-1]:all[0]).focus();}e.stopImmediatePropagation();return;}
    if(control&&e.key!=='Escape'&&(['Enter',' '].includes(e.key)||(target.tagName==='INPUT'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)))){e.stopImmediatePropagation();return;}
    const actions={' ':()=>Lampa.PlayerVideo.playpause(),k:()=>Lampa.PlayerVideo.playpause(),ArrowLeft:()=>seekBy(-10),ArrowRight:()=>seekBy(10),ArrowUp:()=>Lampa.PlayerVideo.volume((media()?.volume||0)+.05),ArrowDown:()=>Lampa.PlayerVideo.volume((media()?.volume||0)-.05),m:toggleMute,f:fullscreen,Escape:()=>{if(pop)closePopover();else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else leave();}};
    const fn=actions[e.key]||actions[e.key.toLowerCase()];if(fn){e.preventDefault();e.stopImmediatePropagation();fn();tick();wake();}else e.stopImmediatePropagation();
  }
  function wait(){if(!window.Lampa?.PlayerVideo||!Lampa.Player?.listener)return setTimeout(wait,20);
    Lampa.Player.listener.follow('ready',activate);Lampa.Player.listener.follow('destroy',deactivate);
    Lampa.PlayerVideo.listener.follow('canplay',()=>{if(active){const v=media();if(v&&!v.error&&Number(v.readyState)>=3)clearPlaybackError();applyScale();tick();}});Lampa.PlayerVideo.listener.follow('error',playbackError);
    document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',e=>{if(active&&!Lampa.Select.opened()&&!Lampa.Modal.opened()&&!document.body.classList.contains('keyboard-input--visible'))e.stopImmediatePropagation();},true);document.addEventListener('fullscreenchange',()=>{if(active){applyScale();tick();wake();}});
    window.KadrPlayer={finishTime,format,wake,settings:()=>togglePopover('settings')};
  }
  wait();
})();
