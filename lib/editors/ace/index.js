var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var EventEmitter = require('events').EventEmitter
var ee = new EventEmitter();

module.exports = Editor;

app.use(express.static(__dirname + '/public'));

http.listen(3000, function(){
  console.log('Open "http://localhost:3000" to git hacking.');
});

function Editor(options) {
  this.name = 'ace';
  io.on('connection', function (socket) {
    socket.on('keypress', function (msg) {
      ee.emit('keypress', msg);
    });
  });
}

Editor.prototype.on = function (event, cb) {
  ee.on(event, cb);
};

Editor.prototype.openFile = function (msg) {
  io.emit('openFile', {
    filename: msg.file,
    text: msg.data
  });
};

Editor.prototype.closeFile = function () {
  io.emit('closeFile', {});
};

Editor.prototype.goto = function (line) {
  io.emit('goto', {
    line: line
  });
  io.emit('insert', {
    text: '\n'
  });
  io.emit('goto', {
    line: line
  });
};

Editor.prototype.delete = function (line) {
  io.emit('delete', {
    line: line
  });
};

Editor.prototype.insert = function (text) {
  if (text === '\t') {
    text = '    ';
  }
  io.emit('insert', {
    text: text
  });
};

Editor.prototype.commit = function () {
  io.emit('commit', {});
};
