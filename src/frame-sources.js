/* Кадр: one explicit entry point for the two bundled online plugins. */
(function(){
  'use strict';
  function content(){Lampa.Controller.toggle('content');}
  function choose(film,movie){
    Lampa.Select.show({title:'Источник просмотра',items:[
      {title:'z01.online',subtitle:'Онлайн-просмотр',source:'z01'},
      {title:'Lumio',subtitle:'Онлайн-просмотр · beta.mitsu.tv',source:'lumio'}
    ],onBack:content,onSelect:item=>{
      content();
      if(item.source==='lumio'){
        if(!Lampa.Component.get('nexusonline')){Lampa.Noty.show('Lumio ещё загружается. Попробуй ещё раз через несколько секунд.');return;}
        const card=movie||Lampa.Activity.active()?.card;
        if(!card){Lampa.Noty.show('Открой карточку фильма ещё раз.');return;}
        Lampa.Activity.push({url:'',title:'Lumio',component:'nexusonline',movie:card,page:1});
      }else{
        const source=film.querySelector('.lampac--button');
        if(source)window.$(source).trigger('hover:enter');
        else Lampa.Noty.show('Источник ещё загружается. Попробуй ещё раз через несколько секунд.');
      }
    }});
  }
  window.KadrSources={choose};
})();
