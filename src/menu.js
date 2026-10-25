/* Кадр 1.0.0: desktop menu. Modified 2026-10-25; see THIRD_PARTY_NOTICES.md. */
const {Menu,dialog,app}=require('electron');
const PIP_JS=`(() => {const v=document.querySelector('video');if(!v)return;if(document.pictureInPictureElement)document.exitPictureInPicture();else if(document.pictureInPictureEnabled&&v.requestPictureInPicture)v.requestPictureInPicture();})()`;
const build=({win,onToggleMiniPlayer})=>Menu.buildFromTemplate([
  {label:'Файл',submenu:[{role:'quit',label:'Выход',accelerator:'CmdOrCtrl+Q'}]},
  {label:'Вид',submenu:[
    {role:'reload',label:'Перезагрузить'},
    {type:'separator'},
    {role:'resetZoom',label:'Масштаб 100%'},{role:'zoomIn',label:'Увеличить'},{role:'zoomOut',label:'Уменьшить'},
    {type:'separator'},{role:'togglefullscreen',label:'Полный экран',accelerator:'F11'},
    ...(!app.isPackaged?[{role:'toggleDevTools',label:'Инструменты разработчика'}]:[])
  ]},
  {label:'Просмотр',submenu:[
    {label:'Картинка в картинке',accelerator:'CmdOrCtrl+P',click:()=>win.webContents.executeJavaScript(PIP_JS,true).catch(()=>{})},
    {label:'Мини-плеер поверх окон',accelerator:'CmdOrCtrl+Shift+P',click:()=>onToggleMiniPlayer?.()}
  ]},
  {label:'Окно',submenu:[{role:'minimize',label:'Свернуть'},{role:'close',label:'Закрыть'}]},
  {label:'Справка',submenu:[{label:'О Кадре',click:()=>dialog.showMessageBox(win,{
    type:'info',title:'Кадр',message:'Кадр '+app.getVersion(),
    detail:'Кино в центре внимания.\nРазработано с помощью OpenAI Codex.\n\nСвободное ПО, GPL-2.0. Без гарантий.\nСведения об авторах и сторонних компонентах: THIRD_PARTY_NOTICES.md в папке приложения.'
  })}]}
]);
module.exports={build};
