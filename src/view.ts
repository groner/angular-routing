/// <reference path="../lib/angular/angular-1.0.d.ts" />
/// <reference path="common.ts" />
/// <reference path="interfaces.d.ts" />

function $ViewProvider() {
    'use strict';

    /**
     * @ngdoc object
     * @name dotjem.routing.$view
     *
     * @requires $rootScope
     * @requires $q
     * @requires $template
     *
     * @description
     * The `$view` service is used to update any defined {@link dotjem.routing.directive:jemView jemView} directive defined in the DOM.
     * This will primarily used by the {@link dotjem.routing.$state $state} service to update views on transitions. But that way, the `$view` service
     * enables also enables changes to views through transitions defined on the {@link dotjem.routing.$stateTransitionProvider $stateTransitionProvider}.
     * <br/>
     * It also allows updates outside the scope of the `$state` service.
     * <br/>
     * **Note:** Whenever a state change causes a series of view updates, these are done in a "transaction", this means that they won't be applied untill
     * the state transition has run to completion. This means that when accessing the `$view` service within transitions etc. will fall in under the same transaction, which
     * is different than if we call it in a different context.
     * <br/>
     * Any outside services are also able to create transactional updates by calling the `beginUpdate` method, and then `commit` on the returned object.
     * 
     * 
     *
     */
    this.$get = [<any>'$rootScope', '$q', '$template',
    function ($rootScope: ng.IRootScopeService, $q: ng.IQService, $template: dotjem.routing.ITemplateService) {
        var views = {},
            transaction = null,
            $view: any = {};

        function isArgs(args) {
            return isObject(args)
                && (isDefined(args.template)
                    || isDefined(args.controller)
                    || isDefined(args.locals)
                    || isDefined(args.sticky));
        }

        function ensureName(name: string) {
            if (name === 'undefined') {
                throw new Error('Must define a view name.');
            }
        };

        /**
         * @ngdoc event
         * @name dotjem.routing.$view#$viewUpdate
         * @eventOf dotjem.routing.$view
         *
         * @eventType broadcast on root scope
         *
         * @description
         * Broadcasted when a view updated, if a transaction is active this will not occur before that is commited.
         *
         * @param {Object} angularEvent Synthetic event object.
         * @param {State} name Name of the view that was updated.
         */
        function raiseUpdated(name: string) {
            $rootScope.$broadcast('$viewUpdate', name);
        }

        /**
         * @ngdoc event
         * @name dotjem.routing.$view#$viewRefresh
         * @eventOf dotjem.routing.$view
         *
         * @eventType broadcast on root scope
         *
         * @description
         * Broadcasted when a view refreshed, if a transaction is active this will not occur before that is commited.
         *
         * @param {Object} angularEvent Synthetic event object.
         * @param {State} name Name of the view that was refreshed.
         */
        function raiseRefresh(name: string, data?: any) {
            $rootScope.$broadcast('$viewRefresh', name, data);
        }

        function containsView(map: any, name: string) {
            return (name in map) && map[name] !== null;
        }

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#clear
         * @methodOf dotjem.routing.$view
         *
         * @param {string=} name The name of the view to clear.
         *
         * @description
         * Clears all views.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#clear
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view to clear.
         *
         * @description
         * Clears the named view.
         */
        $view.clear = function (name?: string) {
            if (isUndefined(name)) {
                forEach(views, (val, key) => {
                    $view.clear(key);
                });
            } else {
                if (transaction) {
                    transaction.records[name] = {
                        act: 'clear',
                        fn: () => {
                            $view.clear(name);
                        }
                    };
                    return;
                }
                delete views[name];

                raiseUpdated(name);
            }
        };

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#setOrUpdate
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view to update as defined with the {@link dotjem.routing.directive:jemView jemView} directive.
         * @param {object} args View update arguments
         *
         *  args properties:
         *    
         * - `template`: `{string|Object|function}` The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * - `controller`: `{string|function=}` The view confroller either as a function or a named controller defined on the module or a referenced module.
         * - `locals`: `{Object=}` value An optional map of dependencies which should be injected into the controller.
         * - `sticky`: `{string=}` value A flag indicating that the view is sticky.
         *
         * @description
         * Sets or Updates a named view, this forces an update if the view has already been updated by another call to the view service.
         * <br/>
         * If the view is marked sticky it will only force an update if the sticky flag is different than the previous one. In cases where it
         * is the same the `$viewRefresh` event will be raised instead.
         * <br/>
         * Views can also be refreshed by calling the `refresh` method.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#setOrUpdate
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view to update as defined with the {@link dotjem.routing.directive:jemView jemView} directive.
         * @param {string|object} template The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * @param {function=} controller The view confroller either as a function or a named controller defined on the module or a referenced module.
         * @param {object=} locals An optional map of dependencies which should be injected into the controller.
         * @param {string=} sticky A flag indicating that the view is sticky.
         *
         * @description
         * Sets or Updates a named view, this forces an update if the view has already been updated by another call to the view service.
         * <br/>
         * If the view is marked sticky it will only force an update if the sticky flag is different than the previous one. In cases where it
         * is the same the `$viewRefresh` event will be raised instead.
         * <br/>
         * Views can also be refreshed by calling the `refresh` method.
         */
        $view.setOrUpdate = function (name: string, templateOrArgs?: any, controller?: any, locals?: any, sticky?: string) {
            var template = templateOrArgs;
            if (isArgs(templateOrArgs)) {
                template = templateOrArgs.template;
                controller = templateOrArgs.controller;
                locals = templateOrArgs.locals;
                sticky = templateOrArgs.sticky;
            }

            ensureName(name);

            if (transaction) {
                transaction.records[name] = {
                    act: 'setOrUpdate',
                    fn: () => {
                        $view.setOrUpdate(name, template, controller, locals, sticky);
                    }
                };
                return;
            }

            if (!containsView(views, name)) {
                views[name] = { version: -1 };
            }
            
            //TODO: Should we make this latebound so only views actually used gets loaded and rendered?
            //      also we obtain the actual template even if it's an update for a sticky view, while the "cache" takes
            //      largely care of this, it could be an optimization to not do this?
            views[name].template = $template.get(template);
            views[name].controller = controller;
            views[name].locals = locals;

            
            if (isDefined(sticky) && isString(sticky) && views[name].sticky === sticky) {
                raiseRefresh(name, {
                    $locals: locals,
                    sticky: sticky
                });
            } else {
                views[name].version++;
                views[name].sticky = sticky;

                raiseUpdated(name);
            }
        };

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#setIfAbsent
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view to set as defined with the {@link dotjem.routing.directive:jemView jemView} directive.
         * @param {object} args View update arguments
         *
         *  args properties:
         *    
         * - `template`: `{string|Object|function}` The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * - `controller`: `{string|function=}` The view confroller either as a function or a named controller defined on the module or a referenced module.
         * - `locals`: `{Object=}` value An optional map of dependencies which should be injected into the controller.
         *
         * @description
         * Sets a named view if it is not yet known by the `$view` service of if it was cleared. If the view is already updated by another call this call will be ignored.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#setIfAbsent
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view to update as defined with the {@link dotjem.routing.directive:jemView jemView} directive.
         * @param {string|object} template The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * @param {function=} controller The view confroller either as a function or a named controller defined on the module or a referenced module.
         * @param {object=} locals An optional map of dependencies which should be injected into the controller.
         *
         * @description
         * Sets a named view if it is not yet known by the `$view` service of if it was cleared. If the view is already updated by another call this call will be ignored.
         */
        $view.setIfAbsent = function (name: string, templateOrArgs?: any, controller?: any, locals?: any) {
            var template = templateOrArgs;
            if (isArgs(templateOrArgs)) {
                template = templateOrArgs.template;
                controller = templateOrArgs.controller;
                locals = templateOrArgs.locals;
            }

            ensureName(name);

            if (transaction) {
                if (!containsView(transaction.records, name) || transaction.records[name].act === 'clear') {
                    transaction.records[name] = {
                        act: 'setIfAbsent',
                        fn: () => {
                            $view.setIfAbsent(name, template, controller, locals);
                        }
                    };
                }
                return;
            }

            if (!containsView(views, name)) {
                views[name] = {
                    //TODO: Should we make this latebound so only views actually used gets loaded and rendered? 
                    template: $template.get(template),
                    controller: controller,
                    locals: locals,
                    version: 0
                };
                raiseUpdated(name);
            }
        }

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#get
         * @methodOf dotjem.routing.$view
         *
         * @description
         * Gets all current view configurations. If a transaction is in progress, updates provided by that will not be reflected untill
         * it is comitted.
         * 
         * @returns {Array} A list of view configuration objects, each object may defined the following properties:
         *
         * - `name`: `{string}` The name of the view.
         * - `version`: `{number}` The version the view is currently in.
         * - `template`: `{string|Object|function}` The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * - `controller`: `{string|function=}` The view confroller either as a function or a named controller defined on the module or a referenced module.
         * - `locals`: `{Object=}` value An optional map of dependencies which should be injected into the controller.
         * - `sticky`: `{string=}` value A flag indicating that the view is sticky.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#get
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The name of the view for which to get the configuration.
         *
         * @description
         * Gets the configuration for a namved view. If a transaction is in progress, updates provided by that will not be reflected untill
         * it is comitted.
         *
         * @returns {Object} A view configuration object, this object may defined the following properties:
         *
         * - `name`: `{string}` The name of the view.
         * - `version`: `{number}` The version the view is currently in.
         * - `template`: `{string|Object|function}` The template to be applied to the view. See {@link dotjem.routing.$template $template} on ways to define templates.
         * - `controller`: `{string|function=}` The view confroller either as a function or a named controller defined on the module or a referenced module.
         * - `locals`: `{Object=}` value An optional map of dependencies which should be injected into the controller.
         * - `sticky`: `{string=}` value A flag indicating that the view is sticky.
         */
        $view.get = function (name?: string) {
            //TODO: return copies instead of actuals...
            if (isUndefined(name))
                return views;

            // Ensure checks if the view was defined at any point, not if it is still defined.
            // if it was defined but cleared, then null is returned which can be used to clear the view if desired.
            return views[name];
        };

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#refresh
         * @methodOf dotjem.routing.$view
         *
         * @description
         * Refreshes all views.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#refresh
         * @methodOf dotjem.routing.$view
         *
         * @param {string} name The view to send a refresh.
         * @param {object=} data An optional data object containing information for the refresh.
         *
         * @description
         * Refreshes a named view.
         */
        $view.refresh = function (name?: string, data?: any) {
            if (isUndefined(name)) {
                forEach(views, (val, key) => {
                    $view.refresh(key, data);
                });
            } else if (transaction) {
                transaction.records[name] = {
                    act: 'refresh',
                    fn: () => {
                        $view.refresh(name, data);
                    }
                };
                return;
            } else {
                //TODO: Here we still raise the event even if the view does not exist, we should propably do some error handling here?
                data.$locals = views[name] && views[name].locals;
                raiseRefresh(name, data);
            }
        }

        /**
         * @ngdoc method
         * @name dotjem.routing.$view#beginUpdate
         * @methodOf dotjem.routing.$view
         *
         * @description
         * Starts a new view update transaction in which to record all changes to views before actually applying them.
         * 
         * @returns {Object} A transaction object that can be used to commit or cancel the transaction, see {@link dotjem.routing.type:transaction Transaction} for more details.
         */

        /**
         * @ngdoc interface
         * @name dotjem.routing.type:transaction
         * @description
         *
         * Records updates to views and applies them when committed.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.type:transaction#commit
         * @methodOf dotjem.routing.type:transaction
         *
         * @description
         * Commits the view transaction, applying any changes that may have been recorded.
         * <br/>
         * Only the final state will be applied, meaning that if the same view had recieved a series of updates, only an update
         * for the final state the view will take will be issues, if it causes the view to change state.
         */

        /**
         * @ngdoc method
         * @name dotjem.routing.type:transaction#cancel
         * @methodOf dotjem.routing.type:transaction
         *
         * @description
         * Cancels the view transaction, discarding any changes that may have been recorded.
         */
        $view.beginUpdate = function () {
            if (transaction)
                throw new Error("Can't start multiple transactions");

            var trx = transaction = {
                records: {}
            };
            return {
                commit: function () {
                    transaction = null;
                    forEach(trx.records, (rec) => { rec.fn(); })

                },
                cancel: function () {
                    transaction = null;
                }
            };
        }

        return $view;
    }];
}
angular.module('dotjem.routing').provider('$view', $ViewProvider);

