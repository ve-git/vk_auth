const express = require('express');
const app = express();
const axios = require('axios');
const { cfgToString } = require('./cfg_axios');
const { APP_ID, SAFE_KEY, PORT, SITE } = require('./constants');
const mustache = require('mustache');
const fs = require('fs');
let debug = require('debug')('vk_auth');

// переменные программы
let temporaryKey = '';              // временный ключ
let temporaryKeyRequested = false;  // признак того, что ожидается получение временного ключа

let accessToken = '';               // ключ (токен) доступа

let showButton = true;              // признак того, что нужно показывать кнопку на странице
let info = '';                      // строка для сообщения, выводимого перед кнопкой
let cfg = {};                       // конфигурация для axios
let view = {};                      // объект для mustache

// Получаем информацию со страницы первой группы пользователя.
// Если необходимо - сначала получаем ключ доступа.
function showUserInfo(res) {
  Promise.resolve(null)

  // Если ключ доступа получен, используем его, иначе пытаемся получить его
  .then(()=>{
    if (accessToken) {
      return accessToken;
    }
    cfg = {
      method: 'get',
      url: 'https://oauth.vk.com/access_token',
      params: {
        client_id: APP_ID,
        client_secret: SAFE_KEY,
        redirect_uri: SITE,
        code: temporaryKey
      }
    };
    debug('=== access token ===\n' + cfgToString(cfg));
    return (
      axios(cfg)
      .then(function (response) {
        if (!response.data.access_token) {
          throw new Error('Access token is not received. ' + response.data.error + ' : ' + response.data.error_description);
        }
        accessToken = response.data.access_token;
        return accessToken;
      }
    ));
  })

  // По полученному ключу пытаемся получить ИД первой из групп пользователя
  .then(()=>{
    cfg = {
      method: 'post',
      url: 'https://api.vk.com/method/groups.get',
      params: {
        access_token: accessToken,
        v: '5.64'
      }
    };
    debug('=== groups ==== \n' + cfgToString(cfg));
    return axios(cfg);
  })

  // По полученному ИД группы пытаемся получить список сообщений на стене группы
  .then(function (response) {
    if (!response.data.response.count) {
      throw new Error('Данные не получены. ' + response.data.error + ' : ' + response.data.error_description);
    }
    if (response.data.response.count === 0) { throw new Error('Current user hasn\'t any groups.'); }
    view.groupId = response.data.response.items[0];
    view.article = [];
    cfg = {
      method: 'post',
      url: 'https://api.vk.com/method/wall.get',
      params: {
        owner_id: '-' + view.groupId,
        access_token: accessToken,
        v: '5.64'
      }
    };
    debug('=== messages ====\n' + cfgToString(cfg));
    return axios(cfg);
  })

  // Выводим тексты сообщений на страницу пользователя.
  .then(function (response) {
    for (let i = 0; i < 5; i += 1) {
      if (response.data.response.items[i].text === undefined) break;
      view.article.push({
        number: (i + 1),
        response_id: response.data.response.items[i].id,
        text: response.data.response.items[i].text
      });
    }
    fs.readFile('template.html', 'utf8', function (err, data) {
      if (err) {
        throw new Error('File \'template.html\' not found. ' + err.message);
        // после появления ошибки программа остановится, а не пойдет в .catch !
        // Существует ли промис для чтения из файла?
      } else {
        res.send(mustache.render(data, view));
      }
    });
  })

  // Советуем перезайти, так как, вероятно, устарел временный ключ. Если не поможет -
  // значит какая-то другая причина, которую программа на отслеживает, например API изменилось
  .catch(function (err) {
    temporaryKey = '';
    accessToken = '';
    console.log('err.message =' + err.message);
    showButton = true;
    info = 'Key is expired. Try to push the button to reconnect.';
    res.redirect(SITE);
  });
}


function main() {
  app.use(function (req, res, next) {
    console.log('LOGGED');
    next();
  });


  app.get('/', function (req, res) {
  // Если необходимо показать страницу с кнопкой  - показываем
    if (showButton) {
      showButton = false;

      fs.readFile('button_templ.html', 'utf8', function (err, data) {
        if (err) {
          throw new Error('File \'button_templ.html\' not found. ' + err.message);
        } else {
          res.send(mustache.render(data, { info: info, site: SITE }));
        }
      });

    // Если есть временный ключ - пропускаем этап его получения
    } else if (temporaryKey) {
      showUserInfo(res);

    // Если временный ключ не запрошен - запрашиваем
    } else if (!temporaryKeyRequested) {
      temporaryKeyRequested = true;

      cfg = {
        method: 'get',
        url: 'https://oauth.vk.com/authorize',
        params: {
          client_id: APP_ID,
          display: 'page',
          redirect_uri: SITE,
          scope: 'groups',
          response_type: 'code',
          v: '5.64'
        }
      };
      debug('=== temporary key ===\n' + cfgToString(cfg));
      res.redirect(cfgToString(cfg));

    // Если временный ключ запрошен и получен - читаем и запоминаем его, и идем дальше
    } else if (req.query.code !== undefined) {
      temporaryKeyRequested = false;
      temporaryKey = req.query.code;
      showUserInfo(res);

    // Если временный ключ был запрошен, но не получен, сообщаем об этом
    } else {
      temporaryKeyRequested = false;
      res.send('Не удалось получить временный ключ: ' + res.query.error + ' ' + res.query.error_description);
    }
  }).listen(PORT, function () {
    /* eslint-disable no-console */
    console.log('Server started on port ' + PORT);
    /* eslint-enable no-console */
  });
}


main();

/*
  Результат последней проверки линтером (.\node_modules\.bin\eslint index.js):

   44:13  warning  Unexpected unnamed function   func-names
   69:9   warning  Unexpected unnamed function   func-names
   90:9   warning  Unexpected unnamed function   func-names
   99:42  warning  Unexpected unnamed function   func-names
  112:10  warning  Unexpected unnamed function   func-names
  115:5   warning  Unexpected console statement  no-console
  124:16  warning  Unexpected unnamed function   func-names
  129:48  warning  Unexpected unnamed function   func-names
  171:19  warning  Unexpected unnamed function   func-names

✖ 9 problems (0 errors, 9 warnings)
*/
