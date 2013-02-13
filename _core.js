// C O R E  server
var http = require('http')
, Router = require('./_route')
, surv = require('./_surv')
, bricoleur = require('./_brico')
, provision = require('./_prov')
, shoe = require('shoe');

var routes = [{url:"/",file:"./_wilds/frame.html"},{url:"/bundle.min.js",file:"./_wilds/bundle.min.js"}];
var router = new Router(routes);
var server = http.createServer(router.handleRoutes);
server.listen(8888);

var brico = new bricoleur();
var survey = new surv({dir:'./_wilds'});

survey.scan(function(map){ // callback should be err only & scan should generate server/client maps
  console.log(survey.map_client);  
  console.log(survey.map_server);  
  brico.init();
});

var prov = new provision({ // browserify + compress client side js
  src : ['./_brico.js','./_wilds/core.js'],
  dst : './_wilds/bundle.min.js',
  compress : true
}, function (msg) {
  console.log(msg);
}); 

var sock = shoe(function(stream){
  stream.pipe(brico.stream).pipe(stream);
});
sock.install(server, '/bus');
sock.on('connection', function(conn) { // trigger create streams func in brico
  // send map ... 
});
