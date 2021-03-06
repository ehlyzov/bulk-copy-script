'use strict';

require('dotenv').config();

var request = require('request'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash')

var targetPath = path.resolve(process.env.SEL_PATH);
var ID = parseInt(process.argv[2]);

// authorize
function authenticate(callback) {
  request({
    url: 'https://auth.selcdn.ru',
    headers: {
      'X-Auth-User': process.env.SEL_USER,
      'X-Auth-Key': process.env.SEL_PASS
    }
  }, function(err, data) {
    if (err) {
      throw Error(err)
    }
    if (data.statusCode == 204) {
      var session = {
        authToken: data.headers['x-auth-token'],
        storageUrl: data.headers['x-storage-url']
      }
      callback(null, session);
    } else {
      throw Error('Auth error');
    }
  });
};

function upload(env, data, callback) {
  async.waterfall([
    function(next) {
      fs.readFile(data.file, next);
    },
    function(blob, next) {
      request({
        url: env.session.storageUrl + targetPath + '?extract-archive=tar.gz',
        method: 'PUT',
        headers: {
          'X-Auth-Token': env.session.authToken,
          'Accept': 'application/json'
        },
        body: blob
      }, function(err, resp, body) {
        console.log(resp.statusCode)
        console.log(resp.headers)
        console.log("BODY:", resp.body)
        if (err) {
          next(err);
        } else {
          next(null, true);
        }
      })
    }],
    callback
  )
}

authenticate(function(err, session) {
  console.log(session);

  if (err) {
    process.send({ cmd: 'fail', id: ID });
  }

  process.on('message', function(msg) {
    upload({ session: session }, { file:  msg.file }, function(err, data) {
      if (err) {
        process.send({ cmd: 'fail', id: ID, error: err });
      } else {
        process.send({ cmd: 'done', file: msg.indexFile });
        process.send({ cmd: 'next', id: ID });
      }
    });
  });

  process.send({ cmd: 'init' });
  process.send({ cmd: 'next', id: ID });
});
