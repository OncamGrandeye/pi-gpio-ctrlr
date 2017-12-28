// Require HTTP server and create server with function handler()
var http = require('http').createServer(handler);

// Require filesystem module (to actually read web content from the 'public' folder)
var fs = require('fs');

// Require socket.io module and pass the http object (server)
//var io = require('socket.io')(http)

// Listen for incoming connections on tcp port 8080
http.listen(8080);

// Create the web server
function handler(req, res) {
  console.log('req: ' + req.url);
  // Should convert URL to lower case to avoid case sensitivity on requests
  var url = req.url == '/' ? '/index.html'  : req.url;
  fs.readFile(__dirname + '/public' + url, function(err, data) {
    if (err) {
      // Write HTML error
      res.writeHead(404, {'Content-Type':'text/html'});
      return res.end("404 Not Found");
    }
    // Write HTML response
    if (url == '/script.js') {
      res.writeHead(202, {'Content-Type':'application/javascript'});
    } else { 
      res.writeHead(202, {'Content-Type':'text/html'});
    }
    res.write(data);
    return res.end();
  });
}

