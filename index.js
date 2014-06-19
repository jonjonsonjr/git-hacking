var async = require('async');
var parse = require('diff-parse');
var keypress = require('keypress');
var Repo = require('git').Repo;
var exec = require('child_process').exec;
var Editor = require('./lib/editor');
var editor = new Editor();
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
      consume(queue);
    });
  });
});

function consume(queue) {
  if (queue.length == 0) return;

  var e = queue.shift();
  var action = e.action;

  if (action == 'open file') {
    editor.openFile(e.file);
  } else if (action == 'type') {
    editor.insert(e.data);
    editor.closeFile();
  } else if (action == 'edit') {
    var lines = e.diff[0].lines;

    lines.forEach(function (line) {
      if (line.type == 'add') {
        editor.goto(line.ln);
        editor.insert(line.content);
      } else if (line.type == 'del') {
        editor.goto(line.ln);
        editor.delete(line.ln);
      }
    });
  } else if (action == 'git add') {
    console.log('> git add ' + e.files.join(' '));
  } else if (action == 'git commit') {
    console.log('> git commit');
    editor.commit();
    editor.insert(e.message);
    editor.closeFile();
  } else if (action == 'git merge') {
    console.log('> git merge');
    editor.commit();
  }

  setTimeout(function () {
    consume(queue);
  }, 100);
}

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
        blob: change.a_blob,
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
