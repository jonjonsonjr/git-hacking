var async = require('async');
var parse = require('diff-parse');
var keypress = require('keypress');
var Repo = require('git').Repo;
var exec = require('child_process').exec;
var queue = [];

// Load up a repo and walk through the logs
new Repo('.', function (err, repo) {
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
      console.log(queue);
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
        file: change.path
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
      queue.push({
        action: "open file",
        file: change.path
      });
      queue.push({
        action: "edit",
        diff: parse(out)
      });
      cb();
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
      action: "git merge"
    });
  } else {
    queue.push({
      action: "git add",
      files: keys
    });
    queue.push({
      action: "git commit",
      short_message: log.short_message,
      message: log.message
    });
  }
}

// Capture keypress events
/*keypress(process.stdin);
process.stdin.on('keypress', function (ch, key) {
  console.log(key);
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
  }
});
process.stdin.setRawMode(true);
process.stdin.resume();
*/

// Use this later when we're not testing
function clone(url, cb) {
  var child = exec('git clone ' + url, function (err, stdout, stderr) {
    if (err !== null) return cb(err);
    return cb(null);
  });
}
