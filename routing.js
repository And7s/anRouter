angular.module('anRouting', []);
console.log('aaa');
angular.module('anRouting').provider(
  'anRoute', {
    _states: {},
    $get: function() {
      return this._states;
    },
    state: function(name, obj) {
      if (_.isUndefined(obj.cache)) {
        obj.cache = true; // default value
      }
      if (!_.isUndefined(obj.url)) {
        if (obj.url[0] == '/') {
          obj.url = obj.url.substr(1);
        }
      }
      this._states[name] = obj;
      return this;
    },
    otherwise: function(url) {
      this._states.default = url;
      console.log('otherwise defined to be', url);
      return this;
    },
  }
);
angular.module('anRouting').provider(
  'anTransitions', {
    _transitionFN: [],
    $get: function() {
      return this._transitionFN;
    },
    addFN: function(fn) {
      this._transitionFN.push(fn);
    }
  }
);

angular.module('anRouting').directive('anSref', ['anRouter', 'anRoute', function(anRouter, anRoute) {
  return {
    link: function(scope, element, attrs) {
      if (element[0].tagName == 'A') {
        element[0].setAttribute('href', attrs.anSref);
      }
      element.bind('click', function(event) {
        event.preventDefault();
        var path = attrs.anSref.split('?');
        var get_params = path[1] ?  flatToObject(path[1]) : {};
        anRouter.goTo(path[0], get_params);
      });
    }
  };
}]);

