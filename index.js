var async = require('async');
var parse = require('diff-parse');
var detect = require('language-detect');
var tempWrite = require('temp-write');
var Repo = require('git').Repo;
var Commit = require('git').Commit;
var Consumer = require('./lib/consumer');
var Editor = require('./lib/editors/ace');

var args = process.argv.slice(2);
// give it the path to a repo on your local machine
// TODO: Add cloning so we can point it at github
var repoPath = args[0] || '.';
var editor = new Editor();
var consumer = new Consumer([], editor, {speed: 1});

new Repo(repoPath, function (err, repo) {
  if (err) return console.log(err);
  loadHashes(repo, function (err, hashes) {
    if (err) return console.log(err);

    function foo() {
      var hash = hashes.pop();
      var args = ['--raw', '--no-abbrev', '--numstat', '--pretty=raw', hash];
      repo.git.call_git('', 'show', '', {color: 'never'}, args, function (err, text) {
        if (err) return console.log(err);
        var commit = Commit.list_from_string(repo, text)[0];
        var changes = commit.filechanges;
        var keys = Object.keys(changes);

        // just skip over the commit if there are more than 50 files
        if (keys.length > 50) return foo();

        async.eachSeries(keys, function (key, cb) {
          handleFile(repo, changes[key], cb);
        }, function (err) {
          done(commit);
          if (hashes.length > 0) {
            process.nextTick(foo);
          }
        });
      });
    }

    foo();
  });
});

// array of hashes in chronological order
function loadHashes(repo, cb) {
  // 25575 is max number of commits before "Error: stdout maxBuffer exceeded."
  var args = ['--max-count=25575', 'HEAD'];
  var options = {color: 'never'};
  repo.git.call_git('', 'rev-list', '', options, args, function (err, res) {
    if (err) return cb(err);
    cb(null, res.split('\n'));
  });
}

// Push events based on what happened to each file in this commit
function handleFile(repo, change, cb) {
  if (change.what == 'A') {
    repo.blob(change.b_blob, function (err, blob) {
      if (err) return console.log(err);

      getFileType(blob.data, change.path, function (err, type) {
        if (err) return console.log(err);

        consumer.add({
          action: "open file",
          file: change.path,
          type: type,
          data: ""
        });
        consumer.add({
          action: "type",
          data: blob.data
        });
        cb();
      });
    });
  } else if (change.what == 'D') {
    consumer.add({
      action: "delete file",
      file: change.path
    });
    cb();
  } else if (change.what == 'M') {
    repo.git.call_git('', 'diff', [], {}, [change.a_blob, change.b_blob], function (err, out) {
      if (err) return console.log(err);
      repo.blob(change.a_blob, function (err, blob) {
        if (err) return console.log(err);

        getFileType(blob.data, change.path, function (err, type) {
          if (err) return console.log(err);

          consumer.add({
            action: "open file",
            file: change.path,
            type: type,
            data: blob.data
          });
          consumer.add({
            action: "edit",
            blob: change.a_blob,
            diff: parse(out)
          });
          cb();
        });
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
    consumer.add({
      action: "git merge",
      message: log.message
    });
  } else {
    var adds = keys.filter(function (key) {
      return changes[key].what != 'D';
    });

    if (adds.length > 0) {
      consumer.add({
        action: "git add",
        files: adds
      });
    }
    consumer.add({
      action: "git commit",
      message: log.message,
      changes: changes
    });
  }
}

function getFileType(content, name, cb) {
  tempWrite(content, name, function (err, path) {
    if (err) return cb(err);
    detect(path, function (err, type) {
      if (err) return cb(err);

      type = (type) ? type : 'text';
      type = type.toLowerCase().replace(/[ -]/g, '_');
      type = (type === 'objective_c') ? 'objectivec' : type;
      type = (type === 'shell') ? 'nix' : type;

      if (type === 'c' || type === 'c++') {
        type = 'c_cpp';
      }
      cb(null, type);
    });
  });
}
