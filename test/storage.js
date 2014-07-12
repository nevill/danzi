var assert = require('assert');
var fs = require('fs');
var nock = require('nock');
var path = require('path');
var storage = require('../lib/storage');

var uploadPath = __dirname + '/upload';
var fixtureFile = path.join(__dirname, 'fixture', 'danzi.jpg');

var config = {
  path: uploadPath
};

describe('Filesystem Storage', function() {
  var fsStorage = new storage.FileSystemStorage(uploadPath);

  after(function(done) {
    var exec = require('child_process').exec;
    var filePath = path.join(uploadPath, '*');

    exec('rm -rf ' + filePath, done);
  });

  it('should have a upload path', function() {
    assert.equal(fsStorage.uploadPath, uploadPath);
  });

  it('should store a file on local filesystem', function(done) {
    fsStorage.save({
      name: 'danzi.jpg',
      path: fixtureFile,
      type: 'image/jpeg'
    }, function(err, dest) {
      fs.exists(dest, function(exists) {
        assert.ok(exists);
        done();
      });
    });
  });
});

describe('Aws S3 Storage', function() {
  var options = {
    key: 'a very random key',
    secret: 'highly encrypted secert',
    bucket: 'danzi-test',
    'x-amz-acl': 'public-read'
  };

  var awsStorage = new storage.AwsStorage(options);

  before(function() {
    var scope = nock('https://s3.amazonaws.com', {
      filteringScope: function(scope) {
        return /^https:\/\/.*\.s3.amazonaws.com/.test(scope);
      }
    })
      .filteringRequestBody(/.*/, '*')
      .filteringPath(/.*/, '*')
      .put('*', '*')
      .reply(200);
    nock.disableNetConnect();
  });

  after(function() {
    nock.restore();
  });

  it('should save the file to S3', function(done) {
    awsStorage.save({
      name: 'danzi.jpg',
      path: fixtureFile,
      dest: '/images/danzi.jpg',
      type: 'image/jpeg'
    }, done);
  });

});
