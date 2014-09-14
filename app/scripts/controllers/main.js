'use strict';

/**
 * @ngdoc function
 * @name huenoteApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the huenoteApp
 */
angular.module('huenoteApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
