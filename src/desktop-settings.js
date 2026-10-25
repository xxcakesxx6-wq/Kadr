/**
 * Adds a "Приложение" section to Lampa's own Settings screen so the desktop-only
 * connection controls are discoverable there
 * instead of only in the hidden Electron menu bar.
 *
 * Runs in the page (main world); talks to the main process through window.api.
 */
(function () {
  if (!window.api || typeof window.api.desktopConfig !== 'function') return;

  var ICON = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9m0-18C9.5 5.5 8.5 9 8.5 12s1 6.5 3.5 9M3.5 12h17" ' +
    'stroke="white" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function whenReady(cb) {
    if (window.Lampa && Lampa.SettingsApi && Lampa.Storage && Lampa.Lang && Lampa.Noty) return cb();
    setTimeout(function () { whenReady(cb); }, 200);
  }

  whenReady(function () {
    window.api.desktopConfig().then(function (cfg) {
      cfg = cfg || {};

      // seed the visual state without firing onChange
      Lampa.Storage.set('desktop_doh', !!cfg.doh, true);
      Lampa.Storage.set('desktop_proxy', cfg.proxy || '', true);

      Lampa.SettingsApi.addComponent({
        component: 'desktop_app',
        name: 'Приложение',
        icon: ICON
      });

      Lampa.SettingsApi.addParam({
        component:'desktop_app',param:{name:'desktop_connection',type:'button'},
        field:{name:'Подключение и проверка каталога',description:'Системный прокси, прямое подключение, свой прокси и диагностика TMDB.'},
        onChange:function(){window.KadrNetwork.open();}
      });

      Lampa.SettingsApi.addParam({
        component: 'desktop_app',
        param: {
          name: 'desktop_audio_lang',
          type: 'select',
          values: { ru: 'Русский', uk: 'Українська', en: 'English', off: 'Не выбирать' },
          'default': 'ru'
        },
        field: {
          name: 'Озвучка торрентов',
          description: 'Предпочитаемый язык в окне выбора озвучки (выбор запоминается для раздачи, сменить — долгое нажатие на серии). AC3/DTS перекодируются через TorrServer (нужна сборка TorrServer-gst)'
        }
      });

    }).catch(function () { /* main process not answering; skip the panel */ });
  });
})();
