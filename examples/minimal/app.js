angular.module('myApp', ['anRouting']);

angular.module('myApp').config(
  ['anRouteProvider',
    function(anRouteProvider) {
      anRouteProvider.state('home', {
          url: '/',
          template: '<h1>Hello an-Router</h1>',
        }
      ).otherwise('home'); // default route must be defined
    }
  ]
);