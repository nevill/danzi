var Emitter = require('events').EventEmitter,
    path = require('path'),
    im = require('imagemagick');

/*
 * filesystem storage
 * - save request.files to uploadPath
 * - if request.files.each has many versions
 *    process each version
 *    store each version to uploadPath
 *
 * aws storage
 * - upload request.files to S3
 * - if request.files.each has many versions
 *    process each version
 *    store each version to S3
 */
var Storage = require('./storage');
var FileSystemStorage = Storage.FileSystemStorage,
    AwsStorage = Storage.AwsStorage;

function generateNameWithVersion(file, version) {
  var extname = path.extname(file);
  return path.basename(file, extname) + "-" + version + extname;
}

function hasFiles(request) {
  return request.files && Object.keys(request.files).length > 0;
}

module.exports = function(options) {
  var uploadPath = options.path;
  var nameGenerator = options.nameGenerator;

  var emitter = new Emitter();
  var storage;

  if (options.storage && options.storage.name === "aws") {
    storage = new AwsStorage(options.storage.options);
  }
  else {
    storage = new FileSystemStorage(uploadPath);
  }

  return processUpload;

  function processUpload(req, res, next) {
    if (hasFiles(req)) {

      var counter = Object.keys(req.files).length;

      emitter.on('save', function() {
        counter -= 1;
        // console.log("Successfully saved, remain: %d", counter);
        if (counter === 0) {
          next();
        }
      });

      var end = res.end;
      res.end = function(data, encoding) {
        end.call(res, data, encoding);
        // process different versions
        if (req.files) {
          var versionCounter = 0;

          Object.keys(req.files).forEach(function(key) {
            var file = req.files[key];

            if (file.versions) {
              var versions = Object.keys(file.versions);
              versionCounter += versions.length;
              versions.forEach(function(type) {
                process.nextTick(function() {
                  processVersion(file, type);
                });
              });
            }
          });

          if (versionCounter > 0) {
            emitter.on('processed', function() {
              versionCounter -= 1;

              if (0 === versionCounter && req.files.versionMonitor) {
                req.files.versionMonitor.emit('complete');
              }
            });
          }
        }
      };

      for(var key in req.files) {
        var file = req.files[key];
        if ('function' === typeof nameGenerator) {
          file.dest = nameGenerator(file);
        }
        storage.save(file, mainFileStorageHandler(file, next));
      }
    }
    else {
      next();
    }
  }

  // Attributes `file.uri`, `file.name`, 'file.versions' can be used by controller code
  // others are attrs (like `file.dest`) ONLY for internal use
  function mainFileStorageHandler(file, next) {
    return function(err, dest) {
      if (err) {
        next(err);
      }
      else {
        file.uri = dest;
        file.name = path.basename(dest);

        emitter.emit('save');
      }
    };
  }

  function processVersion(file, version) {
    var size = file.versions[version];
    var destName = generateNameWithVersion(file.uri, version);
    var dest = path.join(path.dirname(file.path), destName);

    im.resize({
        srcPath: file.path,
        dstPath: dest,
        width: size[0],
        height: size[1]
      },
      resizeHandler(dest, destName, file.type));
  }

  function resizeHandler(src, dest, type) {
    var file = { path: src, dest: dest, type: type };

    return function(err) {
      if(err) {
        //TODO handle error
        //  remove src can occur an error for testing
        // console.log("Error in resizeHandler: %s", err);
      }
      else {
        storage.save(file, function(err, dest) {
          //TODO handle error
          // console.log('Processed file: %s', dest);
          emitter.emit('processed');
        });
      }
    };
  }
};