angular.module('anRouting').directive('anView', ['anRouter', '$compile', '$controller', '$timeout',
  '$templateCache', '$rootScope', 'anRoute', 'anTransitions',
  function(anRouter, $compile, $controller, $timeout,
           $templateCache, $rootScope, anRoute, anTransitions) {

    return {
      restrict: 'E',
      transclude: true,
      priority: 2000,
      terminal: true,
      scope: true,  // inherit scope
      link: function(scope, element, attrs) {
        var animationTimeout, curEl, newEl, curStateName, newScope, curScope, linker = {}, animation, prev_state, curState;
        var cache = {};

        //  a href function available in the scope to be used as <div ng-click="anHref(state, params)">click me</div>
        scope.anHref = function(href, params) {
          anRouter.goTo(href, params);
        };

        // a goback function that is available in the scope if not overwritten by controllers in between
        scope.goBack = function(force) {
          anRouter.goBack(force);
        };

        $rootScope.$on('anStateChange', function(e, stateName, opts) {
          $rootScope.$emit('anStateChangeStart');
          if (stateName[0] == '/') {
            stateName = stateName.substr(1);
          }
          if (curStateName == stateName) {
            console.log('routing is already in this active state ' + stateName);
            return;
          }

          opts = opts || {};
          typeof(opts.animate) == 'undefined' && (opts.animate = true);  // default
          if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
            resolveAnimation();
          }
          prev_state = curState;
          curState = anRoute[stateName];

          if (!cache[stateName]) {
            if (curState.parentState) {  // is this scope inheriting from a prent state
              var parentState = cache[curState.parentState];
              if (!parentState) {console.error('parent State is not defined');}
              newScope = parentState.scope.$new(false);
            } else {
              newScope = scope.$new();
            }
            if (curState.cache) {
              cache[stateName] = {
                scope: newScope,
                el: null
              };
            }

          } else {
            newScope = cache[stateName].scope;

          }

          if (!curState) { throw('no state defined ' + stateName); }
          var link; // the used link function
          if (curState.templateUrl) {    // template is defined by given url
            if (!linker[curState.templateUrl]) {
              var template = $templateCache.get(curState.templateUrl);
              if (!template) { console.error('template not found' + curState.templateUrl); }
              var linkEl = angular.element('<div>' + template + '</div>');
              linkEl[0].children[0].classList.add('anContent');
              linkEl[0].classList.add('anView');
              if (curState.customClass) {
                linkEl[0].classList.add(curState.customClass);
              }
              linker[curState.templateUrl] = $compile(linkEl);
            }
            link = linker[curState.templateUrl];
          } else {  // inline tempalte
            if (!curState.template) { throw('template must be defined with templatUrl or template as inline template');}
            // inline elements should be small, therefore a recompilation shouldn take too long
            link = $compile(angular.element('<div>' + curState.template + '</div>'));
          }

          animation = getAnimation(curStateName, stateName);

          var duration = 3000;
          if (animation.in == '' && animation.out == '') {  // if there is no animation defined
            duration = 0;   // do it instantaneous
          }
          // after animation finished
          animationTimeout = setTimeout(function() {
            animationTimeout = null;
            resolveAnimation();
          }, duration);

          if (!curState) {
            console.error('controller ' + curState.controller + 'is not defined');
          }
          if (cache[stateName] && cache[stateName].el) {
            // cached element, reuse dom, scope, reinit controller (make sure it does work on multiple instantiation on the same scope)
            var el = cache[stateName].el;
            el[0].className = 'anView'; // reset classes
            if (curState.customClass) {
              el[0].classList.add(curState.customClass);
            }
            if (curState.controller) {
              $controller(curState.controller, {$scope: newScope});
            }
            postLink(el);  // will animate the el
          } else {
            console.log('create new dom and new Controller');
            link(newScope, function(el) {  // create new dom node
              if (curState.cache) {
                cache[stateName].el = el;
              }
              postLink(el);  // will animate the el
              element.append(el);
              // currently there is no additional controller created ?? what to do with existing: el, linkFn, scope and controller?
              if (curState && curState.controller) {
                curState.controller && $controller(curState.controller, {$scope: newScope});
              }
            });
          }

          function resolveAnimation() {
            if (newEl && newEl.length > 0) {
              newEl[0].classList.remove('ng-enter', 'ng-enter-active');
            }
            if (animation.in) {
              newEl[0].classList.remove(animation.in);
            }
            if (curEl) {
              if (prev_state) {
                if (!prev_state.cache) {
                  curScope.$destroy();
                  curEl[0].parentNode.removeChild(curEl[0]);
                }
              }

              //which state?
              // this is the element that is moved off screen, maybe declare a css state to be of screen (display none)
              curEl[0].classList.add('anViewCached');
            }
            curScope = newScope;
            curEl = newEl;  // new element is current element
          }
          function getAnimation(from, to) {
            var animIn = '', animOut = '';
            // define your animation rules here
            return {in: animIn, out: animOut};
          }
          function postLink(el) {
            $timeout(function() {
              // is used to apply the scope (calling a digest cycle)
            });
            // before animation
            if (opts.animate) {
              el[0].classList.add('ng-enter');
              animation.in && el[0].classList.add(animation.in);
              if (curEl) {  // is there already a currentElement (not the case for the fist template that enters)
                curEl[0].classList.add('ng-leave');
                animation.out && curEl[0].classList.add(animation.out);
              }
            }
            // now this element is considered as the current elmenet (though it is not actually visible
            // at first after the timetoInsert (see below), but you can interact with this node already
            newEl = el;
            curStateName = stateName;
            // add element to the dom, animate in

            requestAnimationFrame(function() {
              if (opts.animate) {
                el[0].classList.add('ng-enter-active');
              }
              setTimeout(function() {
                // called after element is part of the dom
                if (opts.animate) {
                  if (curEl) {
                    curEl[0].classList.add('ng-leave-active');
                  }
                }
                $rootScope.$emit('anStateChangeSuccess', stateName, curStateName);
              });
            });
          }
        });
      }
    };
  }]);

