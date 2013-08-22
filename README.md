# DanZi

  A uploader middleware for express application.
  DanZi (担子 dānzǐ in Chinese) means a burden, which is usually used in oral language.

## Installation

```js
$ npm install danzi
```

## Options
  - `path` A writeable path to store the uploaded file
  - `storage` A hash contains the cloud service info

## Usage

  It must be used with express, and be put after bodyParser, see example below.

## Example

Write a simple app.js in your express project
```js
var express = require('express');
var danzi = require('danzi');

var app = express();
app
  .use(express.bodyParser())
  .use(danzi({path: __dirname + '/public/upload'}));

app.post('/upload', function(req, res) {
  res.send('Your file is placed at: ' + req.files.file.uri);
});

app.listen(3000);
console.log('listening on port 3000');
```
Then do a test
```bash
node app.js

curl -X POST --form "file=@/path/to/file" "http://localhost:3000/upload"
```
You will find your file is put into directory `public/upload`

## License

  MIT
