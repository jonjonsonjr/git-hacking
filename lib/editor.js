module.exports = Editor;

function Editor(options) {
}

Editor.prototype.openFile = function (filename) {
  console.log('vim ' + filename);
};

Editor.prototype.closeFile = function () {
  console.log(':wq');
};

Editor.prototype.goto = function (line) {
  //console.log('Move to line: ', line);
};

Editor.prototype.delete = function (line) {
  //console.log('Deleting line: ', line);
};

Editor.prototype.insert = function (text) {
  //console.log('Inserting text: ', text);
  console.log(text);
};

Editor.prototype.commit = function () {
  //console.log('Opening new commit message');
};
