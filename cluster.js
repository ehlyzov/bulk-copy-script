'use strict';

require('dotenv').config();

const cp = require('child_process'),
      fs = require('fs'),
      path = require('path'),
      util = require('util')

if (process.argv[2] == '--split') {
    console.log('Generating index files...');
    try {
        var out = cp.execFileSync(path.resolve('./split.sh'), ["-j", 1,"-b",process.env.BATCH, process.env.SOURCE_DIR, process.env.TARGET_DIR], {
            cwd: __dirname
        });
        console.log(out.toString());
    } catch (e) {
        console.log("Error", e);
    }
} else {
    console.log('If no files found please run this script with --split argument.');
}

const compressor = cp.fork('compressor.js');
let uploaders = [];
// let verifiers = [];

const MAX_UPLOADERS = 2;
const MAX_VERIFIERS = 1;
const TARGET_PATH = process.env.SEL_PATH;
const fileProcessed = path.resolve('./processed.txt');

compressor.on('message', (msg) => {
  console.log("Received:", msg);
  switch (msg.cmd) {
  case 'init':
    initCompressor(compressor);
    break;
  case 'new':
    uploaders[msg.id].send(msg);
  }
});

const initUploader = (id) => {
  const uploader = cp.fork('upload.js', [id]);

  uploader.on('message', (msg) => {
    console.log("from Uploader:", msg);
    switch (msg.cmd) {
    case 'init':
      break;
    case 'next':
      compressor.send({ cmd: 'request', id: msg.id });
      break;
    case 'done':
      cp.execSync(util.format("rm %s", msg.file + '.tar.gz'));
      cp.execSync(util.format("cat %s >> %s", msg.file, fileProcessed));
      break;
    case 'fail':
      uploaders[msg.id] = initUploader(msg.id);
      console.log("Uploader", msg.id, "was restarted");
    }
  })
  return uploader;
}

const initCompressor = (compressor) => {
  console.log("Compressor OK");

  for (let i = 0; i< MAX_UPLOADERS; i++) {
    uploaders.push(initUploader(i));
    console.log("Uploader", i, "is ready");
  }

/*
  for (let i = 0; i< MAX_VERIFIERS; i++) {
    verifiers.push(initVerifier(i));
    console.log("Verifier", i, "is ready");
  }
*/

}

/*

const initVerifier = (id) => {
  const child = cp.fork('verify.js', [TARGET_PATH, id]);

  child.on('message', (msg) => {
    console.log("from Verifier (", id, "):", msg);
    switch (msg.cmd) {
    case 'fail':
      verifiers[msg.id] = initVerifier(msg.id);
      console.log("Verifier", msg.id, "was restarted");
    case 'next':
      child.send()
      break;
    case 'done':
      if (msg.status) {
        successFiles.push(msg.file);
      } else {
        const data = msg.errors.join('\n');
        fs.appendFileSync('errors.txt', data);
        failedFiles.push(msg.file);
      }
    }
  })
  return child;
}

*/
