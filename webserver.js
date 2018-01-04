// Require HTTP server and create server with function handler()
var http = require('http').createServer(handler);

// For parsing URLs
var url = require('url')

// Require filesystem module (to actually read web content from the 'public' folder)
var fs = require('fs');

// Require socket.io module and pass the http object (server)
var io = require('socket.io')(http)

// Using 'pigpio' instead of 'onoff' in order to support servos
var gpio = require('pigpio').Gpio;

// The 'pins' collections maintains the 'gpio' instances and contain the following elements:
//      data:     The GPIO data from the configuration
//      gpio:     The instance of the GPIO object (for control and interrupt handling)
//      servo:    Use to control a servo (a bit more involved that simple on/off
var pins = [];

// Pin - Physical PIN on the Raspberry PI
// Type - The Type of PIN
// ID - The ID for Programmable PINs
// Text - The text to display for the PIN
// Mode - INPUT | OUTPUT | SERVO (for motion)
var defaultPinData = [
	{Pin:1,  Type:"3V3"},
	{Pin:2,  Type:"5V"},
	{Pin:3,  Type:"I2C", Id:2,    Text:""},
	{Pin:4,  Type:"5V"},
	{Pin:5,  Type:"I2C", Id:3,    Text:""},
	{Pin:6,  Type:"GND"},
	{Pin:7,  Type:"GPIO", Id:4,   Text:"Motion", Mode:'SERVO'},
	{Pin:8,  Type:"UART", Id:14,  Text:""},
	{Pin:9,  Type:"GND"},
	{Pin:10, Type:"UART", Id:15,  Text:""},
	{Pin:11, Type:"GPIO", Id:17,  Text:"Relay Monitor", Mode:'INPUT'},
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

/*******************************************************************************
* The web server request handler function (where the magic happens!).
*******************************************************************************/
function handler(req, res) {

  console.log('req: ' + req.url);

  var method = req.method;
  var request = req.url.replace(/^[\/]+|[\/]+$/g, '').split('/');
  try {
    var input = JSON.parse(req.body);
  } catch (e) {
    var input = {};
  }
  console.log('{\n\tmethod: ' + method + '\n\trequest: ' + request + '\n\tinput: ' + JSON.stringify(input) + '\n}');


  // Using URL to parse the requested URL
  var path = url.parse(req.url).pathname;

  // Should convert URL to lower case to avoid case sensitivity on requests
  if (path == '/') {
console.log('length should be 0 ' + request.length);
    index = fs.readFile(__dirname + '/public/index.html', function(err, data) {
          return handlerReadFile(res, err, data, 'text/html');
        });
  } else if (/\.(js)$/.test(path)) {
    // Managing route for javascript files
    index = fs.readFile(__dirname + '/public' + path, function(err, data) {
          return handlerReadFile(res, err, data, 'text/plain');
        });

  } else {

    switch (request.shift().toLowerCase()) {

      case 'api': {  return onCommand(request.shift(), res);  break; }

      case 'config': {
        switch (method) {
          case 'GET': { return onGetConfig(request, res);     break; }
          case 'POST': {
            // Update multiple or single
            break;
          }
          // Delete is NOT supported
        }
        break;
      }

      default: {
        // Write HTML error
        res.writeHead(404, {'Content-Type':'text/html'});
        return res.end("404 Not Found");
      }
    }
  }
}

/*******************************************************************************
* Simple file request function
*******************************************************************************/
function handlerReadFile(res, err, data, contentType) {
  if (err) {
    res.writeHead(404, {'Content-Type':'text/html'});
    return res.end('404 Not Found');
  }
  res.writeHead(200, {'Content-Type':contentType});
  res.write(data);
  return res.end();
}

function onGetConfig(params, res) {
  var type = params.shift();
  var id = params.shift();
  var retVal = [];

  console.log('requesting type: ' + type + ', id: ' + id);

  var pinData = defaultPinData;
  for (var key in defaultPinData) {
    var pinConfig = pinData[key];
    if (pinConfig.hasOwnProperty('Id')) {
      if (pinConfig.Type === 'GPIO') {
        var pinConfig = getGPIO(pinConfig.Id).data;
      }
      if ((type == null || pinConfig.Type.equalIgnoreCase(type)) &&
          (id == null || pinConfig.Id.toString() === id)) {
        retVal.push(pinConfig);
      }
    } else if (type == null) {
      retVal.push(pinConfig);
    }
  }

  res.writeHead(200, {'Content-Type':'application/json'});
  res.write(JSON.stringify(retVal));
  return res.end();
}

function onCommand(params, res) {
  try {
    var action = JSON.parse('{"' + params
                  .replace(/&/g, '","')
                  .replace(/=/g, '":"') + '"}');
  } catch (e) {
    var action = {};
  }

  try {
    // The command and GPIO id must be provided
    if (action.hasOwnProperty('cmd') && action.hasOwnProperty('id')) {
      var pin = getGPIO(action.id);
      if (pin !== null && !(pin.data.hasOwnProperty('Mode') && pin.data.Mode === 'INPUT')) {
        switch(action.cmd) {

          case 'open':  { pin.setState(0); break; }
          case 'close': { pin.setState(1); break; }

          default: { throw 'Commnand "' + action.cmd + '" is not supported'; }
        }

        res.writeHead(200, { 'Content-Type':'text/plain' });
        res.write('Command succeeded!');
        return res.end();

      } else {
        throw 'Pin does not exist or is defined as INPUT';
      }
    } else {
      throw 'API parameters missing (cmd=<action>&id=<pin-id>';
    }

  } catch (e) {
    res.writeHead(500, {'Content-Type':'text/plain'});
    return res.end(e);
  }
}


/*******************************************************************************
* All important pin object used for monitoring and controlling the GPIO
*******************************************************************************/
function Pin(data) {
  var options = {
    mode: gpio.OUTPUT,
    alert: false
  };

  if (data.Mode === 'INPUT') {
    options.mode = gpio.INPUT,
    options.alert = true
  }

  // Functions that are passed out to setInterval and gpio.on will not run in
  // the same context as this pin so 'this' is stored to a local variable pin
  var pin = this;

  this.data = data;
  this.gpio = new gpio(data.Id, options);;

  if (options.alert) {
    this.gpio.on('alert', function(level, tick) { pin.updatePinState(level); });
  }

  if (data.Mode !== 'SERVO' ) {
    this.servo = null;
    this.getState = function() { return this.gpio.digitalRead(); };
    this.setState = options.mode === gpio.INPUT ?
          function(value) { console.log('gpio-' + this.data.Id + ' Ignoring request to write to INPUT'); } :
          function(value) {
            console.log('gpio-' + this.data.Id + ' write->' + value);
            this.gpio.digitalWrite(value);
            this.updatePinState();
          };
  } else {
    this.servo = {
          timer: null,
          pulseWidth: 1000,
          increment: 100
    };
    // The state of a servo is determined by the presence of an interval timer
    this.getState = function() { return Number(this.servo.timer !== null); };

    this.setState = function(value) {
                      console.log('gpio-' + this.data.Id + ' servo->' + value);
                      if (value === 0) {
                        // Deactivate the servo by stoping the call to the timer
                        // function.
                        clearInterval(this.servo.timer);
                        this.servo.timer = null;
                        this.gpio.digitalWrite(0);
                      } else {
                        // Activate the servo by calling a function to update the
                        // servo value on the pin at a regular interval.
                        this.servo.timer = setInterval( function() {
                              pin.gpio.servoWrite(pin.servo.pulseWidth);
                              pin.servo.pulseWidth += pin.servo.increment;
                              if (pin.servo.pulseWidth >= 2000) {
                                pin.servo.increment = -100;
                              } else if (pin.servo.pulseWidth <= 1000) {
                                pin.servo.increment = 100;
                              }
                            }, 125);
                      }
                      this.updatePinState();
                    };
  }

  this.updatePinState = function(state, err) {
    if (err) {
      console.err('Encountered error', err);
      return;
    }
    if (state == null) {
      state = this.getState();
    }
    this.data.IsActive = (state !== 0);
    io.sockets.emit('status', { Id: this.data.Id, State: (this.data.IsActive ? 'closed' : 'open') });
  };

  this.updatePinState(this.getState());
}


/*******************************************************************************
* Turns off all pins and clears the pins array
*******************************************************************************/
function clearGPIO() {
  for (var key in pins) {
    var pin = pins[key];
    if (pin.hasOwnProperty('gpio')) {
      pin.setState(0);
    }
  }
  pins = [];
}


/*******************************************************************************
* Loads the pins from the file or the default
*
* NOTE: Persistent configuration is not implemented yet
*******************************************************************************/
function loadGPIO(socket) {
  if (pins.length === 0) {

    var pinData = defaultPinData;
    for (var key in pinData) {

      var pinConfig = pinData[key];
      if (pinConfig.hasOwnProperty('Id')) {

        if (pinConfig.Type == 'GPIO') {
          var pin = new Pin(pinConfig);
          console.log('Partial {Id: ' + pin.data.Id + ', Mode:"' + pin.data.Mode + '", IsActive: ' + pin.data.IsActive  + '}');
          pins.push(pin);
        }
      }
    }
  }
}

/*******************************************************************************
* Gets a GPIO pin from its ID (will return I2C, UART and SPI type pins)
*******************************************************************************/
function getGPIO(id) {
  for (var key in pins) {
    pin = pins[key];
    if (pin.hasOwnProperty('data')) {
      if (pin.data.Id == id)
        return pin;
    }
  }

  console.log('gpio-' + id + ' was not found.');
  return null;
}



/*******************************************************************************
*
* Handles the incoming socket.io connection to insure the PINS array is loaded
* and handling socket.io requests to open/close output pins.
*
* NOTE: The on 'state' should be more robust to insure requests are made only
*       on the OUTPUT and SERVO mode pins and change the nomenclature to
*       'activate/deactivate' instead of 'open/close'.
*******************************************************************************/
io.sockets.on('connection', function(socket) {

  loadGPIO(socket);

  socket.on('state', function(data) {
    console.log('cmd: "state", data: ' + JSON.stringify(data));
    var pin = getGPIO(data.Id);
    if (pin != null) {
      newState = Number(data.Action === 'close');
      console.log('gpio-' + pin.data.Id + ' ' + pin.getState() + '->' + newState);
      if (pin.getState() !== newState) {
        pin.setState(newState);
      } else if (pin.getState() !== Number(pin.data.IsActive)) {
        console.log('gpio-' + pin.data.Id + ' is already ' + (pin.data.IsActive ? 'opened.' : 'closed.'));
        pin.updatePinState(pin.getState());
      }
    }
  });

});


/*******************************************************************************
* This would insure the resources used by 'onoff' were properly free'd but this
* seems to have no effect when using 'pigpio' (could be that pigpio reuires
* sudo in order to execute?).
*******************************************************************************/
process.on('SIGINT', function() {
  clearGPIO();
  process.exit();
});



String.prototype.equalIgnoreCase = function(str) {
  return (str != null
          && typeof str === 'string'
          && this.toUpperCase() === str.toUpperCase());
}
