"use strict";
// hwListOfMessages 
// https://vk.com/editapp?id=6043692&section=options

const express = require('express');
const app = express();

const axios = require('axios'); 
const querystring = require('querystring');

// настройки, полученные при регистрации приложения
// ID приложения
var appId = '6043692';

// Защищенный ключ доступа
var safeKey = 'WjqsadfIolhKYd9zLz4g';  

//Сервисный ключ доступа
var serviceAccessKey = '8614e0c68614e0c68614e0c6ad8648d8ea886148614e0c6df371136f6d5d4995408feec';

// настройки для сайта и порта
let port = '3002';
let urlCallback = 'http://localhost:'+port;

// прочие переменные программы
let temporaryKey = '';              // временный ключ
let temporaryKeyRequested = false;  // признак того, что ожидается получение временного ключа

let accessToken = '';               // ключ (токен) доступа

let groupId;                        // идентификатор группы
let showButton = true;              // признак того, что нужно показывать кнопку на странице

let resultString;                   // строка для хранения html
let query;                          // строка для параметров url
let info = '';                      // строка для сообщения, выводимого перед кнопкой

app.get('/', function(req, res){
  // Есди необходимо показать страницу с кнопкой  - показываем
  if (showButton) {
    showButton = false;
    resultString = '<!DOCTYPE html><html><head><title>MyHomeWork</title></head>'+
      '<body><p>'+info+'<p><form action="'+urlCallback+'" method="get"><p><input type="submit" value ="Click me!">'+
      '</p></form></body></html>';
    res.send(resultString);
  }

  // Если есть временный ключ - пропускаем этап его получения   
  else if (temporaryKey){                   
      showUserInfo(res);
  }

  // Если временный ключ не запрошен - запрашиваем
  else if (!temporaryKeyRequested) {  
    temporaryKeyRequested = true;  

    query = querystring.stringify({
      client_id     : appId, 
      display       : 'page', 
      redirect_uri  : urlCallback, 
      scope         : 'groups', 
      response_type : 'code', 
      v             : '5.64'
    });
    console.log('=== temporary key ===');
    console.log('https://oauth.vk.com/authorize?'+query);
    res.redirect('https://oauth.vk.com/authorize?'+query);
  }

  // Если временный ключ запрошен и получен - читаем и запоминаем его, и идем дальше
  else if (req.query.code !== undefined){ 
    temporaryKeyRequested = false;
    temporaryKey = req.query.code;
    showUserInfo(res);
  }

  // Если временный ключ был запрошен, но не получен, сообщаем об этом 
  else{ 
    temporaryKeyRequested = false;  
    res.send('Не удалось получить временный ключ: ' + res.query[error] + ' ' + res.query[error_description]);  
  }
}).listen(port);
console.log('Server started on port '+ port);

function showUserInfo(res){
  Promise.resolve(null)

  // Если ключ доступа получен, используем его, иначе пытаемся получить его
  .then(x=>{
    if (accessToken) {
      return accessToken;
    }    
    query = querystring.stringify({
      client_id     : appId, 
      client_secret : safeKey,
      redirect_uri  : urlCallback, 
      code          : temporaryKey
    });
    console.log('=== access token ===');
    console.log('https://oauth.vk.com/access_token?'+query);
    return (
      axios.get('https://oauth.vk.com/access_token?'+query)
      .then(function (response) {
        if (!response.data.access_token){  
          throw new Error('Access token is not received. '+response.data.error +' : '+ response.data.error_description);
        }  
        accessToken = response.data.access_token;
        return accessToken;
      } 
    ))
  })

  // По полученному ключу пытаемся получить ИД первой из групп пользователя
  .then(x=>{
    console.log('=== groups ====');        
    query = querystring.stringify({access_token:accessToken, v:'5.64'});  
    console.log('https://api.vk.com/method/groups.get?'+query);
    return axios.post('https://api.vk.com/method/groups.get?'+query);
  })

  // По полученному ИД группы пытаемся получить список сообщений на стене группы
  .then(function (response) {
    if (!response.data.response.count){  
      throw new Error('Данные не получены. '+response.data.error +' : '+ response.data.error_description);
    }
    if (response.data.response.count == 0){ throw new Error("Current user hasn't any groups. "); }
    groupId = response.data.response.items[0];
    console.log('=== messages ====');        
    query = querystring.stringify({owner_id:'-'+groupId, access_token:accessToken, v:'5.64'});  
    console.log('https://api.vk.com/method/wall.get?'+query);
    return axios.post('https://api.vk.com/method/wall.get?'+query);
  })

  // Выводим тексты сообщений на страницу пользователя. И почему в Node нет JSX?!
  .then(function (response) {
    resultString = '<html><head><title>MyHomeWork</title></head><body bgcolor="white"><table border="1"><caption>Результаты</caption>'
    for(let i=0; i<5; i++){
      if (response.data.response.items[i].text === undefined) break;
      //TODO разобраться, что пишется во from_id и в owner_id
      resultString += '<tr><td><a href="https://vk.com/wall-'+groupId+'_'+response.data.response.items[i].id+'">&nbsp;'
        +(i+1)+'&nbsp;</a></td><td>'+response.data.response.items[i].text+'</td></tr>';
    }
    resultString += '</table></body></html>';
    res.send(resultString);
  })

  // Советуем перезайти, так как, вероятно, устарел временный ключ. Если не поможет - 
  // значит какая-то другая причина, которую программа на отслеживает, например API изменилось
  .catch(function (err) {
    temporaryKey = '';
    accessToken = '';
    console.log('err.message =' + err.message);
    showButton = true;
    info = 'Key is expired. Try to push the button to reconnect.'
    res.redirect(urlCallback);
   });     
}

