/* Shared palette tokens. Apply saved colors before the first page is painted. */
(function(){
  'use strict';
  const roles=['chrome','bg','sidebar','surface','raised','hover','line','edge','text','secondary','muted','accent','ink'];
  const themes=[
    {id:'olive',name:'Стандартная',note:'Привычный Кадр',preview:['#101416','#19211f','#d9eea0']},
    {id:'dark',name:'Тёмная',note:'Глубокий чёрный',preview:['#090a0c','#15171b','#e3e7ed'],colors:['#090a0c','#090a0c','#101114','#17191e','#202329','#2c3038','#ffffff','#454b56','#f1f3f7','#bdc3ce','#939ca9','#e3e7ed','#171a20']},
    {id:'light',name:'Светлая',note:'Чистый светлый фон',preview:['#f5f7fa','#ffffff','#245bc4'],colors:['#f5f7fa','#f5f7fa','#edf1f6','#ffffff','#e6ecf4','#d9e3f1','#24324a','#b7c4d6','#172337','#3e4d63','#52637a','#245bc4','#ffffff']},
    {id:'lemon',name:'Лемон',note:'Лимонный и угольный',preview:['#2e2e2e','#242424','#fff44f'],colors:['#202020','#2e2e2e','#242424','#353535','#40403c','#4d4d44','#ffffff','#68685c','#f6f4e9','#d0cec1','#b0afa0','#fff44f','#2e2e2e']},
    {id:'tiffany',name:'Тиффани',note:'Бирюзовый на тёмном',preview:['#171717','#202624','#22f1a9'],colors:['#121413','#171717','#121b17','#202624','#2b3833','#374b43','#ffffff','#3d6252','#e9fff5','#b7d3c5','#9bb8aa','#22f1a9','#10251d']},
    {id:'matcha',name:'Матча',note:'Шалфей и молочный крем',light:true,preview:['#f1e8c7','#fff9e8','#9ca763'],colors:['#e6dfbd','#f1e8c7','#e1e4bf','#fff9e8','#e5e8ca','#d7dfb5','#344020','#a7b184','#29331e','#475435','#596445','#56652f','#253019']},
    {id:'aqua',name:'Аква',note:'Мята, белый и кармин',light:true,preview:['#ffffff','#95d9c0','#d41f26'],colors:['#eef7f3','#ffffff','#eef7f3','#f5faf8','#e1f0ea','#cbe6db','#253632','#bed4c9','#203532','#3d5c56','#4e6b65','#d41f26','#ffffff']}
  ];
  const root=document.documentElement;
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(' ');
  let current='olive';
  function apply(id){
    const theme=themes.find(t=>t.id===id)||themes[0];current=theme.id;
    roles.forEach((role,i)=>{const key='--kadr-'+role+'-rgb';if(theme.colors)root.style.setProperty(key,rgb(theme.colors[i]));else root.style.removeProperty(key);});
    root.dataset.kadrTheme=current;root.style.colorScheme=current==='light'||theme.light?'light':'dark';root.dataset.kadrTone=current==='light'||theme.light?'light':'dark';
    document.querySelectorAll('.kadr-theme-tile').forEach(b=>{b.setAttribute('aria-checked',String(b.dataset.theme===current));b.tabIndex=b.dataset.theme===current?0:-1;});
    window.api?.setTheme?.(current).catch(()=>{});
  }
  function picker(){
    const section=document.createElement('section');section.className='kadr-theme-picker';
    const heading=document.createElement('h3');heading.textContent='Цветовая тема';
    const hint=document.createElement('p');hint.textContent='Выбери настроение своего кинозала.';
    const grid=document.createElement('div');grid.className='kadr-theme-grid';grid.setAttribute('role','radiogroup');grid.setAttribute('aria-label','Цветовая тема');
    themes.forEach(theme=>{
      const b=document.createElement('button');b.type='button';b.className='kadr-theme-tile selector';b.dataset.theme=theme.id;b.setAttribute('role','radio');b.setAttribute('aria-label',theme.name);b.setAttribute('aria-checked',String(theme.id===current));b.tabIndex=theme.id===current?0:-1;
      theme.preview.forEach((value,i)=>b.style.setProperty(['--preview-bg','--preview-panel','--preview-accent'][i],value));
      const preview=document.createElement('span');preview.className='kadr-theme-preview';preview.setAttribute('aria-hidden','true');
      const rail=document.createElement('i');rail.className='kadr-theme-preview-rail';preview.appendChild(rail);
      for(let i=0;i<3;i++){const poster=document.createElement('i');poster.className='kadr-theme-preview-poster';preview.appendChild(poster);}
      const title=document.createElement('strong');title.textContent=theme.name;
      const note=document.createElement('small');note.textContent=theme.note;
      const choose=()=>{Lampa.Storage.set('kadr_theme',theme.id);apply(theme.id);};
      b.addEventListener('click',choose);
      b.addEventListener('keydown',e=>{const keys={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1};if(e.key in keys||e.key==='Home'||e.key==='End'){e.preventDefault();e.stopPropagation();const index=themes.indexOf(theme),next=e.key==='Home'?0:e.key==='End'?themes.length-1:(index+keys[e.key]+themes.length)%themes.length;const target=grid.children[next];target.click();target.focus();}});
      b.appendChild(preview);b.appendChild(title);b.appendChild(note);grid.appendChild(b);
    });
    section.appendChild(heading);section.appendChild(hint);section.appendChild(grid);return section;
  }
  let saved='olive';try{const raw=localStorage.getItem('kadr_theme');if(raw){try{saved=JSON.parse(raw);}catch{saved=raw;}}}catch{}
  apply(saved);
  window.KadrThemes={apply,picker};
})();
