// Работа с конфигами axios
// Нужно для получения url c параметрами

exports.cfgToString = function(cfg){
  let result = '';  
  let isFirst = true;

  if (cfg.url === undefined) return result;
  result = cfg.url;
  if (cfg.params === undefined) return result;
  if (cfg.params.size) return result;
  result +='?'
  for (key in cfg.params){
    if (isFirst) {
      result +=  key + '=' + cfg.params[key];
      isFirst = false;
    }  
    else{
      result +=  '&' + key + '=' + cfg.params[key];
    }
  }
  return result;
}

