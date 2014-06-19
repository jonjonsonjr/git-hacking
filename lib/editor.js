module.exports = Editor;

function Editor(options) {
  this.name = 'editor';
}

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
  //console.log('Inserting text: ', text);
  process.stdout.write(text);
};

Editor.prototype.commit = function () {
  console.log('\nopen commit message');
};
