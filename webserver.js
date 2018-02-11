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

var pins = new Pins(__dirname + '/config/pin-config.json');

// Listen for incoming connections on tcp port 8080
http.listen(8080, '0.0.0.0');


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
	{Pin:7,  Type:"GPIO", Id:4,   Text:"Motion Trigger", Mode:"SERVO" },
	{Pin:8,  Type:"UART", Id:14,  Text:""},
	{Pin:9,  Type:"GND"},
	{Pin:10, Type:"UART", Id:15,  Text:""},
	{Pin:11, Type:"GPIO", Id:17,  Text:"Relay-1"},
	{Pin:12, Type:"GPIO", Id:18,  Text:"Relay-2"},
	{Pin:13, Type:"GPIO", Id:27,  Text:"Trigger-1", Mode:"OUTPUT"},
	{Pin:14, Type:"GND"},
	{Pin:15, Type:"GPIO", Id:22,  Text:"Reset-1", Mode:"PULSE"},
	{Pin:16, Type:"GPIO", Id:23,  Text:"Trigger-2", Mode:"OUTPUT"},
	{Pin:17, Type:"3V3"},
	{Pin:18, Type:"GPIO", Id:24,  Text:"Reset-2", Mode:"PULSE"},
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


/*******************************************************************************
* Pin collection class is used to manage the GPIO type pins by persisting the
* configuration in the file described at 'path' and updating pin Mode and Text.
*******************************************************************************/
function Pins(path) {

  this.path = path;
  this.items = {};

  this.has = (id) => { return this.items.hasOwnProperty(id); };
  this.get = (id) => { return this.items[id]; };
  this.clear = () => { 
    this.forEach( (pin) => { pin.setState(0); });
    this.items = {};
  };

  this.forEach = (cb) => {
    for (key in this.items) {
      if (this.items.hasOwnProperty(key)) {
        cb(this.items[key]);
      }
    }
  }

  var loading = false;

  this.load = (cb) => {

    if (Object.keys(this.items).length === 0) {

      if (loading) {
        console.log('Waiting for load to finish...');
        // Set an timer to try loading again in 1/4 second
        setTimeout( () => { this.load(cb); }, 250);

      } else {
        var pinData = defaultPinData;
        loading = true;

        console.log('Loading pin data from configuration file...');
        fs.readFile(this.path, (err, data) => {
          if (err) {
            console.log('Loading default pin data');
          } else {
            try {
              pinData = JSON.parse(data);
            } catch (e) {
              console.log('Unable to read configuration');
            }
          }

          for (var key in pinData) {
            var pinConfig = pinData[key];
            if (pinConfig.hasOwnProperty('Id')) {
              if (pinConfig.Type == 'GPIO') {
                if (!this.has(pinConfig.Id)) {
                  var pin = new Pin(pinConfig);
                  this.items[pin.data.Id] = pin;
                } else {
                  console.log('DUPLICATE ITEM FOUND: {Id: ' + pinConfig.Id + ', Mode:"' + pinConfig.Mode + '"}');
                }
              }
            }
          }
          loading = false;

          console.log('Pin data read from file!');
          cb();
        });
      }
    } else {
      // Pins are already loaded so callback immediately
      console.log('Pin data loaded!');
      cb();
    }
  };

  this.save = (cb) => {
    console.log('Saving PIN data...');
    var pinData = [];
    this.forEach( (pin) => { pinData.push(pin.data); });
    try {
      fs.unlinkSync(this.path);
    } catch (err) {}
    fs.writeFileSync(this.path, JSON.stringify(pinData, null, 2));
    cb();
  };

};

