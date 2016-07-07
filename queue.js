'use strict';

var Queue = require('bull'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash')

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " path/to/directory");
  process.exit(1);
}

var sourceDir = path.resolve(process.argv[2]);
var queue = Queue('files', 6379, '127.0.0.1');

fs.readdir(sourceDir, function(err, items) {
  _
    .chain(items)
    .filter(function(item) {
      return item.match(/\.txt$/)
    })
    .map(function(item) {
      return item.replace(/\..+$/, '')
    })
    .each(function(name) {
      queue.add({ file: path.join(sourceDir,name + '.txt.tar.gz'), contentFile: path.join(sourceDir, name + '.txt')})
    })
    .value()
});

queue.close()


