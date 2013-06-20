var telepath = require('tele')
, browserify = require('browserify')
, uglifyJS = require('uglify-js')
, stylus = require('stylus')
, asyncMap = require('slide').asyncMap
, chain = require('fern').chain
, fs = require('fs')

module.exports = function (opts) { // MAPPER
  telepath(this) 

  var self = this
  , stat = null // hacky stat var for putting stat obj
  , destCSS = './_wilds/_styles.css'
  , destJS = './_wilds/_bundle.js'
  , CSS = ''

  // watch _wilds dir and reload brico's on change
  if (opts.watch === true) fs.watch(opts.dir, function (event, file) { 
    if (event === 'change') {
      fs.stat(opts.dir+'/'+file, function (err, stats) {
        if (err) throw new Error(err)
        if (!stat) stat = stats
        if (stat.size !== stats.size) {
          // trigger recompile
          console.log(file+' modified on: '+stat.mtime+' new size is: '+stat.size)
        }
      })
    }
  })
 
  this.survey = function (cb) { 
    var map = []
    , first = chain.first
    , last = chain.last

    fs.readdir(opts.dir, function (err, files) {
      if (err) throw new Error(err)
      asyncMap(files, HandleFile, function () {
        // send map
        compile(cb) 
      })
    })
  }

  function HandleFile (file, cb) {
    var filepath = opts.dir+'/'+file
    if (file.split('.')[1] === 'js') fs.readFile(filepath, function (err, buffer) {
      var data = buffer.toString()
      , moduleData = null
      , buf = ''

      for (var i=0;i<data.length;i++) { // parse out data object
        buf += data[i]
        if (data[i] === '}' && data[1] === '*' && data[2] === '{') {
          moduleData = JSON.parse(buf.toString().replace('/*',''))
          moduleData.filePath = filePath
          break
        }
      }

      if (moduleData && moduleData.deps) { // if there are deps handle them
        async.each(moduleData.deps, function (dep, cb) {
          fs.readFile(dir+'/'+dep, function (err,buffer) {
            moduleData[dep.split('.')[1]] = buffer.toString()
            cb()
          })
        }, function () {
          self.send(moduleData)
          cb()
        })
      } else if (moduleData) {
        self.send(moduleData)
        cb()
      } else cb()
    })
    else cb()
  }

  function compile (cb) {
    fs.readFile(opts.css, function (err, buffer) { // handle css
      if (err) cb(err)
      var styles = buffer.toString()
      stylus.render(styles, {filename:destCSS}, function (err, css) {
        if (err) cb(err)
        fs.writeFile(destCSS, css, compilejs) 
      })
    })

    function compilejs () { 
      var b = browserify(opts.js)
      asyncMap(opts.js, function (item, cb) {
        var path = item.split('/')
        if (path[1] === '_wilds') b.require(item, {expose:path[2].replace('.js','')}) 
        cb()
      }, function () {
        b.bundle(function (err, bundle) {
          if (opts.compress === true) {
            var bundlemin = uglifyjs.minify(bundle,{fromstring: true})
            bundle = bundlemin.code
          }
          fs.writeFile(destJS, bundle, function (err) {
            cb(err)
          })
        })   
      })
    }
  }
}
