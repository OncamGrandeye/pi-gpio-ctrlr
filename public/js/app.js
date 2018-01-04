/********************************************************************************
* GPIO Raspberry PI GPIO Controller Javascript
********************************************************************************/
var app = angular.module('app', ['ui.bootstrap','ngRoute']);


app.config(function($routeProvider, $locationProvider) {
  // According to someone on the web, this next line does some "magic"
  $locationProvider.hashPrefix('');
  $routeProvider
      .when('/',       { templateUrl:'ioctrl.htm', controller:'ioctrl' })
      .when('/config', { templateUrl:'config.htm', controller:'config' })
      .otherwise({redirectTo:'/'});
});


/********************************************************************************
* Services
********************************************************************************/

app.factory('AlertService', function() {
  alertService = {};
  alertService.alerts = [];

  alertService.addAlert = function(alertType, alertMessage) {
    alertService.alerts.push({type:alertType, msg:alertMessage});
  };

  alertService.closeAlert = function(index) {
    alertService.alerts.splice(index, 1);
  };

  return alertService;
});

app.factory('ConfigService', function($http, $location) {
  var pins = [];
  var raspberryPi = 'http://' + $location.host();
  if ($location.port() != 80) {
    raspberryPi+= ':' + $location.port();
  }

  return {
    getPinConfig: function(cbSuccess, cbError) {
      return $http.get(raspberryPi + '/config', {timeout: 5000})
          .then(cbSuccess, cbError);
    },

    getGpioConfig: function(cbSuccess, cbError) {
      return $http.get(raspberryPi + '/config/gpio', {timeout: 5000})
          .then(cbSuccess, cbError);
    },
    setGpioConfig: function(pinConfig, errorCallback) {
      return $http.post(raspberryPi + '/config/gpio', pinConfig)
          .error(errorCallback);
    }
    //TODO Implement network configuration  
  }

});


/********************************************************************************
* Controllers
********************************************************************************/
app.controller('navctrl', ['$scope', '$location', function($scope, $location) {
  $scope.location = $location
  $scope.organization = 'ONCAM Grandeye'
}]);

app.controller('ioctrl',['$scope', 'ConfigService', 'AlertService', function($scope, ConfigService, AlertService) {

  var socket = io();

  $scope.organization = "ONVU/ONCAM";
  $scope.pins = [];
  $scope.inputs = [
    {Id:4,IsActive:1,Text:'EVO-12'},
    {Id:17,IsActive:0,Text:'EVO-180'}
  ];

  ConfigService.getPinConfig(
    // Function to handle successfull call
    function(response) {
      if (response.status == 200) {
        $scope.pins = [];
        try {
          JSON.stringify(response.data);
        } catch (e) {
          AlertService.addAlert('danger', 'PINS are not well formed JSON: ' + e);
        }
        for (var key in response.data) {
          $scope.pins.push(response.data[key]);
        }
      }
    },
    // Function to handle error
    function(response) {
      AlertService.addAlert('danger', 'Could not get PIN congiguration from Raspberry PI');
    }
  );

  $scope.openRelay = function(id) {
    console.log('Opening ' + id);
    if (id !== 0) {
      socket.emit('state', { 'Id':id, 'Action':'open' });
    }
  };

  $scope.closeRelay = function(id) {
    console.log('Closing ' + id);
    if (id !== 0) {
      socket.emit('state', { 'Id':id, 'Action':'close' });
    }
  };

  $scope.getGPIO = function(pin) {
    var gpio = {
      id:0,
      text:'',
      relay:false,
      contact:false,
      isActive:false,
      action:null };

    if (pin.Type === 'GPIO') {
      gpio.id = pin.Id;
      if (pin.hasOwnProperty('Mode') && pin.Mode === 'INPUT') {
        gpio.contact = true;
      } else {
        gpio.relay = true;
        if (pin.IsActive) {
          gpio.action = function() { $scope.openRelay(pin.Id); };
        } else {
          gpio.action = function() { $scope.closeRelay(pin.Id); };
        }
      }
      if (pin.hasOwnProperty('IsActive')) {
        gpio.isActive = pin.IsActive;
      }
    }

    if (pin.hasOwnProperty('Text') && pin.Text !== '') {
      gpio.text = pin.Text;
    } else if (pin.hasOwnProperty('Id')) {
      gpio.text = pin.Type + '-' + pin.Id;
    } else {
      gpio.text = pin.Type;
    }

    return gpio;
  };

  socket.on('status', function(data) {
    // Just received a state change in a GPIO pin.
    var newState = data.State === 'closed';

    // Find the Pin that the update is for
    for (var key in $scope.pins) {
      var pin = $scope.pins[key];
      if (pin.hasOwnProperty('Id')) {
        if (pin.Id === data.Id) {
          // Wrap this in the $apply to notify angular of the change
          $scope.$apply(function() { pin.IsActive = newState });
          return;
        }
      }
    }
  });


}]);

app.controller('config',['$scope', 'ConfigService', 'AlertService', function($scope, ConfigService, AlertService) {

  $scope.pins = [];

  ConfigService.getGpioConfig(
    // Function to handle successfull call
    function(response) {
      if (response.status == 200) {
        $scope.pins = [];
        try {
          JSON.stringify(response.data);
        } catch (e) {
          AlertService.addAlert('danger', 'PINS are not well formed JSON: ' + e);
        }

        for (var key in response.data) {
          $scope.pins.push(response.data[key]);
        }
      }
    },
    // Function to handle error
    function(response) {
      AlertService.addAlert('danger', 'Could not get PIN congiguration from Raspberry PI');
    }
  );

  $scope.setGpioConfig = function() {
    if ($scope.pins) {
      // Check that it is at least JSON
      try {
        ConfigService.setGpioConfig($scope.pins,
          function(response) {
            AlertService.addAlert("danger", "Could not post PIN configuration.");
          }
        );
      } catch(exp) {
        AlertService.addAlert("danger", "The text is not a valid JSON object.");
      };
    }
  };

}]);



/********************************************************************************
* Directives
********************************************************************************/
app.directive('digitalInput', function() {
  return {restrict:'A',templateUrl:'digital-input.htm'};
});

app.directive('gpioPin', function() {
  return {restrict:'A',templateUrl:'gpio-pin.htm'};
});

