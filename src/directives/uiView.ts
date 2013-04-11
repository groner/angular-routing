/// <reference path="../../lib/angular/angular-1.0.d.ts" />
/// <reference path="../interfaces.d.ts" />
/// <reference path="../common.ts" />

'use strict';

var uiViewDirective = [<any>'$state', '$anchorScroll', '$compile', '$controller', '$view', '$animator',
function ($state, $anchorScroll, $compile, $controller, $view: ui.routing.IViewService, $animator) {
    return {
        restrict: 'ECA',
        terminal: true,
        link: function (scope, element: JQuery, attr) {
            var viewScope,
                name = attr['uiView'] || attr.name,
                doAnimate = isDefined(attr.ngAnimate),
                onloadExp = attr.onload || '',
                animate = $animator(scope, attr),
                version = -1;

            scope.$on('$viewChanged', (event, updatedName) => {
                if (updatedName === name)
                    update(doAnimate);
            });
            scope.$on('$stateChangeSuccess', () => update(doAnimate));
            update(false);

            function destroyScope() {
                if (viewScope) {
                    viewScope.$destroy();
                    viewScope = null;
                }
            }

            function clearContent(doAnimate) {
                if (doAnimate)
                    animate.leave(element.contents(), element);
                else
                    element.html('');

                destroyScope();
            }

            function update(doAnimate) {
                var view = $view.get(name),
                    controller;

                if (view && view.template) {
                    if (view.version === version)
                        return;

                    version = view.version;
                    controller = view.controller;

                    view.template.then((html) => {
                        clearContent(doAnimate);
                        if (doAnimate)
                            animate.enter(angular.element('<div></div>').html(html).contents(), element);
                        else
                            element.html(html);

                        var link = $compile(element.contents());

                        viewScope = scope.$new();
                        if (controller) {
                            controller = $controller(controller, { $scope: viewScope });
                            element.contents().data('$ngControllerController', controller);
                        }

                        link(viewScope);

                        viewScope.$emit('$viewContentLoaded');
                        viewScope.$eval(onloadExp);
                        $anchorScroll();
                    });
                } else {
                    clearContent(doAnimate);
                }
            }
        }
    };
}];

angular.module('ui.routing').directive('uiView', uiViewDirective);