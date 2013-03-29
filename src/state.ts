/// <reference path="../lib/angular/angular-1.0.d.ts" />
/// <reference path="common.ts" />
/// <reference path="interfaces.d.ts" />

interface IStateWrapper {
    children: any;
    self: ui.routing.IState;
    fullname: string;

    parent?: IStateWrapper;
    route?: string;
    params?: string[];
}

'use strict';
var $StateProvider = [<any>'$routeProvider', '$transitionProvider', function ($routeProvider: ui.routing.IRouteProvider, $transitionProvider) {
    var root: IStateWrapper = { fullname: 'root', children: {}, self: { fullname: 'root' } },
        nameValidation = /^\w+(\.\w+)*?$/;

    function validateName(name: string) {
        if (nameValidation.test(name))
            return;

        throw new Error("Invalid name: '" + name + "'.");
    }

    function createRoute(stateRoute: string, parrentRoute: string, stateName: string, reloadOnSearch: bool) {
        var route;

        if (!isDefined(reloadOnSearch)) {
            reloadOnSearch = true;
        }

        route = (parrentRoute || '');
        if (route !== '' && route[route.length - 1] === '/') {
            route = route.substr(0, route.length - 1);
        }

        if (stateRoute[0] !== '/')
            route += '/';
        route += stateRoute;

        $routeProvider.when(route, { state: stateName, reloadOnSearch: reloadOnSearch });

        return route;
    }

    function lookupRoute(parent) {
        while (isDefined(parent) && !isDefined(parent.route))
            parent = parent.parent;
        return (parent && parent.route) || '';
    }

    var re = new RegExp('\x2F((:(\\w+))|(\\{((\\w+)(\\((.*?)\\))?:)?(\\w+)\\}))', 'g');
    function findParams(path: string) {
        var match: RegExpExecArray,
            params = [];

        if (path === null)
            return params;

        while ((match = re.exec(path)) !== null) {
            var paramName = match[3] || match[9];
            params.push(paramName);
        }

        return params;
    }

    function registerState(name, at: IStateWrapper, state: ui.routing.IState) {
        var fullname = at.fullname + '.' + name,
            parent = at;

        if (!at.children) {
            at.children = {};
        }

        if (!(name in at.children)) {
            at.children[name] = {};
        }
        at = at.children[name];
        at.self = extend(state, { fullname: fullname });
        at.fullname = fullname;
        at.parent = parent;

        if (angular.isDefined(state.route)) {
            at.route = createRoute(state.route, lookupRoute(parent), fullname, state.reloadOnSearch);
            at.params = findParams(state.route);
        }

        if (angular.isDefined(state.onEnter)) {
            $transitionProvider.onenter(fullname, state.onEnter);
        } 

        if (angular.isDefined(state.onExit)) {
            $transitionProvider.onexit(fullname, state.onExit);
        }

        if (state.children === null) {
            at.children = {};
        } else {
            angular.forEach(state.children, (childState, childName) => {
                registerState(childName, at, childState);
            });
        }
    }

    function lookup(names: string[]) {
        var current = root,
            //If name contains root explicitly, skip that one
            i = names[0] === 'root' ? 1 : 0;

        for (; i < names.length; i++) {
            if (!(names[i] in current.children))
                throw new Error("Could not locate '" + names[i] + "' under '" + current.fullname + "'.");

            current = current.children[names[i]];
        }
        return current;
    }

    function lookupState(name: string): any {
        return lookup(name.split('.'));;
    }

    function lookupParent(name: string) {
        var names: string[] = name.split('.'),
            name: string = names.pop();
        return { at: lookup(names), name: name };
    }

    this.state = function (name: string, state: ui.routing.IState) {
        var pair;
        validateName(name);

        pair = lookupParent(name);
        registerState(pair.name, pair.at, state);
        return this;
    };

    this.transition = function (from: any, to: any, handler: any) {
        $transitionProvider.transition(from, to, handler);
        return this;
    };

    this.$get = [<any>'$rootScope', '$q', '$injector', '$route', '$view', '$transition', '$location',
    function (
        $rootScope: ng.IRootScopeService,
        $q: ng.IQService,
        $injector: ng.auto.IInjectorService,
        $route: ui.routing.IRouteService,
        $view: ui.routing.IViewService,
        $transition: ui.routing.ITransitionService,
        $location: ng.ILocationService) {

        var forceReload = false,
            $state: any = {
                root: root,
                current: inherit({}, root),
                goto: goto,

                nextSibling: '',
                prevSibling: '',
                parrent: '',
                children: '',
                reload: function () {
                    forceReload = true;
                    $rootScope.$evalAsync(update);
                }
            };

        $rootScope.$on('$routeChangeSuccess', update);
        $rootScope.$on('$routeUpdate', () => {
            //TODO: Broadcast StateUpdate.
        });
        return $state;

        function update() {
            var route = $route.current,
                params;
            if (route) {
                params = {
                    all: route.params,
                    path: route.pathParams,
                    search: route.searchParams
                };

                if (route.state) {
                    goto(route.state, params);
                }
                //TODO: Move Action to state instead?.
                //if (route.action) {
                //    $injector.invoke(route.action, { $params: params });
                //}
            } else {
                goto(root);
            }
        }

        function isChanged(state, params) {

        }

        function changeChain(to: IStateWrapper, params) {
            var states = [],
                lastChanged,
                current = to;

            while (current !== root) {
                states.push(current);
                if (isChanged(current, params)) {
                    lastChanged = states.length - 1;
                }
                current = current.parent;
            }
            return states.slice(0, lastChanged);
        }

        function goto(to, params?) {
            var to = lookupState(toName(to)),
                toState = inherit({}, to.self),
                fromState = $state.current,
                emit = $transition.find($state.current, toState),

                cancel,
                event,
                transaction;

            event = $rootScope.$broadcast('$stateChangeStart', toState, fromState);
            if (!event.defaultPrevented) {
                event = {
                    cancel: () => {
                        cancel = true;
                    },
                    goto: (state, params?) => {
                        cancel = true;
                        goto(state, params);
                    }
                };

                emit.before(event);
                if (cancel) {
                    //TODO: Should we do more here?... What about the URL?... Should we reset that to the privous URL?...
                    //      That is if this was even triggered by an URL change in teh first place.
                    return;
                }

                //TODO: Reach to TR.

                $q.when(toState).then(() => {
                    $state.current = toState;

                    transaction = $view.beginUpdate();
                    $view.clear();

                    //Should we pin views?
                    //tr.emit.between();

                    angular.forEach(toState.views, (view, name) => {
                        $view.setOrUpdate(name, view.template, view.controller);
                    });

                    //Or let views be overwritten?
                    emit.between(event);
                    //TODO: Reach to TR.

                    transaction.commit();
                    $rootScope.$broadcast('$stateChangeSuccess', toState, fromState);
                }, (error) => {
                    transaction.cancel();
                    $rootScope.$broadcast('$stateChangeError', toState, fromState, error);
                }).then(() => {
                    emit.after(event);
                    //Note: nothing to do here.
                });
            }
        }
    }];
}];
angular.module('ui.routing').provider('$state', $StateProvider);