const express = require('express');
const app = express();
const axios = require('axios');
const { cfgToString } = require('./cfg_axios');
const { APP_ID, SAFE_KEY, PORT, SITE } = require('./constants');
const debug = require('debug')('vk_auth');

// переменные программы
let temporaryKey = '';              // временный ключ
let temporaryKeyRequested = false;  // признак того, что ожидается получение временного ключа
let accessToken = '';               // ключ (токен) доступа
let cfg = {};                       // конфигурация для axios
let groupId;                        // Id группы в ВКонтакте
let firstTime = true;

function getToken(res) {
  if (accessToken) {
    res.redirect('/messages.html');
    return;
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
  axios(cfg)
  .then(function (response) {
    if (!response.data.access_token) {
      throw new Error('Access token is not received. ' + response.data.error + ' : ' + response.data.error_description);
    }
    accessToken = response.data.access_token;
    debug('accessToken = ' + accessToken);
    res.redirect('/messages.html');
  });
}

function main() {
  // гаранитируем, что какой бы маршрут не был указан в первый раз,
  // будет отправка на страницу index.html
  app.use(function (req, res, next) {
    if (firstTime) {
      firstTime = false;
      app.use(express.static('.'));
      res.redirect('/index.html');
    } else {
      next();
    }
  });

  app.get('/get_token', function (req, res) {
    if (temporaryKey) {
      getToken(res);
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
      getToken(res);
    // Если временный ключ был запрошен, но не получен, сообщаем об этом
    } else {
      temporaryKeyRequested = false;
      debug('Не удалось получить временный ключ: '); // + res.query.error + ' ' + res.query.error_description);
      res.send('');
    }
  });

  app.get('/show_group', function (req, res) {
    axios({
      method: 'get',
      url: 'https://api.vk.com/method/groups.get',
      params: {
        access_token: accessToken,
        v: '5.64',
        count: '1'
      }
    }).then((response) => {
      if (!response.data.response.count) {
        throw new Error('Данные не получены. ' + response.data.error + ' : ' + response.data.error_description);
      }
      groupId = response.data.response.items[0];
      res.send({ groupId: groupId });
    });
  });

  app.get('/show_msg', function (req, res) {
    axios({
      method: 'post',
      url: 'https://api.vk.com/method/wall.get',
      params: {
        owner_id: '-' + groupId,
        access_token: accessToken,
        v: '5.64',
        count: '5'
      }
    }).then((response) => {
      res.send(response.data.response.items);
    });
  });

  app.listen(PORT, function () {
    /* eslint-disable no-console */
    console.log('Server started on port ' + PORT);
    /* eslint-enable no-console */
  });
}

main();

