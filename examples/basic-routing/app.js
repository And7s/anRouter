angular.module('myApp', ['anRouting']);

angular.module('myApp').config(
  ['anRouteProvider',
    function(anRouteProvider) {
      anRouteProvider.state('foo', {
          url: '/',
          template: '<h1>This is route foo</h1>',
          cache: false,
        }
      ).state('bar', {
          url: '/bar',
          template: '<h1>This is route bar</h1>',
          cache: false
        }
      )
      .otherwise('foo'); // default route must be defined
    }
  ]
);