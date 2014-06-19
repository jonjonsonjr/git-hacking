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
      this.current = this.pop().split('');
    }

    for (var i = 0; this.current.length > 0 && i < this.speed; i++) {
      var key = this.current.shift();
      this.editor.insert(key);
    }
  }.bind(this));
}

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
  } else if (action == 'type') {
    this.push(e.data);
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  } else if (action == 'edit') {
    var lines = e.diff[0].lines;

    lines.forEach(function (line) {
      if (line.type == 'add') {
        this.push(function () {
          this.editor.goto(line.ln);
        }.bind(this));
        this.push(line.content);
      } else if (line.type == 'del') {
        this.push(function () {
          this.editor.goto(line.ln);
        }.bind(this));
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
      this.editor.commit();
    }.bind(this));
    this.push(e.message);
    this.push(function () {
      this.editor.closeFile();
    }.bind(this));
  } else if (action == 'git merge') {
    this.push('git merge' + '\n');
    this.push(function () {
      this.editor.commit();
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

  while (typeof e == 'function') {
    e();
    e = this.q.shift();
  }

  if (e === undefined) {
    this.consume();
    return this.pop();
  }

  return e;
};
