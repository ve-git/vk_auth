// Работа с конфигами axios
// Нужно для получения url c параметрами

exports.cfgToString = function (cfg) {
  let result = '';
  let isFirst = true;

  if (cfg.url === undefined) return result;
  result = cfg.url;
  if (cfg.params === undefined) return result;
  if (cfg.params.size) return result;
  result += '?';

  Object.keys(cfg.params).forEach(key => {
    if (isFirst) {
      result += key + '=' + cfg.params[key];
      isFirst = false;
    } else {
      result += '&' + key + '=' + cfg.params[key];
    }
  });

/*
// Цикл for key in .. перечисляет свойства из цепочки прототипов и потому no restricted
  for (let key in cfg.params) {
    if (isFirst) {
      result += key + '=' + cfg.params[key];
      isFirst = false;
    } else {
      result += '&' + key + '=' + cfg.params[key];
    }
  }
*/
  return result;
};

