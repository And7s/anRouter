angular.module('myApp', ['anRouting']);

angular.module('myApp').config(
  ['anRouteProvider',
    function(anRouteProvider) {
      anRouteProvider.state('home', {
          url: '/',
          template: '<h1>Hello first page</h1>',
          cache: false,
        }
      ).state('list', {
          url: '/list',
          template: '<h1>secondary page with a long list</h1>'
        }
      ).state('detail', {
          url: '/detail',
          template: '<h1>this is a detail view</h1>'
        }
      ).state('settings', {
          url: '/settings',
          template: '<h1>This is the settings page</h1>',
          cache: false
        }
      )
      .otherwise('home'); // default route must be defined
    }
  ]
);