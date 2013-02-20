// S U R V E Y O R 
var fs = require('fs')
, async = require('async');

module.exports = function (dir) { // generate a server map and client map
  var self = this;
  this.map_client = [];
  this.map_server = [];
  this.client_files = [];
  this.scan = function (cb) { 
    fs.readdir(dir, function (err, files) {
      async.forEach(files, oggle, function (err) {
        if(err) throw err;
        if(err===null) {
          cb();
        }
      });
    });	
  }
  function oggle (file, cb) { 
    var ext = file.split('.');
    if(ext[0]!='.' && ext[1]==='js') { // exclude hidden files & non js files
      var fileStream = fs.createReadStream(dir+'/'+file);
      fileStream.on('readable', function () {
        var data = fileStream.read().toString();
        var buf = '';
        for (var i=0; i<data.length; i++) {
          buf += data[i];
          if(data[i]==='}') {
            var obj = JSON.parse(buf.replace('/*',''));
            if (typeof obj === 'object') {
              obj.filepath = dir+'/'+file;
              for(var n=0;n<obj.scope.length;n++) {
                if (obj.scope[n]==='client') {
                  self.map_client.push(obj);
                  self.client_files.push(obj.filepath);
                }
                if (obj.scope[n]==='server') self.map_server.push(obj);
              }
            } // log somekind of err
            cb();
            break;
          }
        }
      });
    } else cb();
  }
} 