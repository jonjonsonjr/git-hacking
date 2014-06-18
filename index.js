var parse = require('diff-parse');
var Git = require('git').Git;
var Repo = require('git').Repo;
var Commit = require('git').Commit;
var exec = require('child_process').exec;

new Repo('.', function (err, repo) {
  repo.commits(function (err, commits) {
    commits.forEach(function (c) {
      console.log(c.id);
      var commit = new Commit(repo, c.id);
      commit.diffs(function (err, diffs) {
        diffs.forEach(function (d) {
          console.log(JSON.stringify(parse(d.diff)));
        });
      });
    });
  });
});

// Use this later when we're not testing
function clone(url, cb) {
  var child = exec('git clone ' + url, function (err, stdout, stderr) {
    if (err !== null) return cb(err);
    return cb(null);
  });
}
