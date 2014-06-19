var async = require('async');
var parse = require('diff-parse');
var Repo = require('git').Repo;
var Consumer = require('./lib/consumer');
var Editor = require('./lib/editors/ace');
var queue = [];

// give it the path to a repo on your local machine
// TODO: Add cloning so we can point it at github
var repoPath = '.';

// Load up a repo and walk through the logs
new Repo(repoPath, function (err, repo) {
  repo.log(function (err, logs) {
    logs.reverse();

    async.eachSeries(logs, function (log, callback) {
      var changes = log.filechanges;
      var keys = Object.keys(changes);

      async.eachSeries(keys, function (key, cb) {
        handleFile(repo, changes[key], cb);
      }, function (err) {
        done(log);
        callback();
      });
    }, function (err) {
      var editor = new Editor();
      var consumer = new Consumer(queue, editor, {speed: 1});
      if (editor.name !== 'ace') consumer.start();
    });
  });
});

// Push events based on what happened to each file in this commit
function handleFile(repo, change, cb) {
  if (change.what == 'A') {
    repo.blob(change.b_blob, function (err, blob) {
      if (err) return console.log(err);
      queue.push({
        action: "open file",
        file: change.path,
        data: ""
      });
      queue.push({
        action: "type",
        data: blob.data
      });
      cb();
    });
  } else if (change.what == 'D') {
    queue.push({
      action: "delete file",
      file: change.path
    });
    cb();
  } else if (change.what == 'M') {
    repo.git.call_git('', 'diff', [], {}, [change.a_blob, change.b_blob], function (err, out) {
      if (err) return console.log(err);
      repo.blob(change.a_blob, function (err, blob) {
        queue.push({
          action: "open file",
          file: change.path,
          data: blob.data
        });
        queue.push({
          action: "edit",
          blob: change.a_blob,
          diff: parse(out)
        });
        cb();
      });
    });
  }
}

// Push an event for the action that generated the commit
function done(log) {
  var changes = log.filechanges;
  var keys = Object.keys(changes);
  var isMerge = log.parents.length > 1;

  if (isMerge) {
    queue.push({
      action: "git merge",
      message: log.message
    });
  } else {
    queue.push({
      action: "git add",
      files: keys
    });
    queue.push({
      action: "git commit",
      message: log.message
    });
  }
}
