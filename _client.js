// CLIENT

var websocStream = require('websocket-stream')
var host = window.document.location.host.replace(/:.*/, '')

if (window.location.protocol === 'https:') var ws = websocStream('wss://'+host)
if (window.location.protocol === 'http:') var ws = websocStream('ws://'+host)

var ml = require('multilevel')
var db = ml.client()
ws.pipe(db.createRpcStream()).pipe(ws)

var brico = require('./brico')
var b = new brico(db)
