/*
 * Stub editor that doesn't really do anything. Implement these methods
 * to simulate the editor of your choice!
 *
 * TODO:
 * vim
 * emacs
 * nano
 */
var keypress = require('keypress');
var EventEmitter = require('events').EventEmitter
var ee = new EventEmitter();

module.exports = Editor;

function Editor(options) {
  this.name = 'editor';

  keypress(process.stdin);
  process.stdin.on('keypress', function (ch, key) {
    if (key && key.ctrl && key.name == 'c') {
      process.stdin.pause();
    } else {
      ee.emit('keypress');
    }
  }.bind(this));
  process.stdin.setRawMode(true);
  process.stdin.resume();

  setInterval(function () {
    ee.emit('keypress');
  }, 10);
}

Editor.prototype.on = function (event, cb) {
  ee.on(event, cb);
};

Editor.prototype.openFile = function (filename, text) {
  console.log('\nopening file');
};

Editor.prototype.closeFile = function () {
  console.log('\nclosing file');
};

Editor.prototype.goto = function (line) {
  console.log('\ngo to line ', line);
};

Editor.prototype.delete = function (line) {
  console.log('\ndelete line ', line);
};

Editor.prototype.insert = function (text) {
  process.stdout.write(text);
};

Editor.prototype.commit = function () {
  console.log('\nopen commit message');
};
