'use strict';

require('dotenv').config();

const CONN_MAX = 5;

var request = require('request'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash')

const targetPath = path.resolve(process.argv[2]);
const ID = parseInt(process.argv[3]);

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

function getList(env, data, callback) {
  request({
    url: env.session.storageUrl + '/' + targetPath +'/?limit=1&format=json',
    method: 'GET',
    headers: {
      'X-Auth-Token': env.session.authToken,
      'Accept': 'application/json'
    }
}

authenticate(function(err, session) {

  if (err) {
    process.send({ cmd: 'fail', id: ID });
  }

  process.on('message', function(msg) {
    let lines = fs.readFileSync(msg.file, 'utf8').split('\n');
    lines.pop();
    const sample = _.sampleSize(lines, 50);
    verify({ session: session }, { files:  sample }, function(err, opStatus) {
      if (err) {
        process.send({ cmd: 'fail', id: ID, error: err });
      } else {
        process.send({ cmd: 'done', file: msg.file, status: opStatus});
        process.send({ cmd: 'next', id: ID });
      }
    });
  });

  process.send({ cmd: 'init' });
  process.send({ cmd: 'next', id: ID });
});

