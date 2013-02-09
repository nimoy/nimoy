// C O R E  server

var compiler = require('./_compile')
, http = require('http')
, router = require('./_route')
, bricoleur = require('./_brico')
, util = require('util')
, shoe = require('shoe');

compiler(['_components/core.js'],'_components/public/bundle.min.js'); // compile client side....

var server = http.createServer(router); // map requests to router
server.listen(8888);

var brico = new bricoleur('./_components');

var sock = shoe(function(stream){
  stream.pipe(brico.stream).pipe(stream);
});
sock.install(server, '/bus');
sock.on('connection', function(conn) { 
  // install connections here
});
