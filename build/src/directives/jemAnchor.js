/// <reference path="../../lib/angular/angular-1.0.d.ts" />
/// <reference path="../interfaces.d.ts" />
/// <reference path="../common.ts" />
'use strict';
/**
* @ngdoc directive
* @name dotjem.routing.directive:jemAnchor
* @restrict ECA
*
* @description
* Provides an anchor point for the {@link dotjem.routing.$scroll $scroll} service to use.
*
* @element ANY
* @param {string} jemAnchor|id Identifier of the anchor
*/
var jemAnchorDirective = [
    '$scroll', 
    '$timeout', 
    function ($scroll, $timeout) {
        return {
            restrict: 'ECA',
            terminal: false,
            link: function (scope, element, attr) {
                var name = attr['jemAnchor'] || attr.id, delay = //Note: Default delay to 1 as it seems that the $timeout is instantly executed
                //      although the angular team says it should wait untill any digest is done.
                //      Using 1 seems to work.
                isDefined(attr.delay) ? Number(attr.delay) : 1;
                //$scroll.$register(name, element);
                //TODO: This is not aware if there are multiple elements named the same, we should instead
                //      register the element with the $scroll service so that can throw an error if multiple
                //      elements has the same name.
                scope.$on('$scrollPositionChanged', function (event, target) {
                    scroll(target);
                });
                scroll($scroll.$current);
                function scroll(target) {
                    if(target === name) {
                        //Note: Delay scroll untill any digest is done.
                        $timeout(function () {
                            element[0].scrollIntoView();
                        }, delay);
                    }
                }
            }
        };
    }];
angular.module('dotjem.routing').directive('jemAnchor', jemAnchorDirective);
angular.module('dotjem.routing').directive('id', jemAnchorDirective);
