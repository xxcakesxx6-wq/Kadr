# Как опубликовать Кадр 1.0.0

## Что куда загружать

**В Code** — содержимое папки `Kadr-GitHub`: исходники, `package.json`, lock-файл, скрипты, README и лицензии.

**В Releases** — `Kadr-1.0.0-windows-x64.zip` и `SHA256SUMS.txt`.

Сам `Kadr.exe`, DLL, `node_modules`, `dist`, резервные копии и профили в Git не добавляются. Файлы больше 100 MiB обычный GitHub-репозиторий не принимает; для программы предназначен раздел Releases.

## 1. Создать репозиторий

На GitHub нажми **New repository**.

- Название: `Kadr`.
- Description: `Приложение для выбора и просмотра кино на Windows: каталог, коллекция, цветовые темы и внешний плеер.`
- Видимость: Public после проверки условий сторонних компонентов, указанных в `THIRD_PARTY_NOTICES.md`.
- Не добавляй README и лицензию через мастер: они уже есть в подготовленной папке.

Темы репозитория: `windows`, `electron`, `movies`, `video-player`, `media-center`.

## 2. Загрузить исходники

Вариант через сайт: **uploading an existing file**, затем перетащи содержимое чистой папки `Kadr-GitHub`. Не загружай вместо файлов ZIP с исходниками — иначе GitHub покажет только архив.

Сообщение первого коммита: **Кадр 1.0.0 — первый релиз**.

Или открой терминал в этой папке и выполни, заменив `USERNAME` на свой GitHub-логин:

```sh
git init -b main
git add .
git commit -m "Кадр 1.0.0 — первый релиз"
git remote add origin https://github.com/USERNAME/Kadr.git
git push -u origin main
```

Git может попросить настроить имя и email автора коммита и войти в GitHub. Не вставляй токен в исходники или URL репозитория.

## 3. Создать первый релиз

Открой **Releases → Draft a new release**.

- Tag: `v1.0.0`, создать на ветке `main`.
- Title: `Кадр 1.0.0`.
- Description: вставь текст из `docs/RELEASE-1.0.0.md`.
- Assets: добавь `Kadr-1.0.0-windows-x64.zip` и `SHA256SUMS.txt`.
- Отметь **Set as the latest release**.

GitHub автоматически добавит архивы исходников по тегу. Проверь файлы в черновике, затем нажми **Publish release**.

## Повторить сборку

```sh
npm ci
npm run check
npm run package
```

Для автоматической сборки можно открыть **Actions → Windows build → Run workflow**. Этот workflow создаёт артефакт, но сам ничего не публикует.

## Использованные инструкции

- [Ограничения файлов GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
