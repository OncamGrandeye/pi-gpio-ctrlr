// Require HTTP server and create server with function handler()
var http = require('http').createServer(handler);

// For parsing URLs
var url = require('url')

// Require filesystem module (to actually read web content from the 'public' folder)
var fs = require('fs');

// Require socket.io module and pass the http object (server)
var io = require('socket.io')(http)


var gpio = require('onoff').Gpio;

var pin4 = new gpio(4, 'out');
var pin17 = new gpio(17, 'in', 'both');

// Listen for incoming connections on tcp port 8080
http.listen(8080);

// Create the web server
function handler(req, res) {
  console.log('req: ' + req.url);

  // Using URL to parse the requested URL
  var path = url.parse(req.url).pathname;

  // Should convert URL to lower case to avoid case sensitivity on requests
  if (path == '/') {
    index = fs.readFile(__dirname + '/public/index.html', function(err, data) {
          return handlerReadFile(res, err, data, 'text/html');
        });
  } else if (/\.(js)$/.test(path)) {
    // Managing route for javascript files
    index = fs.readFile(__dirname + '/public' + path, function(err, data) {
          return handlerReadFile(res, err, data, 'text/plain');
        });
  } else if (/\.(api)$/.test(path)) {
    // This is the route for the API to allow automated control of the GPIO for
    // Automated testing.
    res.writeHead(500, {'Content-Type':'text/html'});
    return res.end('Server error');
  } else {
      // Write HTML error
      res.writeHead(404, {'Content-Type':'text/html'});
      return res.end("404 Not Found");
  }
}

// function to handle file requests
function handlerReadFile(res, err, data, contentType) {
  if (err) {
    res.writeHead(404, {'Content-Type':'text/html'});
    return res.end('404 Not Found');
  }
  res.writeHead(200, {'Content-Type':contentType});
  res.write(data);
  return res.end();
}

io.sockets.on('connection', function(socket) {
  var value = 'open';
  pin17.watch(function(err, val) {
    if (err) {
      console.error('There was an error', err);
      return;
    }
    value = val ? 'closed' : 'open';
    socket.emit('status', {Id:4,State:value});
  });
  socket.on('state', function(data) {
    console.log(data);
    value = data.Action;
    pinValue = Number(value == 'close');
    pinStatus = pin4.readSync();
    console.log('PIN: ' + pinStatus + ', Update: ' + pinValue);
    if (pinValue != pin4.readSync()) {
      pin4.writeSync(pinValue);
      console.log('Updated pin state');
    }
  });
});

process.on('SIGINT', function() {
  // Turn the output pin OFF
  pin4.writeSync(0);
  // Free PIN resources
  pin4.unexport();
  pin17.unexport();
  process.exit();
});
