var xdnd = (function () {
    'use strict';

    var checkForAlpine = function checkForAlpine() {
      if (!window.Alpine) {
        throw new Error('[Magic Helpers] Alpine is required for the magic helpers to function correctly.');
      }

      if (!window.Alpine.version || !isValidVersion('2.5.0', window.Alpine.version)) {
        throw new Error('Invalid Alpine version. Please use Alpine version 2.5.0 or above');
      }
    };

    function isValidVersion(required, current) {
      var requiredArray = required.split('.');
      var currentArray = current.split('.');

      for (var i = 0; i < requiredArray.length; i++) {
        if (!currentArray[i] || parseInt(currentArray[i]) < parseInt(requiredArray[i])) {
          return false;
        }
      }

      return true;
    }
    var X_ATTR_RE = /^x-([a-z-]*)\b/i;

    function parseHtmlAttribute(_ref) {
      var name = _ref.name,
          value = _ref.value;
      var typeMatch = name.match(X_ATTR_RE);
      var valueMatch = name.match(/:([a-z0-9\-:]+)/i);
      var modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
      return {
        type: typeMatch ? typeMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        modifiers: modifiers.map(function (i) {
          return i.replace('.', '');
        }),
        expression: value
      };
    }

    function getXDirectives(el) {
      return Array.from(el.attributes).filter(function (attr) {
        return X_ATTR_RE.test(attr.name);
      }).map(parseHtmlAttribute);
    }
    function importOrderCheck() {
      // We only want to show the error once
      if (window.Alpine && !window.AlpineMagicHelpers.__fatal) {
        window.AlpineMagicHelpers.__fatal = setTimeout(function () {
          console.error('%c*** ALPINE MAGIC HELPER: Fatal Error! ***\n\n\n' + 'Alpine magic helpers need to be loaded before Alpine ' + 'to avoid errors when Alpine initialises its component. \n\n' + 'Make sure the helper script is included before Alpine in ' + 'your page when using the defer attribute', 'font-size: 14px');
        }, 200); // We set a small timeout to make sure we flush all the Alpine noise first
      }
    }

    importOrderCheck();
    var DIRECTIVE = 'dnd';
    var mousemovetimer;

    var randomId = function randomId() {
      var id = Array.apply(0, Array(10)).map(function () {
        return function (charset) {
          return charset.charAt(Math.floor(Math.random() * charset.length));
        }('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
      }).join('');

      if (document.getElementById(id) === null) {
        return id;
      } else {
        return randomId();
      }
    };

    var initDndOnEl = function initDndOnEl(component, templateEl, expression, initialUpdate, extraVars) {
      var config = parseDndExpression(component, templateEl, expression);
      var nodesToMakeDraggable = templateEl.querySelectorAll(config.nodes);

      if (notYetDroptarget(templateEl)) {
        makeElDroptarget(templateEl, config);
      }

      nodesToMakeDraggable.forEach(function (node, key, parent) {
        if (!node.id) {
          node.id = randomId();
        }

        if (!node.$initedasdraggable) {
          makeElDraggable(node, config);
        }
      });
    };

    var parseDndExpression = function parseDndExpression(component, templateEl, expression) {
      var config = {};

      if (typeof expression === 'function') {
        config = component.evaluateReturnExpression(templateEl, expression);
      }

      if (typeof expression === 'object') {
        config = expression;
      }

      if (typeof expression === 'string') {
        try {
          config = JSON.parse(expression);
        } catch (e) {
          console.error('x-dnd config is a string but cannot be parsed as JSON');
        }
      }

      return config;
    };

    var makeElDraggable = function makeElDraggable(el, config) {
      var dndgroup = el.parentElement.getAttribute('dnd-group');
      el.setAttribute('dnd-group', dndgroup);
      el.$initedasdraggable = true;
      el.$dndconfig = config;
      el.style.userSelect = 'none';
      el.style.cursor = 'grab';
      var isDragging = false;

      var handleDrag = function handleDrag(event) {
        //do not drag if target is input
        if (event.target.nodeName == 'INPUT' || event.target.nodeName == 'SELECT') {
          return false;
        }

        event.preventDefault();
        var dragElement = event.target.closest('.draggable');
        if (!dragElement) return;
        dragElement.$draggedfrom = dragElement.closest(".droptarget");
        dragElement.$stylesBeforeDrag = Object.assign({}, dragElement.style);

        if (dragElement.__x_inserted_me) {
          dragElement.$templateEl = dragElement.previousElementSibling;
        }

        dragElement.ondragstart = function () {
          return false;
        };

        var currentdroptarget = dragElement.$draggedfrom;
        var shiftX, shiftY, clientX, clientY;

        if (event.type.indexOf('touch') > -1) {
          clientX = event.targetTouches[0].clientX;
          clientY = event.targetTouches[0].clientY;
        } else {
          clientX = event.clientX;
          clientY = event.clientY;
        }

        startDrag(dragElement, clientX, clientY);

        function startDrag(dragElement, clientX, clientY) {
          if (isDragging) {
            return;
          }

          isDragging = true;
          dragElement.addEventListener('mousemove', onMouseMove);
          dragElement.addEventListener('mouseup', onMouseUp);
          dragElement.addEventListener('mouseleave', onMouseLeave);
          dragElement.addEventListener('touchmove', onMouseMove);
          dragElement.addEventListener('touchend', onMouseUp);
          dragElement.addEventListener('touchcancel', onMouseLeave);
          var elwidth = dragElement.getBoundingClientRect().width;
          var elheight = dragElement.getBoundingClientRect().height; //move it where we grabbed it

          shiftX = event.clientX - dragElement.getBoundingClientRect().left;
          shiftY = event.clientY - dragElement.getBoundingClientRect().top;
          enterdroptarget(currentdroptarget); //preserve starting droptarget height while dragging

          var currentheight = currentdroptarget.offsetHeight;
          currentdroptarget.style.minHeight = currentheight + 'px';
          currentdroptarget.classList.add('preserveheight'); //setting draggable position is slower then actual mouse movement
          //if exiting element while dragging, set position when stop to catch up

          window.addEventListener("mousemove", function (event) {
            clearTimeout(mousemovetimer);
            mousemovetimer = setTimeout(function () {
              if (isDragging) {
                moveAt(event.clientX, event.clientY, elwidth, elheight);
              }
            }, 1);
          }); //"pop out" to make it draggable

          dragElement.style.position = 'fixed';
          dragElement.style.zIndex = '10000000';
          moveAt(clientX, clientY, elwidth, elheight);
        }

        function onMouseUp(event) {
          //console.log('mouseup');
          finishDrag(event);
        }

        function onMouseLeave(event) {
          if (isDragging) {
            if (currentdroptarget) {
              leavedroptarget(currentdroptarget);
              currentdroptarget = false;
            }
          }
        }

        function onMouseMove(event) {
          //console.log('onmousemove');
          //console.log(event);
          var clientX, clientY;

          if (event.type.indexOf('touch') > -1) {
            clientX = event.targetTouches[0].clientX;
            clientY = event.targetTouches[0].clientY;
          } else {
            clientX = event.clientX;
            clientY = event.clientY;
          }

          moveAt(clientX, clientY);
          dragElement.hidden = true;
          var elemBelow = document.elementFromPoint(clientX, clientY);
          dragElement.hidden = false; // mousemove events may trigger out of the window (when the ball is dragged off-screen)
          // if clientX/clientY are out of the window, then elementFromPoint returns null

          if (!elemBelow) return; // potential droptargets are labeled with the class "droptarget" (can be other logic)

          var droptargetBelow = elemBelow.closest('.droptarget');

          if (currentdroptarget != droptargetBelow) {
            // we're flying in or out...
            // note: both values can be null
            //   currentdroptarget=null if we were not over a droptarget before this event (e.g over an empty space)
            //   droptargetBelow=null if we're not over a droptarget now, during this event
            if (currentdroptarget) {
              // the logic to process "flying out" of the droptarget (remove highlight)
              leavedroptarget(currentdroptarget);
            }

            currentdroptarget = droptargetBelow;

            if (currentdroptarget) {
              // the logic to process "flying in" of the droptarget
              enterdroptarget(currentdroptarget);
            }
          }
        }

        function enterdroptarget(elem) {
          if (elem.$dndconfig.classIfDroppable) {
            if (elem.getAttribute('dnd-group') === dragElement.getAttribute('dnd-group')) {
              var _elem$classList;

              (_elem$classList = elem.classList).add.apply(_elem$classList, elem.$dndconfig.classIfDroppable.split(' '));
            }
          }

          if (elem.$dndconfig.classIfNotDroppable) {
            if (elem.getAttribute('dnd-group') !== dragElement.getAttribute('dnd-group')) {
              var _elem$classList2;

              (_elem$classList2 = elem.classList).add.apply(_elem$classList2, elem.$dndconfig.classIfNotDroppable.split(' '));
            }
          }
        }

        function leavedroptarget(elem) {
          if (elem.$dndconfig.classIfDroppable) {
            var _elem$classList3;

            (_elem$classList3 = elem.classList).remove.apply(_elem$classList3, elem.$dndconfig.classIfDroppable.split(' '));
          }

          if (elem.$dndconfig.classIfNotDroppable) {
            var _elem$classList4;

            (_elem$classList4 = elem.classList).remove.apply(_elem$classList4, elem.$dndconfig.classIfNotDroppable.split(' '));
          }
        }

        function finishDrag(event) {
          if (!isDragging) {
            return;
          }

          isDragging = false;
          var enableDrop = true;

          if (currentdroptarget === dragElement.$draggedfrom) {
            leavedroptarget(currentdroptarget);
            currentdroptarget = false;
          } else {
            if (currentdroptarget) {
              if (currentdroptarget.getAttribute('dnd-group') == dragElement.getAttribute('dnd-group')) {
                if (typeof currentdroptarget.$dndconfig.onBeforeDrop == 'function') {
                  var _currentdroptarget$$d;

                  enableDrop = (_currentdroptarget$$d = currentdroptarget.$dndconfig.onBeforeDrop).call.apply(_currentdroptarget$$d, [currentdroptarget].concat([dragElement]));
                }

                if (enableDrop) {
                  var closestsibling = false;
                  currentdroptarget.querySelectorAll('.draggable').forEach(function (item) {
                    var rect = item.getClientRects()[0];
                    var halfline = rect.y + rect.height / 2;
                    var dist = halfline - event.clientY;

                    if (closestsibling === false) {
                      closestsibling = {
                        element: item,
                        distance: Math.abs(dist),
                        distval: dist
                      };
                    } else {
                      if (Math.abs(dist) < closestsibling.distance) {
                        closestsibling = {
                          element: item,
                          distance: Math.abs(dist),
                          distval: dist
                        };
                      }
                    }
                  });

                  if (dragElement.$templateEl) {
                    if (closestsibling && closestsibling.element.parentElement.__x) {
                      var whereToInsert = closestsibling.distval > 0 ? 'beforebegin' : 'afterend';
                      closestsibling.element.insertAdjacentElement(whereToInsert, dragElement.$templateEl);
                    } else {
                      currentdroptarget.append(dragElement.$templateEl);
                    }

                    dragElement.remove();
                  } else {
                    if (closestsibling && closestsibling.element.parentElement.__x) {
                      var whereToInsert = closestsibling.distval > 0 ? 'beforebegin' : 'afterend';
                      closestsibling.element.insertAdjacentElement(whereToInsert, dragElement);
                    } else {
                      currentdroptarget.append(dragElement);
                    }
                  } //TODO run callback on element created by x-if


                  if (typeof currentdroptarget.$dndconfig.onAfterDrop == 'function') {
                    var _currentdroptarget$$d2;

                    (_currentdroptarget$$d2 = currentdroptarget.$dndconfig.onAfterDrop).call.apply(_currentdroptarget$$d2, [currentdroptarget].concat([dragElement]));
                  }
                } else {
                  if (typeof currentdroptarget.$dndconfig.onDropCancel == 'function') {
                    var _currentdroptarget$$d3;

                    (_currentdroptarget$$d3 = currentdroptarget.$dndconfig.onDropCancel).call.apply(_currentdroptarget$$d3, [currentdroptarget].concat([dragElement]));
                  }
                }
              } else {
                if (typeof currentdroptarget.$dndconfig.onDropDeny == 'function') {
                  var _currentdroptarget$$d4;

                  (_currentdroptarget$$d4 = currentdroptarget.$dndconfig.onDropDeny).call.apply(_currentdroptarget$$d4, [currentdroptarget].concat([dragElement]));
                }
              }

              leavedroptarget(currentdroptarget);
              currentdroptarget = false;
            }
          }

          dragElement.removeEventListener('mousemove', onMouseMove);
          dragElement.removeEventListener('mouseup', onMouseUp);
          dragElement.removeEventListener('mouseleave', onMouseLeave);
          dragElement.removeEventListener('touchmove', onMouseMove);
          dragElement.removeEventListener('touchend', onMouseUp);
          dragElement.removeEventListener('touchcancel', onMouseLeave); //reset styles to original

          Object.keys(dragElement.$stylesBeforeDrag).forEach(function (key) {
            if (isNaN(parseInt(key))) {
              dragElement.style[key] = dragElement.$stylesBeforeDrag[key];
            }
          });
        }

        function moveAt(clientX, clientY, origWidth, origHeight) {
          if (origWidth === void 0) {
            origWidth = false;
          }

          if (origHeight === void 0) {
            origHeight = false;
          }

          var newX = clientX - shiftX;
          var newY = clientY - shiftY;
          /*
                      // check if the new coordinates are below the bottom window edge
                      let newBottom = newY + dragElement.offsetHeight; // new bottom
                       // below the window? let's scroll the page
                      if (newBottom > document.documentElement.clientHeight) {
                          // window-relative coordinate of document end
                          let docBottom = document.documentElement.getBoundingClientRect().bottom;
                           // scroll the document down by 10px has a problem
                          // it can scroll beyond the end of the document
                          // Math.min(how much left to the end, 10)
                          let scrollY = Math.min(docBottom - newBottom, 10);
                           // calculations are imprecise, there may be rounding errors that lead to scrolling up
                          // that should be impossible, fix that here
                          if (scrollY < 0) scrollY = 0;
                           window.scrollBy(0, scrollY);
                           // a swift mouse move make put the cursor beyond the document end
                          // if that happens -
                          // limit the new Y by the maximally possible (right at the bottom of the document)
                          newY = Math.min(newY, document.documentElement.clientHeight - dragElement.offsetHeight);
                      }
                       // check if the new coordinates are above the top window edge (similar logic)
                      if (newY < 0) {
                          // scroll up
                          let scrollY = Math.min(-newY, 10);
                          if (scrollY < 0) scrollY = 0; // check precision errors
                           window.scrollBy(0, -scrollY);
                          // a swift mouse move can put the cursor beyond the document start
                          newY = Math.max(newY, 0); // newY may not be below 0
                      }
                        // limit the new X within the window boundaries
                      // there's no scroll here so it's simple
                      if (newX < 0) newX = 0;
                      if (newX > document.documentElement.clientWidth - dragElement.offsetWidth) {
                          newX = document.documentElement.clientWidth - dragElement.offsetWidth;
                      }*/
          //width and height might change when position is set to fixed
          //so we apply the current to the element

          if (origWidth) {
            dragElement.style.width = origWidth + 'px';
          }

          if (origHeight) {
            dragElement.style.height = origHeight + 'px';
          }

          dragElement.style.left = newX + 'px';
          dragElement.style.top = newY + 'px';
        }
      };

      el.addEventListener('mousedown', handleDrag);
      el.addEventListener('touchstart', handleDrag);
    };

    var makeElDroptarget = function makeElDroptarget(el, config) {
      el.setAttribute('dnd-group', config.group);
      el.classList.add('droptarget');
      el.$dndconfig = config;
      el.$initedasdroptarget = true;
    };

    var notYetDroptarget = function notYetDroptarget(el) {
      return !el.$initedasdroptarget;
    };

    var fixFlexboxHiddenattr = function fixFlexboxHiddenattr() {
      var css = document.createElement('style');
      css.appendChild(document.createTextNode('[hidden]{display:none}'));
      document.getElementsByTagName("head")[0].appendChild(css);
    };

    var AlpineDndCustomDirective = {
      start: function start() {
        checkForAlpine();
        fixFlexboxHiddenattr();
        Alpine.onBeforeComponentInitialized(function (component) {
          var legacyResolveBoundAttributes = component.resolveBoundAttributes;

          component.resolveBoundAttributes = function (el, initialUpdate, extraVars) {
            var _this = this;

            if (initialUpdate === void 0) {
              initialUpdate = true;
            }

            var attrs = getXDirectives(el);
            attrs.forEach(function (_ref) {
              var type = _ref.type,
                  expression = _ref.expression;

              if (type === DIRECTIVE) {
                var output = _this.evaluateReturnExpression(el, expression, extraVars);

                initDndOnEl(_this, el, output);
              }
            });
            return legacyResolveBoundAttributes.bind(component)(el, initialUpdate, extraVars);
          };
        });
      }
    };

    var alpine = window.deferLoadingAlpine || function (alpine) {
      return alpine();
    };

    window.deferLoadingAlpine = function (callback) {
      AlpineDndCustomDirective.start();
      alpine(callback);
    };

    return AlpineDndCustomDirective;

}());