/*******************************************************************************
* The web server request handler function (where the magic happens!).
*******************************************************************************/
function handler(req, res) {

  console.log('req: ' + req.url);

  var method = req.method;
  var request = req.url.replace(/^[\/]+|[\/]+$/g, '').split('/');
  console.log('{\n\tmethod: ' + method + '\n\trequest: ' + request + '\n}');


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

  } else {

    switch (request.shift().toLowerCase()) {

      case 'api': {  return onCommand(request.shift(), res);  break; }

      case 'config': {
        switch (method) {
          case 'GET': { return onGetConfig(request, res);     break; }
          case 'POST': { return onRequestPost(req, res, onSetConfig); break; }
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

/*******************************************************************************
*******************************************************************************/
function onGetConfig(params, res) {
  var type = params.shift();
  var id = params.shift();
  var retVal = [];

  console.log('requesting type: ' + type + ', id: ' + id);

  pins.load( () => {

    for (var key in defaultPinData) {
      var pinData = defaultPinData[key];
      if (pinData.hasOwnProperty('Id')) {
        if ((type == null || pinData.Type.equalIgnoreCase(type)) &&
            (id == null || pinData.Id.toString() === id)) {
          retVal.push(pins.has(pinData.Id) ? pins.get(pinData.Id).data : pinData);
        }
      } else if (type == null) {
        retVal.push(pinData);
      }
    }

    res.writeHead(200, {'Content-Type':'application/json'});
    res.write(JSON.stringify(retVal));
    return res.end();
  });
}


/*******************************************************************************
*******************************************************************************/
function onRequestPost(req, res, cb) {
  console.log('Handling POST request...');
  var body = '';
  req.on('data', (chunk) => { body+= chunk.toString() });
  req.on('end',  () => { cb(req, body, res) });
}

/*******************************************************************************
*******************************************************************************/
function onSetConfig(req, body, res) {
  console.log('Setting configuration');
  try {
    var input = JSON.parse(body);
  } catch (e) {
    console.log('Unable to parse body');
    var input = [];
  }

  for (var key in input) {
    var newPin = input[key];
    if (newPin.hasOwnProperty('Id') && pins.has(newPin.Id)) {
      var pin = pins.get(newPin.Id);
      pin.data.Mode = newPin.Mode;
      pin.data.Text = newPin.Text;
      console.log('UPDATED: ' + JSON.stringify(pin.data));
    } else {
      console.log('INPUT item is missing Id or does not identify a GPIO Pin');
      console.log('    ' + JSON.stringify(newPin));
    }
  }

  pins.save((err) => {
    if (err) {
      console.error('Error saving configuration', err);
      res.writeHead(500, { 'Content-Type':'text/html'} );
    } else {
      console.log('Configuration saved!');
      res.writeHead(200, { 'Content-Type':'text/html'} );
    }
    res.end();
  });
}

/*******************************************************************************
*******************************************************************************/
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
      if (pins.has(action.id)) {
        var pin = pins.get(action.id);
        if (!(pin.data.hasOwnProperty('Mode') && pin.data.Mode === 'INPUT')) {
          switch(action.cmd) {

            case 'open':  { pin.setState(0); break; }
            case 'close': { pin.setState(1); break; }

            default: { throw 'Commnand "' + action.cmd + '" is not supported'; }
          }

          res.writeHead(200, { 'Content-Type':'text/plain' });
          res.write('Command succeeded!');
          return res.end();

        } else {
          throw 'Pin is not defined as INPUT';
        }
      } else {
        throw 'Pin does not exist';
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
console.log('creating pin ' + data.Pin);

  var options = {
    mode: gpio.INPUT,
    pullUpDown: gpio.PUD_DOWN,
    alert: true
  };

  switch (data.Mode) {
    case 'OUTPUT':
    case 'PULSE':
    case 'SERVO': {
	  options.mode = gpio.OUTPUT;
	  options.alert = false;	
      break;
	}
  }
	  
  // Functions that are passed out to setInterval and gpio.on will not run in
  // the same context as this pin so 'this' is stored to a local variable pin
  var pin = this;

  pin.data = data;
  pin.gpio = new gpio(data.Id, options);;

  if (options.alert) {
    pin.gpio.on('alert',
          function(level, tick) {
            console.log('Alert received: { id:' + data.Id + ', level:' + level + ', tick:' + tick + '}');
            if (options.pullUpDown === gpio.PUD_UP) {
              level = level ? 0 : 1;
              console.log('level reversed for pull up pin');
            }
            pin.updatePinState(level);
          });
  }

  if (data.Mode !== 'SERVO' ) {
    pin.servo = null;
    pin.getState =
          function() {
            retVal = pin.gpio.digitalRead();
            if (options.pullUpDown === gpio.PUD_UP) {
              // Reverse the open/closed logic
              retVal = retVal ? 0 : 1;
              console.log('state logic reversed for pull up');
            }
            return retVal;
          };
    pin.setState = options.mode === gpio.INPUT ?
          function(value) { console.log('gpio-' + pin.data.Id + ' Ignoring request to write to INPUT'); } :
          function(value) {
            console.log('gpio-' + pin.data.Id + ' write->' + value);
            pin.gpio.digitalWrite(value);
            pin.updatePinState();
            //TODO if this is a PULSE then we need to set a timer to turn the state off...
          };
  } else {
    pin.servo = {
          timer: null,
          pulseWidth: 1100,
          increment: 50
    };
    // The state of a servo is determined by the presence of an interval timer
    pin.getState = function() { return Number(pin.servo.timer !== null); };

    pin.setState = function(value) {
                      console.log('gpio-' + pin.data.Id + ' servo->' + value);
                      if (value === 0) {
                        // Deactivate the servo by stoping the call to the timer
                        // function.
                        clearInterval(pin.servo.timer);
                        pin.servo.timer = null;
                        pin.gpio.digitalWrite(0);
                      } else {
                        // Activate the servo by calling a function to update the
                        // servo value on the pin at a regular interval.
                        pin.servo.timer = setInterval( () => {
                              pin.gpio.servoWrite(pin.servo.pulseWidth);
                              pin.servo.pulseWidth += pin.servo.increment;
                              if (pin.servo.pulseWidth >= 2500) {
                                pin.servo.increment = -50;
                              } else if (pin.servo.pulseWidth <= 1100) {
                                pin.servo.increment = 50;
                              }
                            }, 50);
                      }
                      pin.updatePinState();
                    };
  }

  pin.updatePinState = function(state, err) {
    if (err) {
      console.err('Encountered error', err);
      return;
    }
    if (state == null) {
      state = pin.getState();
    }
    pin.data.IsActive = (state !== 0);
    console.log('emitting status { Id:' + pin.data.Id + ', State:' + (pin.data.IsActive ? 'closed' : 'open') + ' }');
    io.sockets.emit('status', { Id: pin.data.Id, State: (pin.data.IsActive ? 'closed' : 'open') });
  };

  pin.updatePinState(pin.getState());
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

  pins.load( () => {});

  socket.on('state', function(data) {
    console.log('cmd: "state", data: ' + JSON.stringify(data));
    if (pins.has(data.Id)) {
      var pin = pins.get(data.Id);
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
  pins.clear();
  process.exit();
});

String.prototype.equalIgnoreCase = function(str) {
  return (str != null
          && typeof str === 'string'
          && this.toUpperCase() === str.toUpperCase());
}