angular.module('anRouting').service('anRouter', ['$rootScope', 'anRoute', 'anStateParams',
  function($rootScope, anRoute, anStateParams) {
    $rootScope.anHistory = [];
    var cur_stateName;

    var baseurl = (function() {
      if (document.getElementsByTagName('base').length > 0) {
        return document.getElementsByTagName('base')[0].getAttribute('href');
      } else {
        throw('url base must be defined');
      }
    })();

    // converts a keyvalue serch to a single string (k:v => ?k=v)
    this.getFlat = function(get_params) {
      var get_flat = '?';
      for (var it in get_params) {
        if (!_.isFunction(get_params[it]) && !_.isUndefined(get_params[it]) && it[0] != '$') {
          get_flat += encodeURI(it) + '=' + encodeURI(get_params[it]) + '&';
        };
      }
      get_flat = get_flat.substr(0, get_flat.length - 1);    // remove trailing & or ?
      return get_flat;
    };

    this.goTo = function(stateName, get_params, opts) {
      if (stateName[0] == '/') { stateName = stateName.substr(1); }
      var state = anRoute[stateName];
      if (!state) { // doesnt match on a per name basis
        for (var it in anRoute) {
          if (anRoute[it].regex && RegExp(anRoute[it].regex).test(stateName)) {
            state = anRoute[it];
            break;
          }
        }
      }
      if (!state) {
        console.error('no state found: ' + stateName);
        window.history.back();
        return;
      }
      get_params = get_params || [];
      opts = opts || {};
      var get_flat = this.getFlat(get_params);
      var href;
      if (state.url) {
        href = state.url + get_flat;
      } else {
        href = this.currentLocation() + get_flat;
      }

      // check if we are already on this page
      var anHistory = $rootScope.anHistory;

      // check if the page was previosly visited
      if (anHistory.length > 1 && anHistory[anHistory.length - 2] == stateName + get_flat) {
        $rootScope.anHistory.pop();
        if (!opts.go_direct) {
          // history back will trigger each other if not stopped
          window.history.back();
          return;
        }
      } else if (anHistory.length == 0 || anHistory[anHistory.length - 1] != stateName + get_flat) { // avoid to push the same state twice
        if ($rootScope.anHistory.length == 0 ||
          (state.url && state.url == this.currentLocation())) {
          history.replaceState({stateName: stateName, get_params: get_flat}, '', baseurl + href);
        } else {
          history.pushState({stateName: stateName, get_params: get_flat}, '', baseurl + href);
        }
        $rootScope.anHistory.push(stateName + get_flat);
      }
      cur_stateName = stateName;
      anStateParams.$update();
      $rootScope.$emit('anStateChange', stateName, opts);
    };

    this.goBack = function(force) {
      // force defines, that i am willing to exit the current "app" in order to actually go back to from where i did come from,
      // but i only can exit the current app if there has been a page visited previously (based on browser history,
      // we know that the user had been somewhere before but not where (privacy), otherwise we goto default page
      if ($rootScope.anHistory.length > 1 || (force && window.history.length > 1)) {
        if ($rootScope.anHistory.length == 1 && force) { window.history.back(); }  // the initial page init has to be passed
        $rootScope.anHistory.pop(); // keep anHistory with browser history in sync
        window.history.back();
      } else {
        this.goTo(anRoute.default);
      }
    };

    // if the current search (get params) are replaced, the internal representation of the history must be updated accordingly
    this.replaceSearch = function(key, value) {
      var search = searchToObject();
      search[key] = value;
      var get_flat = this.getFlat(search);
      $rootScope.anHistory[$rootScope.anHistory.length - 1] = cur_stateName + this.getFlat(search);
      var state = anRoute[cur_stateName];
      history.replaceState({stateName: cur_stateName, get_params: this.getFlat(search)}, '', baseurl + state.url + get_flat);
    };

    this.currentLocation = function() {
      return location.pathname.substr(baseurl.length);
    };

    var that = this;
    // support prowser back forth navigation
    // safari creates an initial pageload popstate event, we need to ignore this event
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.onpopstate = function(event) {
          if (!event.state) { // if no state defined, i cannot know where to go, apply default location
            console.log('no state is defined' + location.pathname + location.search);
            window.history.back();
            return true;
          }
          var stateName = (event.state && event.state.stateName) ? event.state.stateName : location.pathname.substr(baseurl.length);
          if ($rootScope.anHistory.length > 1 && $rootScope.anHistory[$rootScope.anHistory.length - 2] == event.state.stateName + event.state.get_params) {
            that.goTo(stateName, flatToObject(event.state.get_params), {go_direct: true});
          } else {
            that.goTo(stateName, flatToObject(event.state.get_params));
          }
        };
      }, 0);
    });

    window.onpushstate = function(e) {

    };

    // initialliy go to the default (0) page
    setTimeout(function() {
      var url = location.pathname.replace(baseurl, '');
      if (url == '' || url == '/') {
        url = anRoute.default;
      }
      that.goTo(url, searchToObject()); // initialize first page
    });
  }]);

angular.module('anRouting').service('anStateParams', [function() {
  var obj = searchToObject();
  obj.$update = function() {
    // update the object without losing its ferences
    for (it in obj) {
      if (it[0] != '$') {
        (delete obj[it]); // delete existing properties (not methods indicated by $)
      }
    }
    _.extend(obj, searchToObject());
  };
  return obj;
}]);

function searchToObject() {
  return flatToObject(window.location.search);
}

function flatToObject(get_par) {
  if (get_par[0] == '?') { get_par = get_par.substring(1); }
  var pairs = get_par.split('&'),
    obj = {}, pair, i;
  for (i in pairs) {
    if (pairs[i] === '') {continue;}
    pair = pairs[i].split('=');
    obj[decodeURI(pair[0])] = decodeURI(pair[1]);
  }
  return obj;
}
