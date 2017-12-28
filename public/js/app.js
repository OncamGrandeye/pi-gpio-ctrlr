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

  return { getPinConfig: function(cbSuccess, cbError) {
    return $http.get(raspberryPi + '/config', {timeout: 5000})
        .then(cbSuccess, cbError);
    }
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
  $scope.organization = "ONVU/ONCAM";
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
}]);

app.controller('config', function($scope) {
  // Nothing to do yet...
});



/********************************************************************************
* Directives
********************************************************************************/
app.directive('digitalInput', function() {
  return {restrict:'A',templateUrl:'digital-input.htm'};
});
/*
app.directive('relayOutput', function() {
  return {restrict:'A':templateUrl:'relay-output.htm'};
});
*/
