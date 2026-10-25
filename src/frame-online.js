/* Desktop presentation for plugin Explorer, preserving its native hooks. */
(function(){
  'use strict';
  function formatLine(row){
    const title=row.querySelector('.mo-line__title'),side=row.querySelector('.mo-line__side');if(!title||!side||row.dataset.kadrFormatted)return;
    row.dataset.kadrFormatted='true';
    const raw=title.textContent,groups=Array.from(raw.matchAll(/\[([^\]]+)\]/g));if(!groups.length)return;
    const parts=groups.flatMap(m=>m[1].split(',').map(x=>x.trim()).filter(Boolean)),studios=[];
    const languages={ru:'Рус',rus:'Рус',uk:'Укр',ukr:'Укр',ua:'Укр',en:'Англ',eng:'Англ'};
    parts.forEach(part=>{const language=languages[part.toLowerCase()];if(language){const badge=document.createElement('span');badge.className='kadr-source-language';badge.textContent=language;side.appendChild(badge);}else studios.push(part);});
    title.textContent=raw.replace(/\s*\[[^\]]*\]/g,'').trim()||raw;
    const note=row.querySelector('.mo-line__note');if(note&&studios.length)note.textContent=[studios.join(' · '),note.textContent].filter(Boolean).join(' · ');
  }
  function wait(){
    if(!window.Lampa?.Template)return setTimeout(wait,20);
    Lampa.Template.add('explorer',`<section class="explorer kadr-online layer--width">
      <div class="explorer__left"><div class="explorer__card"><div class="explorer-card">
        <div class="explorer-card__head"><div class="explorer-card__head-left"><div class="explorer-card__head-img selector" title="Вернуться к карточке"><img alt="Постер" /></div></div>
        <div class="explorer-card__head-body"><div class="explorer-card__head-create"></div><div class="explorer-card__head-rate"><svg><use xlink:href="#sprite-star"></use></svg><span></span></div></div></div>
        <div class="explorer-card__body"><div class="kadr-online-eyebrow">ВЫБЕРИ ВАРИАНТ ПРОСМОТРА</div><h1 class="explorer-card__title"></h1><div class="explorer-card__genres"></div><div class="explorer-card__descr"></div></div>
      </div></div></div>
      <div class="explorer__files"><div class="explorer__files-head"></div><div class="explorer__files-body"></div></div>
    </section>`);
    Lampa.Listener.follow('activity',e=>{if(e.type==='start'&&e.component==='lampac_z')document.body.dataset.kadrOnlineSeries=e.object?.movie?.name?'true':'false';});
    // The online plugin binds normal Lampa hover:enter events. Add native button
    // semantics for desktop keyboard users without replacing those handlers.
    const observer=new MutationObserver(records=>{records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;const nodes=n.matches?.('.mo-seg,.mo-opt,.mo-line,.mo-tile,.mo-act')?[n]:[];nodes.push(...(n.querySelectorAll?.('.mo-seg,.mo-opt,.mo-line,.mo-tile,.mo-act')||[]));nodes.forEach(b=>{if(b.classList.contains('mo-line'))formatLine(b);if(b.dataset.kadrKey)return;b.dataset.kadrKey='true';b.setAttribute('role','button');b.tabIndex=0;b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();window.$(b).trigger('hover:enter');}});});}));});
    observer.observe(document.body,{subtree:true,childList:true});
    document.addEventListener('wheel',e=>{
      if(!['lampac_z','nexusonline'].includes(document.body.dataset.kadrPage)||Lampa.Select.opened()||Lampa.Modal.opened()||document.body.classList.contains('settings--open')||document.body.classList.contains('kadr-extensions-open')||e.ctrlKey)return;
      const scroller=e.target.closest('.kadr-online-scroll')||e.target.closest('.kadr-online')?.querySelector('.kadr-online-scroll');if(!scroller)return;
      e.preventDefault();e.stopImmediatePropagation();scroller.scrollTop+=e.deltaY*(e.deltaMode===1?24:e.deltaMode===2?scroller.clientHeight:1);
    },{capture:true,passive:false});
  }
  wait();
})();
