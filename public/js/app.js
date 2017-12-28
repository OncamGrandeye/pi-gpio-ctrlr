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
* Controllers
********************************************************************************/
app.controller('navctrl', ['$scope', '$location', function($scope, $location) {
  $scope.location = $location
  $scope.organization = 'ONCAM Grandeye'
}]);

app.controller('ioctrl', function($scope) {
  $scope.organization = "ONVU/ONCAM";
  $scope.inputs = [
    {Id:4,IsActive:1,Text:'EVO-12'},
    {Id:17,IsActive:0,Text:'EVO-180'}
  ];
});

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
