var websocket = require('websocket-stream')
, bricoleur = require('./_brico')
, tmp_id = null
, id = null
, host = window.location.host.replace('www.','')
, ws = websocket('ws://'+host)

var brico = new bricoleur()

ws.on('connect', function () {
  tmp_id = new Date().getTime()
  ws.write(JSON.stringify({tmp_id:tmp_id, host:host}))
})

ws.on('data', function (json) {
  var data = JSON.parse(json)

  if (typeof data === 'object') console.dir(data)
 
  if (data[tmp_id]) {
    id = data[tmp_id]
    setInterval(function () {
      bus.write(JSON.stringify({id:id, params:['test',2,'r']}))
    }, 100)
  }

  if (data.id === id) { // handle data -- pass to brico
  }
})


