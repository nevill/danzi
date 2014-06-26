var assert = require('assert');
var storage = require('../lib/storage');

var uploadPath = __dirname + '/upload';
var config = { path: uploadPath };

describe('Filesystem Storage', function() {
  var fsStorage = new storage.FileSystemStorage(uploadPath);

  it('should have a upload path', function() {
    assert.equal(fsStorage.uploadPath, uploadPath);
  });
});
