'use strict';

/**
 * @ngdoc function
 * @name huenoteApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the huenoteApp
 */
angular.module('huenoteApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
