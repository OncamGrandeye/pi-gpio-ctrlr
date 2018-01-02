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

var testPinWatch = [];

// Pin - Physical PIN on the Raspberry PI
// Type - The Type of PIN
// ID - The ID for Programmable PINs
// Text - The text to display for the PIN
var defaultPinData = [
	{Pin:1,  Type:"3V3"},
	{Pin:2,  Type:"5V"},
	{Pin:3,  Type:"I2C", Id:2,    Text:""},
	{Pin:4,  Type:"5V"},
	{Pin:5,  Type:"I2C", Id:3,    Text:""},
	{Pin:6,  Type:"GND"},
	{Pin:7,  Type:"GPIO", Id:4,   Text:"", IsActive:true},
	{Pin:8,  Type:"UART", Id:14,  Text:""},
	{Pin:9,  Type:"GND"},
	{Pin:10, Type:"UART", Id:15,  Text:""},
	{Pin:11, Type:"GPIO", Id:17,  Text:"", Relay:false},
	{Pin:12, Type:"GPIO", Id:18,  Text:""},
	{Pin:13, Type:"GPIO", Id:27,  Text:""},
	{Pin:14, Type:"GND"},
	{Pin:15, Type:"GPIO", Id:22,  Text:""},
	{Pin:16, Type:"GPIO", Id:23,  Text:""},
	{Pin:17, Type:"3V3"},
	{Pin:18, Type:"GPIO", Id:24,  Text:""},
	{Pin:19, Type:"SPI", Id:10,   Text:""},
	{Pin:20, Type:"GND"},
	{Pin:21, Type:"SPI", Id:9,    Text:""},
	{Pin:22, Type:"GPIO", Id:25,  Text:""},
	{Pin:23, Type:"SPI", Id:11,   Text:""},
	{Pin:24, Type:"SPI", Id:8,    Text:""},
	{Pin:25, Type:"GND"},
	{Pin:26, Type:"SPI", Id:7,    Text:""},
	{Pin:27, Type:"DNC", Text:"Do NOT connect!"},
	{Pin:28, Type:"DNC", Text:"Do NOT connect!"},
	{Pin:29, Type:"GPIO", Id:5,   Text:""},
	{Pin:30, Type:"GND"},
	{Pin:31, Type:"GPIO", Id:6,   Text:""},
	{Pin:32, Type:"GPIO", Id:12,  Text:""},
	{Pin:33, Type:"GPIO", Id:13,  Text:""},
	{Pin:34, Type:"GND"},
	{Pin:35, Type:"GPIO", Id:19,  Text:""},
	{Pin:36, Type:"GPIO", Id:16,  Text:""},
	{Pin:37, Type:"GPIO", Id:26,  Text:""},
	{Pin:38, Type:"GPIO", Id:20,  Text:""},
	{Pin:39, Type:"GND"},
	{Pin:40, Type:"GPIO", Id:21,  Text:""}
];

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
  } else if (path == '/config') {
    // We will muck around with GET/PUT later...
    res.writeHead(200, {'Content-Type':'application/json'});
    res.write(JSON.stringify(defaultPinData));
    return res.end();
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

function handleGpioWatch(socket, err, val, id) {
  if (err) {
    console.error('There was an error', err);
    return;
  }
  var status = {
    Id:id,
    State:val ? 'closed' : 'open'
  };
  console.log('emitting status: ' + JSON.stringify(status));
  socket.emit('status', status);
};

io.sockets.on('connection', function(socket) {

  var value = 'open';
  pin17.watch(function(err, val) { handleGpioWatch(socket, err, val, 17); });
//  pin4.watch(function(err, val) { handleGpioWatch(socket, err, val, 4); });

//  testPinWatch.push({id:4,  pin: new gpio(4,  'out', 'both') });
  testPinWatch.push({id:23, pin: new gpio(23, 'in', 'both') });
  testPinWatch.push({id:24, pin: new gpio(24, 'in', 'both') });

  for (var key in testPinWatch) {
    var testPin = testPinWatch[key];
    if (testPin.hasOwnProperty('pin') && testPin.pin != null) {
      console.log('watching pin ' + testPin.id);
      testPin.pin.watch(function(err, val) { handleGpioWatch(socket, err, val, testPin.id); });
    }
  }

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

  socket.on('_state', function(data) {
    console.log('cmd: "state", data: ' + data);
    for (var key in gpioPins) {
      var gpioPin = gpioPins[key];
      if (gpioPin.hasOwnProperty('pin')) {
        newState = Number(data.Action == 'close');
        if (gpioPin.pin.readSync() != newState) {
          gpioPin.pin.writeSync(newState);
        }
      }
    }
  });

});

process.on('SIGINT', function() {
  // Turn the output pin OFF
  pin4.writeSync(0);
  // Free PIN resources
  pin4.unexport();
  pin17.unexport();

  for (var key in testPinWatch) {
    var testPin = testPinWatch[key];
    if (testPin.hasOwnProperty('pin') && testPin.pin != null) {
      console.log('closing pin ' +  testPin.id);
      testPin.pin.unexport();
    }
  }

  process.exit();
});
