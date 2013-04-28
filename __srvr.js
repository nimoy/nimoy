var Bricoleur = require('./_brico')
, pre = require('./_pre')
, map = require('./_map')
, rtr = require('./_rtr')
, usr = require('./_usr')
, http = require('http')
, shoe = require('shoe')

var port = 80 // set port

var _usr = new usr() // setup user
_usr.buildUsers(function (user) {
  Object['_'+user.host] = new Bricoleur(user) // not too sure about this prob a temp hack
})

var _map = new map('./_wilds') // map _wilds modules
var _pre = new pre({js:['./__clnt.js'],css:'./_wilds/_css',compress:true})
_map.out.pipe(_pre.in)

var _rtr = new rtr() // do routing 
var server = http.createServer(_rtr.handleReqs) // handle http requests
server.listen(port)
var sock = shoe({log:'error'}, _rtr.handleData) // handle socket connections 
sock.install(server, '/bus')
