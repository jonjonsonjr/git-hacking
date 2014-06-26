/*
 * This class is responsible for translating "big" events into smaller
 * events that can be consumed on keypress.
 *
 * Big events:
 *  open file
 *  type
 *  edit
 *  git add
 *  git commit
 *  git merge
 *
 */
module.exports = Consumer;

function Consumer(queue, editor, options) {
  options = (options === undefined) ? {} : options;
  this.queue = queue;
  this.speed = options['speed'] || 1;
  this.editor = editor;
  this.current = [];
  this.q = [];

  this.editor.on('keypress', function (e) {
    if (this.q.length === 0) {
      this.consume();
    }

    if (this.current.length === 0) {
      var p = this.pop();

      while (p === undefined) {
        this.consume();
        p = this.pop();
      }
      this.current = p.split('');
    }

    for (var i = 0; this.current.length > 0 && i < this.speed; i++) {
      var key = this.current.shift();
      this.editor.insert(key);
    }
  }.bind(this));
}

Consumer.prototype.add = function (e) {
  this.queue.push(e);
};

// Pop off a "big" event and add it to the "little" event queue
Consumer.prototype.consume = function () {
  if (this.queue.length == 0) process.exit();

  var e = this.queue.shift();
  this.e = e;
  var action = e.action;

  if (action == 'open file') {
    this.push(this.editor.name + ' ' + e.file + '\n');
    this.push(function () {
      this.editor.openFile(e);
    }.bind(this));
  } else if (action == 'delete file') {
    this.push('git rm ' + e.file + '\n');
  } else if (action == 'type') {
    this.push(e.data);
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  } else if (action == 'edit') {
    var lines = e.diff[0].lines;

    var comp = function (a, b) {
      return b.ln - a.ln;
    };
    var dels = lines.filter(function (l) {
      return l.type == 'del'
    }).sort(comp);
    var adds = lines.filter(function (l) {
      return l.type == 'add'
    }).sort(comp).reverse();

    dels.concat(adds).forEach(function (line) {
      if (line.type == 'add') {
        this.push(function () {
          this.editor.goto(line.ln);
        }.bind(this));
        this.push(line.content);
      } else if (line.type == 'del') {
        this.push(function () {
          this.editor.delete(line.ln);
        }.bind(this));
      }
    }.bind(this));
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  } else if (action == 'git add') {
    this.push('git add ' + e.files.join(' ') + '\n');
  } else if (action == 'git commit') {
    this.push('git commit' + '\n');
    this.push(function () {
      this.editor.commit(buildCommitMessage(e));
      this.editor.goto(0);
    }.bind(this));
    this.push(e.message);
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  } else if (action == 'git merge') {
    this.push('git merge' + '\n');
    this.push(function () {
      this.editor.commit(buildCommitMessage(e));
      this.editor.goto(0);
    }.bind(this));
    this.push(e.message);
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  }
};

// Add to the "little" event queue
Consumer.prototype.push = function (e) {
  this.q.push(e);
};

// Grab a "little" event from the queue -- either a text object that we
// will "type" or a callback that we need to execute
Consumer.prototype.pop = function () {
  var e = this.q.shift();

  if (!e) {
    this.consume();
  }

  if (typeof e == 'function') {
    e();
    return '';
  }

  return e;
};

function buildCommitMessage(e) {
  var keys = Object.keys(e.changes);
  var msg =
    "# Please enter the commit message for your changes. Lines starting\n" +
    "# with '#' will be ignored, and an empty message aborts the commit.\n" +
    "# On branch master\n" +
    "# Changes to be committed:\n" +
    "#   (use \"git reset HEAD <file>...\" to unstage)\n" +
    "#\n";

  msg += keys.map(function (k) {
    var c = e.changes[k];
    if (c.what == 'D') {
      return '#       deleted:    ' + c.path;
    }

    if (c.what == 'A') {
      return '#       new file:   ' + c.path;
    }

    if (c.what == 'M') {
      return '#       modified:   ' + c.path;
    }
  }).join('\n');

  msg += '\n#';

  return msg;
}
