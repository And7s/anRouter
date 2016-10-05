an-Rotuer is an angular router

It had been implemented in order to fullfill some very unique requirements that could not been met with general purpose routing solutions such as ui-router.

We wanted a minimal routing solution that let us
- cache and reuse pages to minimize frequent and heavy dom manipulations
- route back/ forwards on a defined order that might not match the actual browser history
- use custom and dynamic set page transitions

an-Router was implemented with inspiration to ui-router. It thus has a similar yet not compatible interface. This router is not meant as a generic solution for a braod audience.It is a result of ongoing implementation and the requirements we met at the experteer company.




# how to use
The basic usage example in exaples/minimal shows the minimum setup to use an-Router.
- add anRouting as dependency to your module
- Configure a state (name, url and a template)
- set the default (the otherwise) to this state
- set the basehref of your app
- page transitions are often and therefore should be cheap

state definition looks as follows
 anRouteProvider.state('stateName', {     // name of the state
    url: '/url-of-state',                 // the (optional) url of the state (reflected in the address bar)
    template: '<h1>This is route foo</h1>',   // a inline template
    templateUrl: '/templateurl.html'      // instead of inline template a templateUrl can be used, BUT this template must be already loaded (bootstrapped) in the angular tempalte cache
    cache: false,                         // whether a template should be cached (true by default)
    controller: 'ControllerNameController' // name of the controller that should be initialized if this state becomes active
    customClass: 'my-css-class'           // a custom calss that is attached to the root div of this page
    parentState: 'statenameOfParent'      // if defiend, the scope of this state is inherited from the parents scope
  }
)


Other than ui-router, the query params are not part of the url definition of the state. This means any param can be passed to the url and will always resolve in the same state.


caching
All pages are cached by default. This is done with the assumption that the used app has core pages that are visited often. By navigating from and to the same page the dom manipulation can easily become very expensive as an the dom tree needs of the leaving page needs to be removed while the entering page will be inserted. Therefore a cached page stays in the dom and is visually hidden. In case the state is reincartinated the page becomes visible again and the controller is reinitialized with the same scope from the first run. This should be kept in mind that this also allows data to be storted accors multiple life cycles of the controller. This also means watchers in the controller are not purged, they stick. So in case a watcher is attached it should be verified that this does not happen on every initialisation e.g. by storing the state $scope.watcher = $scope.watcher || $scope.watch('somevar', func... );

initialisation
from the moment a route is activated the router


back/ forward navigation
The router internally stores a history of the navigated pages. It will update and keep the native html5 history in sync. In case a user will navigates back to an already visited page this will not result in a back navigation. It triggers the same behaviour as if the user would have hit the browser back buttn. e.g. Navigating A -> B -> A. This will first push the states of A and then B into the history and then pop B again eventually leaving only A on the stack. Browsers that support the forward navigation can now navigate forward to B again.

Animations
Pages are animated by css transitions/ animations. A page lifes being inserted though these stages:
.ng-enter -> .ng-enter.ng-enter-active -> -no class- -> ng-leave -> .ng-leave.ng-leave.active

The second example examples/basic-routing defines two routes
# how is it implemented


#lifecycle
