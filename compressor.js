'use strict';

const path = require('path'),
      fs = require('mz/fs'),
      _ = require('lodash'),
      cp = require('child_process'),
      util = require('util')

const sourceDir = path.resolve(process.env.SOURCE_DIR);
const targetDir = path.resolve(process.env.TARGET_DIR);

const compress = (file) => {
  const tarPath = file + '.tar.gz';
  cp.execSync(util.format("tar -czf %s -C %s -T %s", tarPath, sourceDir, file));
  return tarPath;
}

fs.readdir(targetDir).then(function(items) {
  return _
    .chain(items)
    .filter(function(item) {
      return item.match(/\.txt$/)
    })
    .map(function(item) {
      return item.replace(/\..+$/, '')
    })
    .map(function(name) {
      return path.join(targetDir, name + '.txt');
    })
    .value()
}).then(function(fileList) {
  console.log("Files found:", fileList.length);
  process.on('message', (msg) => {
    console.log("Compressor received:", msg);
    switch (msg.cmd) {
    case 'request':
      if (fileList.length === 0) {
        console.log('Queue is empty');
      } else {
        const newFile = fileList.shift();
        console.log("Picked:", newFile);
        process.send({ cmd: 'new', id: msg.id, indexFile: newFile, file: compress(newFile) });
      }
      break;
    case 'exit':
      process.exit(0);
      break;
    }
  });
  process.send({ cmd: 'init' });
})


