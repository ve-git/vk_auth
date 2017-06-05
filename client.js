"use strict";
const axios = require('axios');
require( './styles/main.css' ); // подключаем файл стилей

let groupId;
let accessToken;

// TODO так как группа без сообщений не нужна, к серверу должно быть только одно обращение
// типа "дай окончательный результат". А сервер должен получить этот результат,
// переупаковать его и отдать клиенту  в виде объекта:
// и, в процессе получения, при необходимости, переполучить токен доступа
axios( {
  url: '/show_group'
}).then((response) => {
  groupId = response.data.groupId;
  return axios( {
    url: '/show_msg'
  });
}).then((response) => {  // Выводим тексты сообщений на страницу пользователя.
  const parentElement = document.getElementById('messages');
  for (let i = 0; i < 5; i += 1) {
    if (response.data[i].text === undefined) break;
    const newChild = document.createElement('div');
    newChild.innerHTML = `<p><a href="https://vk.com/wall-${groupId}_${response.data[i].id}">Сообщение ${i+1}</a><p>`+ 
      `${response.data[i].text}<p><p>`;
    parentElement.appendChild(newChild);
  };
}).catch(function (err) {
  console.log('err.message =' + err.message);
  alert( 'Ошибка: '+ err.message);
});

