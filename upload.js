'use strict';

require('dotenv').config();

var request = require('request'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    Queue = require('bull')

if (process.argv.length <= 3) {
  console.log("Usage: " + __filename + " SOURCE_DIR SWIFT_PATH");
  process.exit(1);
}


var sourceDir = path.resolve(process.argv[2]);
var targetPath = path.resolve(process.argv[3]);

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
        console.log(resp.body)
        if (err) {
          next(err);
        } else {
          next(null, JSON.parse(body));
        }
      })
    }],
    callback
  )
}

function verify(env, data, callback) {
  if (_.isEmpty(data.response['Errors'])) {
    callback(null, true);
  } else {
    callback({ msg: "Data wasn't uploaded properly" });
  }
}

var queue = Queue('files', 6379, '127.0.0.1');

authenticate(function(err, session) {
  console.log(session);

  queue.process(function(job, done) {
    upload({ session: session }, { file:  job.data.file }, function(err, data) {
      console.log("Job ID", job.jobId, "file", job.data.file);
      verify({ session: session}, { file: job.data.file, response: data }, function(err, data) {
        if (err) {
          done(Error('error verifying. Rerun job.'));
          job.retry();
        } else {
          console.log("Job", job.jobId, "completed");
          done();
        }
      })
    });
  })
});

// queue.add({ file: path.resolve('./tmp/OUT5.txt.tar.gz') }, { attempts: 3 });
// to run: pm2 -i 4 start upload.sh
