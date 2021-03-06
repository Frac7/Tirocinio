(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        var objectCreate = Object.create || objectCreatePolyfill
        var objectKeys = Object.keys || objectKeysPolyfill
        var bind = Function.prototype.bind || functionBindPolyfill

        function EventEmitter() {
            if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
                this._events = objectCreate(null);
                this._eventsCount = 0;
            }

            this._maxListeners = this._maxListeners || undefined;
        }
        module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
        EventEmitter.EventEmitter = EventEmitter;

        EventEmitter.prototype._events = undefined;
        EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
        var defaultMaxListeners = 10;

        var hasDefineProperty;
        try {
            var o = {};
            if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
            hasDefineProperty = o.x === 0;
        } catch (err) { hasDefineProperty = false }
        if (hasDefineProperty) {
            Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
                enumerable: true,
                get: function() {
                    return defaultMaxListeners;
                },
                set: function(arg) {
                    // check whether the input is a positive number (whose value is zero or
                    // greater and not a NaN).
                    if (typeof arg !== 'number' || arg < 0 || arg !== arg)
                        throw new TypeError('"defaultMaxListeners" must be a positive number');
                    defaultMaxListeners = arg;
                }
            });
        } else {
            EventEmitter.defaultMaxListeners = defaultMaxListeners;
        }

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
        EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
            if (typeof n !== 'number' || n < 0 || isNaN(n))
                throw new TypeError('"n" argument must be a positive number');
            this._maxListeners = n;
            return this;
        };

        function $getMaxListeners(that) {
            if (that._maxListeners === undefined)
                return EventEmitter.defaultMaxListeners;
            return that._maxListeners;
        }

        EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
            return $getMaxListeners(this);
        };

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
        function emitNone(handler, isFn, self) {
            if (isFn)
                handler.call(self);
            else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                    listeners[i].call(self);
            }
        }
        function emitOne(handler, isFn, self, arg1) {
            if (isFn)
                handler.call(self, arg1);
            else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                    listeners[i].call(self, arg1);
            }
        }
        function emitTwo(handler, isFn, self, arg1, arg2) {
            if (isFn)
                handler.call(self, arg1, arg2);
            else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                    listeners[i].call(self, arg1, arg2);
            }
        }
        function emitThree(handler, isFn, self, arg1, arg2, arg3) {
            if (isFn)
                handler.call(self, arg1, arg2, arg3);
            else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                    listeners[i].call(self, arg1, arg2, arg3);
            }
        }

        function emitMany(handler, isFn, self, args) {
            if (isFn)
                handler.apply(self, args);
            else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                    listeners[i].apply(self, args);
            }
        }

        EventEmitter.prototype.emit = function emit(type) {
            var er, handler, len, args, i, events;
            var doError = (type === 'error');

            events = this._events;
            if (events)
                doError = (doError && events.error == null);
            else if (!doError)
                return false;

            // If there is no 'error' event listener then throw.
            if (doError) {
                if (arguments.length > 1)
                    er = arguments[1];
                if (er instanceof Error) {
                    throw er; // Unhandled 'error' event
                } else {
                    // At least give some kind of context to the user
                    var err = new Error('Unhandled "error" event. (' + er + ')');
                    err.context = er;
                    throw err;
                }
                return false;
            }

            handler = events[type];

            if (!handler)
                return false;

            var isFn = typeof handler === 'function';
            len = arguments.length;
            switch (len) {
                // fast cases
                case 1:
                    emitNone(handler, isFn, this);
                    break;
                case 2:
                    emitOne(handler, isFn, this, arguments[1]);
                    break;
                case 3:
                    emitTwo(handler, isFn, this, arguments[1], arguments[2]);
                    break;
                case 4:
                    emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
                    break;
                // slower
                default:
                    args = new Array(len - 1);
                    for (i = 1; i < len; i++)
                        args[i - 1] = arguments[i];
                    emitMany(handler, isFn, this, args);
            }

            return true;
        };

        function _addListener(target, type, listener, prepend) {
            var m;
            var events;
            var existing;

            if (typeof listener !== 'function')
                throw new TypeError('"listener" argument must be a function');

            events = target._events;
            if (!events) {
                events = target._events = objectCreate(null);
                target._eventsCount = 0;
            } else {
                // To avoid recursion in the case that type === "newListener"! Before
                // adding it to the listeners, first emit "newListener".
                if (events.newListener) {
                    target.emit('newListener', type,
                        listener.listener ? listener.listener : listener);

                    // Re-assign `events` because a newListener handler could have caused the
                    // this._events to be assigned to a new object
                    events = target._events;
                }
                existing = events[type];
            }

            if (!existing) {
                // Optimize the case of one listener. Don't need the extra array object.
                existing = events[type] = listener;
                ++target._eventsCount;
            } else {
                if (typeof existing === 'function') {
                    // Adding the second element, need to change to array.
                    existing = events[type] =
                        prepend ? [listener, existing] : [existing, listener];
                } else {
                    // If we've already got an array, just append.
                    if (prepend) {
                        existing.unshift(listener);
                    } else {
                        existing.push(listener);
                    }
                }

                // Check for listener leak
                if (!existing.warned) {
                    m = $getMaxListeners(target);
                    if (m && m > 0 && existing.length > m) {
                        existing.warned = true;
                        var w = new Error('Possible EventEmitter memory leak detected. ' +
                            existing.length + ' "' + String(type) + '" listeners ' +
                            'added. Use emitter.setMaxListeners() to ' +
                            'increase limit.');
                        w.name = 'MaxListenersExceededWarning';
                        w.emitter = target;
                        w.type = type;
                        w.count = existing.length;
                        if (typeof console === 'object' && console.warn) {
                            console.warn('%s: %s', w.name, w.message);
                        }
                    }
                }
            }

            return target;
        }

        EventEmitter.prototype.addListener = function addListener(type, listener) {
            return _addListener(this, type, listener, false);
        };

        EventEmitter.prototype.on = EventEmitter.prototype.addListener;

        EventEmitter.prototype.prependListener =
            function prependListener(type, listener) {
                return _addListener(this, type, listener, true);
            };

        function onceWrapper() {
            if (!this.fired) {
                this.target.removeListener(this.type, this.wrapFn);
                this.fired = true;
                switch (arguments.length) {
                    case 0:
                        return this.listener.call(this.target);
                    case 1:
                        return this.listener.call(this.target, arguments[0]);
                    case 2:
                        return this.listener.call(this.target, arguments[0], arguments[1]);
                    case 3:
                        return this.listener.call(this.target, arguments[0], arguments[1],
                            arguments[2]);
                    default:
                        var args = new Array(arguments.length);
                        for (var i = 0; i < args.length; ++i)
                            args[i] = arguments[i];
                        this.listener.apply(this.target, args);
                }
            }
        }

        function _onceWrap(target, type, listener) {
            var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
            var wrapped = bind.call(onceWrapper, state);
            wrapped.listener = listener;
            state.wrapFn = wrapped;
            return wrapped;
        }

        EventEmitter.prototype.once = function once(type, listener) {
            if (typeof listener !== 'function')
                throw new TypeError('"listener" argument must be a function');
            this.on(type, _onceWrap(this, type, listener));
            return this;
        };

        EventEmitter.prototype.prependOnceListener =
            function prependOnceListener(type, listener) {
                if (typeof listener !== 'function')
                    throw new TypeError('"listener" argument must be a function');
                this.prependListener(type, _onceWrap(this, type, listener));
                return this;
            };

// Emits a 'removeListener' event if and only if the listener was removed.
        EventEmitter.prototype.removeListener =
            function removeListener(type, listener) {
                var list, events, position, i, originalListener;

                if (typeof listener !== 'function')
                    throw new TypeError('"listener" argument must be a function');

                events = this._events;
                if (!events)
                    return this;

                list = events[type];
                if (!list)
                    return this;

                if (list === listener || list.listener === listener) {
                    if (--this._eventsCount === 0)
                        this._events = objectCreate(null);
                    else {
                        delete events[type];
                        if (events.removeListener)
                            this.emit('removeListener', type, list.listener || listener);
                    }
                } else if (typeof list !== 'function') {
                    position = -1;

                    for (i = list.length - 1; i >= 0; i--) {
                        if (list[i] === listener || list[i].listener === listener) {
                            originalListener = list[i].listener;
                            position = i;
                            break;
                        }
                    }

                    if (position < 0)
                        return this;

                    if (position === 0)
                        list.shift();
                    else
                        spliceOne(list, position);

                    if (list.length === 1)
                        events[type] = list[0];

                    if (events.removeListener)
                        this.emit('removeListener', type, originalListener || listener);
                }

                return this;
            };

        EventEmitter.prototype.removeAllListeners =
            function removeAllListeners(type) {
                var listeners, events, i;

                events = this._events;
                if (!events)
                    return this;

                // not listening for removeListener, no need to emit
                if (!events.removeListener) {
                    if (arguments.length === 0) {
                        this._events = objectCreate(null);
                        this._eventsCount = 0;
                    } else if (events[type]) {
                        if (--this._eventsCount === 0)
                            this._events = objectCreate(null);
                        else
                            delete events[type];
                    }
                    return this;
                }

                // emit removeListener for all listeners on all events
                if (arguments.length === 0) {
                    var keys = objectKeys(events);
                    var key;
                    for (i = 0; i < keys.length; ++i) {
                        key = keys[i];
                        if (key === 'removeListener') continue;
                        this.removeAllListeners(key);
                    }
                    this.removeAllListeners('removeListener');
                    this._events = objectCreate(null);
                    this._eventsCount = 0;
                    return this;
                }

                listeners = events[type];

                if (typeof listeners === 'function') {
                    this.removeListener(type, listeners);
                } else if (listeners) {
                    // LIFO order
                    for (i = listeners.length - 1; i >= 0; i--) {
                        this.removeListener(type, listeners[i]);
                    }
                }

                return this;
            };

        EventEmitter.prototype.listeners = function listeners(type) {
            var evlistener;
            var ret;
            var events = this._events;

            if (!events)
                ret = [];
            else {
                evlistener = events[type];
                if (!evlistener)
                    ret = [];
                else if (typeof evlistener === 'function')
                    ret = [evlistener.listener || evlistener];
                else
                    ret = unwrapListeners(evlistener);
            }

            return ret;
        };

        EventEmitter.listenerCount = function(emitter, type) {
            if (typeof emitter.listenerCount === 'function') {
                return emitter.listenerCount(type);
            } else {
                return listenerCount.call(emitter, type);
            }
        };

        EventEmitter.prototype.listenerCount = listenerCount;
        function listenerCount(type) {
            var events = this._events;

            if (events) {
                var evlistener = events[type];

                if (typeof evlistener === 'function') {
                    return 1;
                } else if (evlistener) {
                    return evlistener.length;
                }
            }

            return 0;
        }

        EventEmitter.prototype.eventNames = function eventNames() {
            return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
        };

// About 1.5x faster than the two-arg version of Array#splice().
        function spliceOne(list, index) {
            for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
                list[i] = list[k];
            list.pop();
        }

        function arrayClone(arr, n) {
            var copy = new Array(n);
            for (var i = 0; i < n; ++i)
                copy[i] = arr[i];
            return copy;
        }

        function unwrapListeners(arr) {
            var ret = new Array(arr.length);
            for (var i = 0; i < ret.length; ++i) {
                ret[i] = arr[i].listener || arr[i];
            }
            return ret;
        }

        function objectCreatePolyfill(proto) {
            var F = function() {};
            F.prototype = proto;
            return new F;
        }
        function objectKeysPolyfill(obj) {
            var keys = [];
            for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
            return k;
        }
        function functionBindPolyfill(context) {
            var fn = this;
            return function () {
                return fn.apply(context, arguments);
            };
        }

    },{}],2:[function(require,module,exports){
// shim for using process in browser
        var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

        var cachedSetTimeout;
        var cachedClearTimeout;

        function defaultSetTimout() {
            throw new Error('setTimeout has not been defined');
        }
        function defaultClearTimeout () {
            throw new Error('clearTimeout has not been defined');
        }
        (function () {
            try {
                if (typeof setTimeout === 'function') {
                    cachedSetTimeout = setTimeout;
                } else {
                    cachedSetTimeout = defaultSetTimout;
                }
            } catch (e) {
                cachedSetTimeout = defaultSetTimout;
            }
            try {
                if (typeof clearTimeout === 'function') {
                    cachedClearTimeout = clearTimeout;
                } else {
                    cachedClearTimeout = defaultClearTimeout;
                }
            } catch (e) {
                cachedClearTimeout = defaultClearTimeout;
            }
        } ())
        function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
                //normal enviroments in sane situations
                return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                cachedSetTimeout = setTimeout;
                return setTimeout(fun, 0);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedSetTimeout(fun, 0);
            } catch(e){
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                    return cachedSetTimeout.call(null, fun, 0);
                } catch(e){
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                    return cachedSetTimeout.call(this, fun, 0);
                }
            }


        }
        function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
                //normal enviroments in sane situations
                return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                cachedClearTimeout = clearTimeout;
                return clearTimeout(marker);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedClearTimeout(marker);
            } catch (e){
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                    return cachedClearTimeout.call(null, marker);
                } catch (e){
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                    // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                    return cachedClearTimeout.call(this, marker);
                }
            }



        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
            if (!draining || !currentQueue) {
                return;
            }
            draining = false;
            if (currentQueue.length) {
                queue = currentQueue.concat(queue);
            } else {
                queueIndex = -1;
            }
            if (queue.length) {
                drainQueue();
            }
        }

        function drainQueue() {
            if (draining) {
                return;
            }
            var timeout = runTimeout(cleanUpNextTick);
            draining = true;

            var len = queue.length;
            while(len) {
                currentQueue = queue;
                queue = [];
                while (++queueIndex < len) {
                    if (currentQueue) {
                        currentQueue[queueIndex].run();
                    }
                }
                queueIndex = -1;
                len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    args[i - 1] = arguments[i];
                }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
                runTimeout(drainQueue);
            }
        };

// v8 likes predictible objects
        function Item(fun, array) {
            this.fun = fun;
            this.array = array;
        }
        Item.prototype.run = function () {
            this.fun.apply(null, this.array);
        };
        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // empty string to avoid regexp issues
        process.versions = {};

        function noop() {}

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) { return [] }

        process.binding = function (name) {
            throw new Error('process.binding is not supported');
        };

        process.cwd = function () { return '/' };
        process.chdir = function (dir) {
            throw new Error('process.chdir is not supported');
        };
        process.umask = function() { return 0; };

    },{}],3:[function(require,module,exports){
        require('aframe-curve-component');
        require('aframe-alongpath-component');
        require('aframe-meshline-component');
        require('aframe-leap-hands').registerAll();

//true se si è verificato l'evento "intersezione"
        let intersection = false;
        let transformCreated = false; //flag creazione transform (evita che venga creato più di una volta)
        let targetObject = {
            aframeEl: null
        }; //oggetto puntato
        let oldPosition = null;
        let oldOpacity = null;
        let controls = ['translate', 'scale', 'rotate'];
        let currentControl = 0;

//mano selezionata tramite componente
        function selectedHand(hand) {
            let hands = document.querySelectorAll('[leap-hand]');
            if (hands) {
                for (let i = 0; i < hands.length; i++)
                    if (hands[i].components['leap-hand'] && hands[i].components['leap-hand'].attrValue.hand === hand)
                        return hands[i];
            }
        }

//selezione camera attiva
        function selectCamera() {
            let camera = document.querySelector('[camera]');
            if(camera === null)
                camera = document.querySelector('a-camera');
            return camera;
        }

//riconoscimento posa
        function gestureRecognizer(hand) {
            //palmo verso l'alto, tre dita estese e due no (pollice, indice, mignolo estese)
            return (hand && hand.palmNormal[1] >= 0 && hand.pointables[0].extended && hand.pointables[1].extended && (!hand.pointables[2].extended) && (!hand.pointables[3].extended) && hand.pointables[4].extended);
        }

//mano valida con l'array delle dita popolato
        function validHand(hand) {
            return (hand && hand.pointables.length !== 0);
        }

//creazione controllo in base ad array di valori
        function createControl(transform, values) {
            let x, y, z, all;
            let xLine, yLine, zLine;
            //creazione freccia x
            x = document.querySelector('#x');
            if(x === null) {
                x = document.createElement(values.x.tag);
                x.setAttribute('id', values.x.id);
                x.setAttribute('holdable', values.x.holdable);
                x.setAttribute('material', values.x.material);
                transform.appendChild(x);
            }
            x.setAttribute('position', values.x.position);
            x.setAttribute('scale', values.x.scale);
            x.setAttribute('rotation', values.x.rotation);
            x.removeAttribute('geometry');
            x.setAttribute('geometry', values.x.geometry);
            //creazione linea x
            xLine = document.querySelector('#xLine');
            if(xLine === null || xLine === undefined) {
                xLine = document.createElement(values.xLine.tag);
                xLine.setAttribute('id', values.xLine.id);
                transform.appendChild(xLine);
            }
            xLine.removeAttribute('line');
            xLine.setAttribute('line', values.xLine.lineAttribute);
            //creazione freccia y
            y = document.querySelector('#y');
            if(y === null) {
                y = document.createElement(values.y.tag);
                y.setAttribute('id', values.y.id);
                y.setAttribute('holdable', values.y.holdable);
                y.setAttribute('material', values.y.material);
                transform.appendChild(y);
            }
            y.setAttribute('position', values.y.position);
            y.setAttribute('scale', values.y.scale);
            y.setAttribute('rotation', values.y.rotation);
            y.removeAttribute('geometry');
            y.setAttribute('geometry', values.y.geometry);
            //creazione linea y
            yLine = document.querySelector('#yLine');
            if(yLine === null || yLine === undefined) {
                yLine = document.createElement(values.yLine.tag);
                yLine.setAttribute('id', values.yLine.id);
                transform.appendChild(yLine);
            }
            yLine.removeAttribute('line');
            yLine.setAttribute('line', values.yLine.lineAttribute);
            //creazione freccia z
            z = document.querySelector('#z');
            if(z === null) {
                z = document.createElement(values.z.tag);
                z.setAttribute('id', values.z.id);
                z.setAttribute('holdable', values.z.holdable);
                z.setAttribute('material', values.z.material);
                transform.appendChild(z);
            }
            z.setAttribute('position', values.z.position);
            z.setAttribute('scale', values.z.scale);
            z.setAttribute('rotation', values.z.rotation);
            z.removeAttribute('geometry');
            z.setAttribute('geometry', values.z.geometry);
            //creazione linea z
            zLine = document.querySelector('#zLine');
            if(zLine === null || zLine === undefined) {
                zLine = document.createElement(values.zLine.tag);
                zLine.setAttribute('id', values.zLine.id);
                transform.appendChild(zLine);
            }
            zLine.removeAttribute('line');
            zLine.setAttribute('line', values.zLine.lineAttribute);
            //creazione controllo per tutti gli assi
            all = document.querySelector('#all');
            if(all === null) {
                all = document.createElement(values.all.tag);
                all.setAttribute('id', values.all.id);
                all.setAttribute('holdable', values.all.holdable);
                all.setAttribute('material', values.all.material);
                transform.appendChild(all);
            }
            all.setAttribute('position', values.all.position);
            all.setAttribute('scale', values.all.scale);
            all.removeAttribute('geometry');
            all.setAttribute('geometry', values.all.geometry);
            //piani transform
            /*if(currentControl === 0) {
        //piani
        all.removeAttribute('geometry');
        all.removeAttribute('material');
        all.setAttribute('scale', '0.075 0.075 0.075');
        let planeXY = document.createElement('a-plane');
        planeXY.setAttribute('translatePlane');
        let planeYZ = document.createElement('a-plane');
        planeYZ.setAttribute('translatePlane');
        let planeZX = document.createElement('a-plane');
        planeZX.setAttribute('translatePlane');
        all.appendChild(planeXY);
        all.appendChild(planeYZ);
        all.appendChild(planeZX);
        //attributi
        planeXY.setAttribute('rotation', '0 -45 0');
        planeXY.setAttribute('material', {
            side: 'double',
            color: '#ffff00',
            opacity: '0.5'
        });
        planeXY.setAttribute('width', 1);
        planeXY.setAttribute('height', 1);
        planeXY.setAttribute('position', '0.35 0.5 0.35');

        planeYZ.setAttribute('rotation', '0 45 0');
        planeYZ.setAttribute('material', {
            side: 'double',
            color: '#00ffff',
            opacity: '0.5'
        });
        planeYZ.setAttribute('width', 1);
        planeYZ.setAttribute('height', 1);
        planeYZ.setAttribute('position', '-0.35 0.5 0.35');

        planeZX.setAttribute('rotation', '90 135 0');
        planeZX.setAttribute('material', {
            side: 'double',
            color: '#ff00ff',
            opacity: '0.5'
        });
        planeZX.setAttribute('width', 1);
        planeZX.setAttribute('height', 1);
        planeZX.setAttribute('position', '0 0 0.7');
    } else {
        let array = document.querySelectorAll('[translatePlane]');
        for(let i = 0; i < array.length; i++)
            array[i].setAttribute('visible', false);
    }*/
        }

//creazione transform (popolamento valori da usare per creare il controllo)
        function createTransform(transformType) {
            let camera = selectCamera();
            let values = null;
            let transform = document.querySelector('#transform');
            if(transform === null ) {
                transform = document.createElement('a-entity');
                transform.setAttribute('id', 'transform');
                document.querySelector('a-scene').appendChild(transform);
            }
            transform.setAttribute('position', targetObject.aframeEl.getAttribute('position'));
            transform.setAttribute('rotation', camera.getAttribute('rotation'));
            if (transformType === 'translate') {
                currentControl = 0;
                values = {
                    x: {
                        tag: 'a-entity',
                        id: 'x',
                        position: '0.3 0 0.3',
                        material: 'color: #ff0000',
                        scale: '0.15 0.15 0.15',
                        rotation: '0 -45 -90',
                        geometry: 'primitive: cone; radiusBottom: 0.25',
                        holdable: ''
                    },
                    xLine: {
                        tag: 'a-entity',
                        id: 'xLine',
                        lineAttribute: 'start: 0.3, 0, 0.3; end: 0 0 0; color: #ff0000'
                    },
                    y: {
                        tag: 'a-entity',
                        id: 'y',
                        position: '0 0.3 0',
                        material: 'color: #00ff00',
                        scale: '0.15 0.15 0.15',
                        rotation: '0 0 0',
                        geometry: 'primitive: cone; radiusBottom: 0.25',
                        holdable: ''
                    },
                    yLine: {
                        tag: 'a-entity',
                        id: 'yLine',
                        lineAttribute: 'start: 0, 0.3, 0; end: 0 0 0; color: #00ff00'
                    },
                    z: {
                        tag: 'a-entity',
                        id: 'z',
                        position: '-0.3 0 0.3',
                        material: 'color: #0000ff',
                        scale: '0.15 0.15 0.15',
                        rotation: '0 45 90',
                        geometry: 'primitive: cone; radiusBottom: 0.25',
                        holdable: ''
                    },
                    zLine: {
                        tag: 'a-entity',
                        id: 'zLine',
                        lineAttribute: 'start: -0.3, 0, 0.3; end: 0 0 0; color: #0000ff'
                    },
                    all: {
                        tag: 'a-entity',
                        id: 'all',
                        position: '0 0 0',
                        material: 'color: #ffffff',
                        scale: '0.05 0.05 0.05',
                        geometry: 'primitive: sphere',
                        holdable: ''
                    }
                }
            } else if (transformType === 'scale') {
                currentControl = 1;
                values = {
                    x: {
                        tag: 'a-entity',
                        id: 'x',
                        position: '0.2 0 0.2',
                        material: 'color: #ff0000',
                        scale: '0.06 0.06 0.06',
                        rotation: '0 45 0',
                        geometry: 'primitive: box',
                        holdable: ''
                    },
                    xLine: {
                        tag: 'a-entity',
                        id: 'xLine',
                        lineAttribute: 'start: 0.2, 0, 0.2; end: 0 0 0; color: #ff0000'
                    },
                    y: {
                        tag: 'a-entity',
                        id: 'y',
                        position: '0 0.2 0',
                        material: 'color: #00ff00',
                        scale: '0.06 0.06 0.06',
                        rotation: '0 45 0',
                        geometry: 'primitive: box',
                        holdable: ''
                    },
                    yLine: {
                        tag: 'a-entity',
                        id: 'yLine',
                        lineAttribute: 'start: 0, 0.2, 0; end: 0 0 0; color: #00ff00'
                    },
                    z: {
                        tag: 'a-entity',
                        id: 'z',
                        position: '-0.2 0 0.2',
                        material: 'color: #0000ff',
                        scale: '0.06 0.06 0.06',
                        rotation: '0 45 0',
                        geometry: 'primitive: box',
                        holdable: ''
                    },
                    zLine: {
                        tag: 'a-entity',
                        id: 'zLine',
                        lineAttribute: 'start: -0.2, 0, 0.2; end: 0 0 0; color: #0000ff'
                    },
                    all: {
                        tag: 'a-entity',
                        id: 'all',
                        position: '0 0 0',
                        material: 'color: #ffffff',
                        scale: '0.05 0.05 0.05',
                        geometry: 'primitive: box',
                        holdable: ''
                    }
                }
            } else if (transformType === 'rotate') {
                currentControl = 2;
                values = {
                    x: {
                        tag: 'a-entity',
                        id: 'x',
                        position: '0 0 0',
                        material: 'color: #ff0000',
                        scale: '0.075 0.075 0.075',
                        rotation: '0 90 0',
                        geometry: 'primitive: torus; radius: 5; radiusTubular: 0.1; segmentsRadial: 100; segmentsTubular: 100',
                        holdable: ''
                    },
                    xLine: {
                        tag: 'a-entity',
                        id: 'xLine',
                        lineAttribute: 'visible: false'
                    },
                    y: {
                        tag: 'a-entity',
                        id: 'y',
                        position: '0 0 0',
                        material: 'color: #00ff00',
                        scale: '0.075 0.075 0.075',
                        rotation: '90 0 0',
                        geometry: 'primitive: torus; radius: 5; radiusTubular: 0.1; segmentsRadial: 100; segmentsTubular: 100',
                        holdable: ''
                    },
                    yLine: {
                        tag: 'a-entity',
                        id: 'yLine',
                        lineAttribute: 'visible: false'
                    },
                    z: {
                        tag: 'a-entity',
                        id: 'z',
                        position: '0 0 0',
                        material: 'color: #0000ff',
                        scale: '0.075 0.075 0.075',
                        rotation: '0 0 0',
                        geometry: 'primitive: torus; radius: 5; radiusTubular: 0.1; segmentsRadial: 100; segmentsTubular: 100',
                        holdable: ''
                    },
                    zLine: {
                        tag: 'a-entity',
                        id: 'zLine',
                        lineAttribute: 'visible: false'
                    },
                    all: {
                        tag: 'a-entity',
                        id: 'all',
                        position: '0 0 0',
                        material: 'color: #ffffff',
                        scale: '0.075 0.075 0.075',
                        geometry: 'primitive: torus; radius: 6; radiusTubular: 0.1; segmentsRadial: 100; segmentsTubular: 100',
                        holdable: ''
                    }
                }
            }
            createControl(transform, values);
        }

        function createPath () {
            //definizione del percorso. il percorso viene creato con un componente esterno per a-frame
            //#1 curva
            let curve = document.querySelector('#curve');
            if(curve === null) {
                curve = document.createElement('a-curve');
                curve.setAttribute('id', 'curve');
                document.querySelector('a-scene').appendChild(curve);
                //#2 punti (figli)
                let child0 = document.createElement('a-curve-point');
                child0.setAttribute('id', 'point0');
                child0.setAttribute('position', '0 0 0');
                curve.appendChild(child0);
                let child2 = document.createElement('a-curve-point');
                child2.setAttribute('id', 'point2');
                //child2: "origine"
                child2.setAttribute('position', '0 0 0');
                curve.appendChild(child2);
            }
        }

        AFRAME.registerComponent('intersect-and-manipulate', {
            //raycaster (dipendenza dal componente a-frame)
            dependencies: ['raycaster'],
            schema: {
                //mano da utilizzare per il raggio
                hand: {type: 'string', default: 'right', oneOf: ['left', 'right']},
                //controllo da gestire per l'oggetto selezionato
                control: {type: 'string', default: 'translate', oneOf: ['translate', 'scale', 'rotate']},
                tag: {type: 'string', default: 'selectable'}
            },

            init: function () {
                this.el.setAttribute('raycaster', {
                    //showLine: false,
                    //evitare collisioni con la camera o con il raggio stesso
                    near: 0.05,
                    //lunghezza del raggio
                    far: 0
                });
                //event listener: il raggio ha intersecato qualcosa
                //nel momento in cui un oggetto viene intersecato dal raggio, viene creato un percorso che parte dalla posizione
                //dell'oggetto e arriva alla posizione della camera (posizione dell'utente) e l'oggetto intersecato segue questo
                //percorso
                this.el.addEventListener('raycaster-intersection', this.raycasterIntersection.bind(this));
                this.el.addEventListener('raycaster-intersection-cleared', function () {
                    intersection = false;
                });
            },

            tick: function () {
                switch (this.data.control) {
                    case 'translate':
                        if(currentControl !== 0) {
                            currentControl = 0;
                            createTransform(controls[currentControl]);
                        }
                        break;
                    case 'scale':
                        if(currentControl !== 1) {
                            currentControl = 1;
                            createTransform(controls[currentControl]);
                        }
                        break;
                    case 'rotate':
                        if(currentControl !== 2) {
                            currentControl = 2;
                            createTransform(controls[currentControl]);
                        }
                        break;
                }
                if(this.el.getAttribute('line') !== null)
                    this.el.removeAttribute('line');
                let camera = selectCamera();
                let aframeHand = selectedHand(this.data.hand);
                let hand = null;
                if (aframeHand)
                    hand = aframeHand.components['leap-hand'].getHand();
                //informazioni LeapMotion SDK
                if (validHand(hand)) {
                    //posizione del palmo e riconoscimento gesto
                    if (gestureRecognizer(hand)) {
                        //hand raycaster
                        let origin = aframeHand.components['leap-hand'].intersector.raycaster.ray.origin;
                        let relativeOriginPosition = origin.clone();
                        //camera.components['camera'].el.object3D.updateMatrixWorld();
                        camera.components['camera'].el.object3D.worldToLocal(relativeOriginPosition);
                        //modifica del raycaster del componente con posizione della mano (coincide con la mesh)
                        this.el.setAttribute('raycaster', {
                            origin: relativeOriginPosition,
                            far: 5
                        });
                        //percorso meshline relativo
                        let path = relativeOriginPosition.x + ' ' + relativeOriginPosition.y + ' ' + relativeOriginPosition.z + ', ' + relativeOriginPosition.x + ' ' + relativeOriginPosition.y + ' ' + (relativeOriginPosition.z - 5);
                        if (intersection) {
                            this.el.setAttribute('meshline', {
                                lineWidth: 20,
                                path: path,
                                color: '#74BEC1',
                                lineWidthStyler: '1 - p'
                            });
                        } else {
                            this.el.setAttribute('meshline', {
                                lineWidth: 20,
                                path: path,
                                color: '#FFFFFF',
                                lineWidthStyler: '1 - p'
                            });
                        }
                    } else {
                        if(this.el.getAttribute('meshline') !== null) {
                            this.el.removeAttribute('meshline');
                            this.el.setAttribute('raycaster', {
                                far: 0
                            });
                        }
                    }
                }
                let transform = document.querySelector('#transform');
                if (transform !== null) {
                    let cameraPosition = camera.getAttribute('position');
                    //scala il transform in base alla distanza
                    let transformPosition = document.querySelector('#transform').getAttribute('position');
                    let distance = new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z).distanceTo(new THREE.Vector3(transformPosition.x, transformPosition.y, transformPosition.z));
                    transform.setAttribute('scale', (distance) + ' ' + (distance) + ' ' + (distance));
                }
            },

            raycasterIntersection: function (event) {
                let camera = selectCamera();
                //oggetto intersecato
                let intersectedObject = event.detail.els[0];
                //mano visibile
                let isVisible = selectedHand(event.srcElement.components['intersect-and-manipulate'].data.hand).components['leap-hand'].isVisible;
                if (isVisible) {
                    //posizioni elemento intersecato e camera per successiva definizione del percorso
                    let endPath = intersectedObject.getAttribute('position');
                    //camera.components['camera'].el.object3D.updateMatrixWorld();
                    let localPosition = new THREE.Vector3(0, -0.5, -3);
                    let startPath = camera.components['camera'].el.object3D.localToWorld(localPosition);
                    if (intersectedObject.getAttribute(this.data.tag) !== null) {
                        //inizia il percorso del nuovo oggetto
                        intersection = true;
                        createPath();
                        document.querySelector('#point0').setAttribute('position', endPath);
                        document.querySelector('#point2').setAttribute('position', startPath);
                        intersectedObject.setAttribute('alongpath', {
                            curve: '#curve',
                            delay: 1500
                        });
                        intersectedObject.addEventListener('movingstarted', function (event) {
                            transformCreated = false;
                        });
                        intersectedObject.addEventListener('movingended', function (event) {
                            if (!transformCreated) {
                                //propagazione evento
                                event.srcElement.setAttribute('alongpath', {
                                    triggerRadius: 0
                                });
                                event.srcElement.removeAttribute('alongpath');
                                if(targetObject.aframeEl !== null && targetObject.aframeEl !== undefined && oldOpacity !== null) {
                                    targetObject.aframeEl.setAttribute('material', 'opacity: ' + oldOpacity);
                                    //se l'elemento non è stato traslato
                                    if(oldPosition !== null)
                                        targetObject.aframeEl.setAttribute('position', oldPosition);
                                }
                                //aggiornamento vecchia posizione
                                oldPosition = endPath;
                                targetObject.aframeEl = event.srcElement;
                                if(targetObject.aframeEl.getAttribute('material') !== null)
                                    oldOpacity = targetObject.aframeEl.getAttribute('material').opacity;
                                else
                                    oldOpacity = null;
                                //creazione transform
                                createTransform(controls[currentControl]);
                                transformCreated = true;
                                event.srcElement.setAttribute('material', 'opacity: 0.5');
                            }
                        });
                    } else
                        intersection = false;
                }
            }
        });

        let firstHandPosition = null; //posizione della mano nel momento in cui viene chiamato l'evento leap-holdstart
        let start = false; //indica se l'evento sia stato emesso o meno
        let target = null; //oggetto da trasformare
        let hand = null; //mano che innesca l'evento
        let targetOriginalValue = null; //valore iniziale del target per somma (posizione, scala, rotazione)
        let axis = null; //asse scelto per la modifica
        let oldTransformPosition = null; //posizione precedente transform per spostamento
        let handTick = null; //posizione della mano al tick della scena (da cui viene sottratta la posizione iniziale del pollice)

//riprinstina il colore degli assi in hold stop
        function oldColor () {
            if (axis === 'x')
                return '#ff0000';
            else if (axis === 'y')
                return '#00ff00';
            else if (axis === 'z')
                return '#0000ff';
            else if (axis === 'all')
                return '#ffffff';
        }

//mano che innesca l'evento hold start da cui recuperare la posizione delle dita
        function selectHand() {
            let i = 0;
            switch (axis) {
                case 'x':
                    i = 0;
                    break;
                case 'y':
                    i = 1;
                    break;
                case 'z':
                    i = 2;
                    break;
            }
            let hands = document.querySelectorAll('[leap-hand]');
            for (let j = 0; j < hands.length; j++) {
                if (hands[j].components['leap-hand'].getHand() !== undefined && hands[j].components['leap-hand'].getHand().type === hand.type) {
                    if (axis !== 'all' && controls[currentControl] !== 'rotate')
                        handTick = hands[j].components['leap-hand'].getHand().pointables[0].tipPosition[i];
                    else
                        handTick = hands[j].components['leap-hand'].getHand().pointables[0].tipPosition;
                }
            }
        }

        AFRAME.registerComponent('holdable', {

            init: function () {
                this.el.addEventListener('leap-holdstart', this.onHoldStart.bind(this));
                this.el.addEventListener('leap-holdstop', this.onHoldStop.bind(this));
            },

            tick: function () {
                if (start) {
                    if (axis !== null) {
                        //selezione posizione mano in base all'asse
                        selectHand();
                        if (handTick !== null) {
                            //modifica del parametro in base all'asse scelto
                            //(differenza tra posizione pollice in holdstart e ad ogni tick)
                            switch (axis) {
                                case 'x':
                                    if (controls[currentControl] === 'translate') {
                                        target.setAttribute('position', {
                                            x: targetOriginalValue.x + (handTick - firstHandPosition[0]),
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z
                                        });//spostamento assi assieme all'oggetto target
                                        document.querySelector('#transform').setAttribute('position', {
                                            x: oldTransformPosition.x + (handTick - firstHandPosition[0]),
                                            y: oldTransformPosition.y,
                                            z: oldTransformPosition.z
                                        });
                                    } else if (controls[currentControl] === 'scale') {
                                        target.setAttribute('scale', {
                                            x: targetOriginalValue.x + handTick - firstHandPosition[0],
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z
                                        });
                                    } else if (controls[currentControl] === 'rotate') {
                                        target.setAttribute('rotation', {
                                            x: targetOriginalValue.x + ((handTick[1] - firstHandPosition[1]) * 360) % 360,
                                            //x: THREE.Math.radToDeg(targetOriginalValue.x + handTick[1] - firstHandPosition[1]) % 360,
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z
                                        });
                                    }
                                    break;
                                case 'y':
                                    if (controls[currentControl] === 'translate') {
                                        target.setAttribute('position', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y + (handTick - firstHandPosition[1]),
                                            z: targetOriginalValue.z
                                        });
                                        document.querySelector('#transform').setAttribute('position', {
                                            x: oldTransformPosition.x,
                                            y: (oldTransformPosition.y + (handTick - firstHandPosition[1])),
                                            z: oldTransformPosition.z
                                        });
                                    } else if (controls[currentControl] === 'scale') {
                                        target.setAttribute('scale', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y + (handTick - firstHandPosition[1]),
                                            z: targetOriginalValue.z
                                        });
                                    } else if (controls[currentControl] === 'rotate') {
                                        target.setAttribute('rotation', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y + ((handTick[0] - firstHandPosition[0]) * 360) % 360,
                                            //y: THREE.Math.radToDeg(targetOriginalValue.y + handTick[0] - firstHandPosition[0]) % 360,
                                            z: targetOriginalValue.z
                                        });
                                    }
                                    break;
                                case 'z':
                                    if (controls[currentControl] === 'translate') {
                                        target.setAttribute('position', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z + (handTick - firstHandPosition[2])
                                        });
                                        document.querySelector('#transform').setAttribute('position', {
                                            x: oldTransformPosition.x,
                                            y: oldTransformPosition.y,
                                            z: oldTransformPosition.z + (handTick - firstHandPosition[2])
                                        });
                                    } else if (controls[currentControl] === 'scale') {
                                        target.setAttribute('scale', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z + (handTick - firstHandPosition[2])
                                        });
                                    } else if (controls[currentControl] === 'rotate') {
                                        target.setAttribute('rotation', {
                                            x: targetOriginalValue.x,
                                            y: targetOriginalValue.y,
                                            z: targetOriginalValue.z + ((handTick[0] - firstHandPosition[0] + handTick[1] - firstHandPosition[1]) * 180) % 360
                                            //z: THREE.Math.radToDeg(targetOriginalValue.z + handTick[0] - firstHandPosition[0] + handTick[1] - firstHandPosition[1]) % 360
                                        });
                                    }
                                    break;
                                case 'all':
                                    //la distanza viene calcolata solo qui perché all prevede lo stesso valore per tutti gli assi. nei casi diversi da all si tiene conto solo dello spostamento sull'asse scelto
                                    let allPosition = document.querySelector('#all').getAttribute('position');
                                    let distance = new THREE.Vector3(allPosition.x, allPosition.y, allPosition.z).distanceTo(new THREE.Vector3(handTick[0], handTick[1], handTick[2]));
                                    if (controls[currentControl] === 'translate') {
                                        target.setAttribute('position', {
                                            x: targetOriginalValue.x + distance,
                                            y: targetOriginalValue.y + distance,
                                            z: targetOriginalValue.z + distance
                                        });
                                        document.querySelector('#transform').setAttribute('position', {
                                            x: oldTransformPosition.x + distance,
                                            y: oldTransformPosition.y + distance,
                                            z: oldTransformPosition.z + distance
                                        });
                                    } else if (controls[currentControl] === 'scale') {
                                        target.setAttribute('scale', {
                                            x: targetOriginalValue.x + distance,
                                            y: targetOriginalValue.y + distance,
                                            z: targetOriginalValue.z + distance
                                        });
                                    } else if (controls[currentControl] === 'rotate') {
                                        target.setAttribute('rotation', {
                                            x: targetOriginalValue.x + (distance * 360) % 360,
                                            y: targetOriginalValue.y + (distance * 360) % 360,
                                            z: targetOriginalValue.z + (distance * 360) % 360
                                            /*x: THREE.Math.radToDeg(targetOriginalValue.x + distance) % 360,
                                    y: THREE.Math.radToDeg(targetOriginalValue.y + distance) % 360,
                                    z: THREE.Math.radToDeg(targetOriginalValue.z + distance) % 360*/
                                        });
                                    }
                                    break;
                            }
                        } else
                        //emette l'evento stop perché la mano non è più visibile
                            this.el.emit('leap-holdstop');
                    }
                } else
                    axis = targetOriginalValue = hand = target = null;
            },

            onHoldStart: function (e) {
                if(controls[currentControl] === 'translate')
                    oldPosition = null;
                //la vecchia posizione viene sovrascritta da null nel caso di traslazione dell'oggetto
                target = targetObject.aframeEl;
                axis = e.srcElement.id;
                //if (e.detail.hand !== null && e.detail !== undefined && e.detail.hand) {
                if (e.detail.hand !== null && e.detail.hand) {
                    //assegnamento mano che innescato l'evento
                    hand = e.detail.hand;
                    firstHandPosition = e.detail.hand.pointables[0].tipPosition;
                    //assegnato target dallo script componente
                    start = true;
                    document.querySelector('#' + axis).setAttribute('material', {
                        color: '#ffff00'
                    });
                    if(axis !== 'all')
                        document.querySelector('#' + axis + 'Line').setAttribute('line', {
                            color: '#ffff00'
                        });
                    //salvataggio posizione precedente
                    if (controls[currentControl] === 'translate') {
                        targetOriginalValue = target.getAttribute('position');
                        oldTransformPosition = document.querySelector('#transform').getAttribute('position');
                    } else if (controls[currentControl] === 'scale')
                        targetOriginalValue = target.getAttribute('scale');
                    else if (controls[currentControl] === 'rotate')
                        targetOriginalValue = target.getAttribute('rotation');
                }
            },

            onHoldStop: function () {
                //l'evento emesso è stato "stoppato"
                start = false;
                //assegnamento colore precedente
                document.querySelector('#' + axis).setAttribute('material', {
                    color: oldColor()
                });
                if(axis !== 'all')
                    document.querySelector('#' + axis + 'Line').setAttribute('line', {
                        color: oldColor()
                    });
            }
        });

    },{"aframe-alongpath-component":4,"aframe-curve-component":5,"aframe-leap-hands":6,"aframe-meshline-component":13}],4:[function(require,module,exports){
        if (typeof AFRAME === 'undefined') {
            throw new Error('Component attempted to register before AFRAME was available.');
        }

        /**
         * Alongpath component for A-Frame.
         * Move Entities along a predefined Curve
         */
        AFRAME.registerComponent('alongpath', {

            //dependencies: ['curve'],

            schema: {
                curve: {default: ''},
                triggers: {default: 'a-curve-point'},
                triggerRadius: {type: 'number', default: 0.01},
                dur: {default: 1000},
                delay: {default: 0},
                loop: {default: false},
                rotate: {default: false},
                resetonplay: {default:true}
            },

            init: function () {

                // We have to fetch curve and triggers manually because of an A-FRAME ISSUE
                // with Property-Type "Selector" / "SelectorAll": https://github.com/aframevr/aframe/issues/2517

            },

            update: function (oldData) {

                this.curve = document.querySelector(this.data.curve);
                this.triggers = this.curve.querySelectorAll(this.data.triggers);

                if (!this.curve) {
                    console.warn("Curve not found. Can't follow anything...");
                } else {
                    this.initialPosition = this.el.object3D.position;
                }

                this.reset();
            },

            reset: function() {
                // Reset to initial state
                this.interval = 0;

                this.el.removeState("endofpath");
                this.el.removeState("moveonpath");

                if (this.activeTrigger) {
                    this.activeTrigger.removeState("alongpath-active-trigger");
                    this.activeTrigger = null;
                }
            },

            tick: function (time, timeDelta) {
                var curve = this.curve.components['curve'] ? this.curve.components['curve'].curve : null;

                if (curve) {
                    // Only update position if we didn't reach
                    // the end of the path
                    if (!this.el.is("endofpath")) {
                        this.interval = this.interval + timeDelta;

                        var i = 0;

                        if (this.interval - this.data.delay >= this.data.dur) {
                            // Time is up, we should be at the end of the path
                            i = 1;
                        } else if ((this.interval - this.data.delay < 0)) {
                            // We are still waiting for the delay-time to finish
                            // so keep entity at the beginning of the path
                            i = 0;
                        } else {
                            // Update path position based on timing
                            i = (this.interval - this.data.delay) / this.data.dur;
                        }

                        if ((this.data.loop === false) && i >= 1) {
                            // Set the end-position
                            this.el.setAttribute('position', curve.points[curve.points.length - 1]);

                            // We have reached the end of the path and are not going
                            // to loop back to the beginning therefore set final state
                            this.el.removeState("moveonpath");
                            this.el.addState("endofpath");
                            this.el.emit("movingended");
                        } else if ((this.data.loop === true) && i >= 1) {
                            // We have reached the end of the path
                            // but we are looping through the curve,
                            // so restart here.
                            this.el.emit("movingended");
                            this.interval = this.data.delay;
                        } else {
                            // We are starting to move or somewhere in the middle of the path…
                            if (!this.el.is("moveonpath")) {
                                this.el.addState("moveonpath");
                                this.el.emit("movingstarted");
                            }

                            // …updating position
                            var p = curve.getPoint(i);
                            this.el.setAttribute('position', p);
                        }

                        // Update Rotation of Entity
                        // Based on http://jsfiddle.net/qGPTT/133/
                        if (this.data.rotate === true) {
                            var axis = new THREE.Vector3();
                            var up = new THREE.Vector3(0, 1, 0);
                            var tangent = curve.getTangentAt(i).normalize();

                            axis.crossVectors(up, tangent).normalize();

                            var radians = Math.acos(up.dot(tangent));

                            this.el.object3D.quaternion.setFromAxisAngle(axis, radians);
                        }

                        // Check for Active-Triggers
                        if (this.triggers && (this.triggers.length > 0)) {
                            this.updateActiveTrigger();
                        }
                    }
                } else {
                    console.error("The entity associated with the curve property has no curve component.");
                }
            },

            play: function () {
                if (this.data.resetonplay) {
                    this.reset();
                }
            },

            remove: function () {
                this.el.object3D.position.copy(this.initialPosition);
            },

            updateActiveTrigger: function() {
                for (var i = 0; i < this.triggers.length; i++) {
                    if (this.triggers[i].object3D) {
                        if (this.triggers[i].object3D.position.distanceTo(this.el.object3D.position) <= this.data.triggerRadius) {
                            // If this element is not the active trigger, activate it - and if necessary deactivate other triggers.
                            if (this.activeTrigger && (this.activeTrigger != this.triggers[i])) {
                                this.activeTrigger.removeState("alongpath-active-trigger");
                                this.activeTrigger.emit("alongpath-trigger-deactivated");

                                this.activeTrigger = this.triggers[i];
                                this.activeTrigger.addState("alongpath-active-trigger");
                                this.activeTrigger.emit("alongpath-trigger-activated");
                            } else if (!this.activeTrigger) {
                                this.activeTrigger = this.triggers[i];
                                this.activeTrigger.addState("alongpath-active-trigger");
                                this.activeTrigger.emit("alongpath-trigger-activated");
                            }

                            break;
                        } else {
                            // If this Element was the active trigger, deactivate it
                            if (this.activeTrigger && (this.activeTrigger == this.triggers[i])) {
                                this.activeTrigger.removeState("alongpath-active-trigger");
                                this.activeTrigger.emit("alongpath-trigger-deactivated");
                                this.activeTrigger = null;
                            }
                        }
                    }
                }
            }

        });
    },{}],5:[function(require,module,exports){
        /* global AFRAME */

        if (typeof AFRAME === 'undefined') {
            throw new Error('Component attempted to register before AFRAME was available.');
        }

        /**
         * Curve component for A-Frame to deal with spline curves
         */
        var zAxis = new THREE.Vector3(0, 0, 1);
        var degToRad = THREE.Math.degToRad;

        AFRAME.registerComponent('curve-point', {

            //dependencies: ['position'],

            schema: {},

            init: function () {
                this.el.addEventListener("componentchanged", this.changeHandler.bind(this));
                this.el.emit("curve-point-change");
            },

            changeHandler: function (event) {
                if (event.detail.name == "position") {
                    this.el.emit("curve-point-change");
                }
            }

        });

        AFRAME.registerComponent('curve', {

            //dependencies: ['curve-point'],

            schema: {
                type: {
                    type: 'string',
                    default: 'CatmullRom',
                    oneOf: ['CatmullRom', 'CubicBezier', 'QuadraticBezier', 'Line']
                },
                closed: {
                    type: 'boolean',
                    default: false
                }
            },

            init: function () {
                this.pathPoints = null;
                this.curve = null;

                this.el.addEventListener("curve-point-change", this.update.bind(this));
            },

            update: function (oldData) {

                this.points = Array.from(this.el.querySelectorAll("a-curve-point, [curve-point]"));

                if (this.points.length <= 1) {
                    console.warn("At least 2 curve-points needed to draw a curve");
                    this.curve = null;
                } else {
                    // Get Array of Positions from Curve-Points
                    var pointsArray = this.points.map(function (point) {

                        if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
                            return point;
                        }

                        return point.object3D.getWorldPosition();
                    });

                    // Update the Curve if either the Curve-Points or other Properties changed
                    if (!AFRAME.utils.deepEqual(pointsArray, this.pathPoints) || (oldData !== 'CustomEvent' && !AFRAME.utils.deepEqual(this.data, oldData))) {
                        this.curve = null;

                        this.pathPoints = pointsArray;

                        // TODO: Make other Curve-Types work
                        //this.threeConstructor = THREE[this.data.type + 'Curve3'];
                        this.threeConstructor = THREE['CatmullRomCurve3'];

                        if (!this.threeConstructor) {
                            throw new Error('No Three constructor of type (case sensitive): ' + this.data.type + 'Curve3');
                        }

                        // Create Curve
                        this.curve = new this.threeConstructor(this.pathPoints);
                        this.curve.closed = this.data.closed;

                        this.el.emit('curve-updated');
                    }
                }

            },

            remove: function () {
                this.el.removeEventListener("curve-point-change", this.update.bind(this));
            },

            closestPointInLocalSpace: function closestPoint(point, resolution, testPoint, currentRes) {
                if (!this.curve) throw Error('Curve not instantiated yet.');
                resolution = resolution || 0.1 / this.curve.getLength();
                currentRes = currentRes || 0.5;
                testPoint = testPoint || 0.5;
                currentRes /= 2;
                var aTest = testPoint + currentRes;
                var bTest = testPoint - currentRes;
                var a = this.curve.getPointAt(aTest);
                var b = this.curve.getPointAt(bTest);
                var aDistance = a.distanceTo(point);
                var bDistance = b.distanceTo(point);
                var aSmaller = aDistance < bDistance;
                if (currentRes < resolution) {

                    var tangent = this.curve.getTangentAt(aSmaller ? aTest : bTest);
                    if (currentRes < resolution) return {
                        result: aSmaller ? aTest : bTest,
                        location: aSmaller ? a : b,
                        distance: aSmaller ? aDistance : bDistance,
                        normal: normalFromTangent(tangent),
                        tangent: tangent
                    };
                }
                if (aDistance < bDistance) {
                    return this.closestPointInLocalSpace(point, resolution, aTest, currentRes);
                } else {
                    return this.closestPointInLocalSpace(point, resolution, bTest, currentRes);
                }
            }
        });


        var tempQuaternion = new THREE.Quaternion();

        function normalFromTangent(tangent) {
            var lineEnd = new THREE.Vector3(0, 1, 0);
            tempQuaternion.setFromUnitVectors(zAxis, tangent);
            lineEnd.applyQuaternion(tempQuaternion);
            return lineEnd;
        }

        AFRAME.registerShader('line', {
            schema: {
                color: {default: '#ff0000'},
            },

            init: function (data) {
                this.material = new THREE.LineBasicMaterial(data);
            },

            update: function (data) {
                this.material = new THREE.LineBasicMaterial(data);
            },
        });

        AFRAME.registerComponent('draw-curve', {

            //dependencies: ['curve', 'material'],

            schema: {
                curve: {type: 'selector'}
            },

            init: function () {
                this.data.curve.addEventListener('curve-updated', this.update.bind(this));
            },

            update: function () {
                if (this.data.curve) {
                    this.curve = this.data.curve.components.curve;
                }

                if (this.curve && this.curve.curve) {
                    var mesh = this.el.getOrCreateObject3D('mesh', THREE.Line);

                    lineMaterial = mesh.material ? mesh.material : new THREE.LineBasicMaterial({
                        color: "#ff0000"
                    });

                    var lineGeometry = new THREE.Geometry();
                    lineGeometry.vertices = this.curve.curve.getPoints(this.curve.curve.points.length * 10);

                    this.el.setObject3D('mesh', new THREE.Line(lineGeometry, lineMaterial));
                }
            },

            remove: function () {
                this.data.curve.removeEventListener('curve-updated', this.update.bind(this));
                this.el.getObject3D('mesh').geometry = new THREE.Geometry();
            }

        });

        AFRAME.registerComponent('clone-along-curve', {

            //dependencies: ['curve'],

            schema: {
                curve: {type: 'selector'},
                spacing: {default: 1},
                rotation: {
                    type: 'vec3',
                    default: '0 0 0'
                },
                scale: {
                    type: 'vec3',
                    default: '1 1 1'
                }
            },

            init: function () {
                this.el.addEventListener('model-loaded', this.update.bind(this));
                this.data.curve.addEventListener('curve-updated', this.update.bind(this));
            },

            update: function () {
                this.remove();

                if (this.data.curve) {
                    this.curve = this.data.curve.components.curve;
                }

                if (!this.el.getObject3D('clones') && this.curve && this.curve.curve) {
                    var mesh = this.el.getObject3D('mesh');

                    var length = this.curve.curve.getLength();
                    var start = 0;
                    var counter = start;

                    var cloneMesh = this.el.getOrCreateObject3D('clones', THREE.Group);

                    var parent = new THREE.Object3D();
                    mesh.scale.set(this.data.scale.x, this.data.scale.y, this.data.scale.z);
                    mesh.rotation.set(degToRad(this.data.rotation.x), degToRad(this.data.rotation.y), degToRad(this.data.rotation.z));
                    mesh.rotation.order = 'YXZ';

                    parent.add(mesh);

                    while (counter <= length) {
                        var child = parent.clone(true);

                        child.position.copy(this.curve.curve.getPointAt(counter / length));

                        tangent = this.curve.curve.getTangentAt(counter / length).normalize();

                        child.quaternion.setFromUnitVectors(zAxis, tangent);

                        cloneMesh.add(child);

                        counter += this.data.spacing;
                    }
                }
            },

            remove: function () {
                this.curve = null;
                if (this.el.getObject3D('clones')) {
                    this.el.removeObject3D('clones');
                }
            }

        });

        AFRAME.registerPrimitive('a-draw-curve', {
            defaultComponents: {
                'draw-curve': {},
            },
            mappings: {
                curveref: 'draw-curve.curve',
            }
        });

        AFRAME.registerPrimitive('a-curve-point', {
            defaultComponents: {
                'curve-point': {},
            },
            mappings: {}
        });

        AFRAME.registerPrimitive('a-curve', {
            defaultComponents: {
                'curve': {}
            },

            mappings: {
                type: 'curve.type',
            }
        });

    },{}],6:[function(require,module,exports){
        module.exports = {
            'system': require('./src/leap-system'),
            'leap-hand': require('./src/leap-hand'),
            registerAll: function () {
                AFRAME.registerSystem('leap', this.system);
                AFRAME.registerComponent('leap-hand', this['leap-hand']);
            }
        };

    },{"./src/leap-hand":11,"./src/leap-system":12}],7:[function(require,module,exports){
        var DEFAULTS = {
                showArm: true,
                opacity: 1.0,
                segments: 16,
                boneScale: 1/6,
                boneColor: 0xFFFFFF,
                jointScale: 1/5,
                jointColor: null
            },
            JOINT_COLORS = [0x5DAA00, 0xA00041],
            BASE_BONE_ROTATION = (new THREE.Quaternion())
                .setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
            ARM_TOP_AND_BOTTOM_ROTATION = (new THREE.Quaternion())
                .setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));

        var numInstances = 0;

        /**
         * Wrapper for a THREE.Mesh instance fitted to a single Leap Motion hand.
         * @param {Object} options
         */
        function HandMesh(options) {
            this.options = options = Object.assign({}, DEFAULTS, options || {});
            this.options.jointColor = this.options.jointColor || JOINT_COLORS[numInstances % 2];
            this.object3D = new THREE.Object3D();
            this.material = !isNaN(options.opacity) ? new THREE.MeshPhongMaterial({
                fog: false,
                transparent: true,
                opacity: options.opacity
            }) : new THREE.MeshPhongMaterial({fog: false});

            this.createFingers();
            this.createArm();
            numInstances++;
        }

        /** @return {Leap.HandMesh} */
        HandMesh.prototype.createFingers = function () {
            var mesh, finger, boneCount,
                options = this.options,
                boneRadius = 40 * options.boneScale,
                jointRadius = 40 * options.jointScale;

            this.fingerMeshes = [];
            for (var i = 0; i < 5; i++) {
                finger = [];
                boneCount = i === 0 ? 3 : 4;
                for (var j = 0; j < boneCount; j++) {
                    mesh = new THREE.Mesh(
                        new THREE.SphereGeometry(jointRadius, options.segments, options.segments),
                        this.material.clone()
                    );
                    mesh.name = 'hand-bone-' + j;
                    mesh.material.color.setHex(options.jointColor);
                    // mesh.renderDepth = ((i * 9) + (2 * j)) / 36;
                    this.object3D.add(mesh);
                    finger.push(mesh);

                    mesh = new THREE.Mesh(
                        new THREE.CylinderGeometry(boneRadius, boneRadius, 40, options.segments),
                        this.material.clone()
                    );
                    mesh.name = 'hand-joint-' + j;
                    mesh.material.color.setHex(options.boneColor);
                    // mesh.renderDepth = ((i * 9) + (2 * j) + 1) / 36;
                    this.object3D.add(mesh);
                    finger.push(mesh);
                }

                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(jointRadius, options.segments, options.segments),
                    this.material.clone()
                );
                mesh.material.color.setHex(options.jointColor);
                this.object3D.add(mesh);
                finger.push(mesh);
                this.fingerMeshes.push(finger);
            }
            return this;
        };

        /** @return {Leap.HandMesh} */
        HandMesh.prototype.createArm = function () {
            if (!this.options.showArm) return;

            var options = this.options,
                boneRadius = 40 * options.boneScale,
                jointRadius = 40 * options.jointScale;

            this.armMesh = new THREE.Object3D();
            this.armBones = [];
            this.armSpheres = [];
            for (var i = 0; i <= 3; i++) {
                this.armBones.push(
                    new THREE.Mesh(
                        new THREE.CylinderGeometry(
                            boneRadius, boneRadius, (i < 2 ? 1000 : 100), options.segments
                        ),
                        this.material.clone()
                    )
                );
                this.armBones[i].material.color.setHex(options.boneColor);
                this.armBones[i].castShadow = true;
                this.armBones[i].name = 'ArmBone' + i;
                if (i > 1) {
                    this.armBones[i].quaternion.multiply(ARM_TOP_AND_BOTTOM_ROTATION);
                }
                this.armMesh.add(this.armBones[i]);
            }
            this.armSpheres = [];
            for (i = 0; i <= 3; i++) {
                this.armSpheres.push(new THREE.Mesh(
                    new THREE.SphereGeometry(jointRadius, options.segments, options.segments),
                    this.material.clone()
                ));
                this.armSpheres[i].material.color.setHex(options.jointColor);
                this.armSpheres[i].castShadow = true;
                this.armSpheres[i].name = 'ArmSphere' + i;
                this.armMesh.add(this.armSpheres[i]);
            }
            this.object3D.add(this.armMesh);
            return this;
        };

        /**
         * @param {function} callback
         * @return {Leap.HandMesh}
         */
        HandMesh.prototype.traverse = function(callback) {
            for (var mesh, ref, i = 0; i < 5; i++) {
                ref = this.fingerMeshes[i];
                for (var j = 0, len = ref.length; j < len; j++) {
                    mesh = ref[j];
                    callback(mesh);
                }
            }
            if (this.armMesh) this.armMesh.traverse(callback);
            return this;
        };

        /**
         * @param  {Leap.Hand} hand
         * @return {Leap.HandMesh}
         */
        HandMesh.prototype.scaleTo = function(hand) {
            var armLenScale, armWidthScale, baseScale, bone, boneXOffset,
                finger, fingerBoneLengthScale, halfArmLength, i, j, mesh, _i, _j;

            baseScale = hand.middleFinger.proximal.length
                / this.fingerMeshes[2][1].geometry.parameters.height;

            for (i = _i = 0; _i < 5; i = ++_i) {
                finger = hand.fingers[i];
                j = 0;
                while (true) {
                    if (j === this.fingerMeshes[i].length - 1) {
                        mesh = this.fingerMeshes[i][j];
                        mesh.scale.set(baseScale, baseScale, baseScale);
                        break;
                    }
                    bone = finger.bones[3 - (j / 2)];
                    mesh = this.fingerMeshes[i][j];
                    mesh.scale.set(baseScale, baseScale, baseScale);
                    j++;
                    mesh = this.fingerMeshes[i][j];
                    fingerBoneLengthScale = bone.length / mesh.geometry.parameters.height;
                    mesh.scale.set(baseScale, fingerBoneLengthScale, baseScale);
                    j++;
                }
            }
            if (this.options.showArm) {
                armLenScale = hand.arm.length
                    / (this.armBones[0].geometry.parameters.height
                        + this.armBones[0].geometry.parameters.radiusTop);
                armWidthScale = hand.arm.width
                    / (this.armBones[2].geometry.parameters.height
                        + this.armBones[2].geometry.parameters.radiusTop);
                for (i = _j = 0; _j <= 3; i = ++_j) {
                    this.armBones[i].scale.set(baseScale, (i < 2 ? armLenScale : armWidthScale), baseScale);
                    this.armSpheres[i].scale.set(baseScale, baseScale, baseScale);
                }
                boneXOffset = (hand.arm.width / 2) * 0.85;
                halfArmLength = hand.arm.length / 2;
                this.armBones[0].position.setX(boneXOffset);
                this.armBones[1].position.setX(-boneXOffset);
                this.armBones[2].position.setY(halfArmLength);
                this.armBones[3].position.setY(-halfArmLength);
                this.armSpheres[0].position.set(-boneXOffset, halfArmLength, 0);
                this.armSpheres[1].position.set(boneXOffset, halfArmLength, 0);
                this.armSpheres[2].position.set(boneXOffset, -halfArmLength, 0);
                this.armSpheres[3].position.set(-boneXOffset, -halfArmLength, 0);
            }
            return this;
        };

        /**
         * @param  {Leap.Hand} hand
         * @return {Leap.HandMesh}
         */
        HandMesh.prototype.formTo = function(hand) {
            var bone, finger, i, j, mesh, _i;
            for (i = _i = 0; _i < 5; i = ++_i) {
                finger = hand.fingers[i];
                j = 0;
                while (true) {
                    if (j === this.fingerMeshes[i].length - 1) {
                        mesh = this.fingerMeshes[i][j];
                        mesh.position.fromArray(bone.prevJoint);
                        break;
                    }
                    bone = finger.bones[3 - (j / 2)];
                    mesh = this.fingerMeshes[i][j];
                    mesh.position.fromArray(bone.nextJoint);
                    ++j;
                    mesh = this.fingerMeshes[i][j];
                    mesh.position.fromArray(bone.center());
                    mesh.setRotationFromMatrix((new THREE.Matrix4()).fromArray(bone.matrix()));
                    mesh.quaternion.multiply(BASE_BONE_ROTATION);
                    ++j;
                }
            }
            if (this.armMesh) {
                this.armMesh.position.fromArray(hand.arm.center());
                this.armMesh.setRotationFromMatrix((new THREE.Matrix4()).fromArray(hand.arm.matrix()));
                this.armMesh.quaternion.multiply(BASE_BONE_ROTATION);
            }
            return this;
        };

        /**
         * @param  {boolean} visible
         * @return {Leap.HandMesh}
         */
        HandMesh.prototype.setVisibility = function(visible) {
            for (var j, i = 0; i < 5; i++) {
                j = 0;
                while (true) {
                    this.fingerMeshes[i][j].visible = visible;
                    if (++j === this.fingerMeshes[i].length) break;
                }
            }
            if (this.options.showArm) {
                for (var k = 0; k <= 3; k++) {
                    this.armBones[k].visible = visible;
                    this.armSpheres[k].visible = visible;
                }
            }
            return this;
        };

        /** @return {Leap.HandMesh} */
        HandMesh.prototype.show = function() {
            this.setVisibility(true);
            return this;
        };

        /** @return {Leap.HandMesh} */
        HandMesh.prototype.hide = function() {
            this.setVisibility(false);
            return this;
        };

        /** @return {THREE.Object3D} */
        HandMesh.prototype.getMesh = function() {
            return this.object3D;
        };

        module.exports = HandMesh;

    },{}],8:[function(require,module,exports){
        var Leap = require('leapjs');

        module.exports = function(scope) {
            var noop, transformDirections, transformMat4Implicit0, transformPositions, transformWithMatrices, _directionTransform;
            if (!scope) {
                scope = {};
            }
            noop = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            _directionTransform = new THREE.Matrix4();
            if (scope.vr === true) {
                this.setOptimizeHMD(true);
                scope.quaternion = (new THREE.Quaternion()).setFromRotationMatrix((new THREE.Matrix4()).set(-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
                scope.scale = 0.001;
                scope.position = new THREE.Vector3(0, 0, -0.08);
            }
            if (scope.vr === 'desktop') {
                scope.scale = 0.001;
            }
            scope.getTransform = function(hand) {
                var matrix;
                if (scope.matrix) {
                    matrix = typeof scope.matrix === 'function' ? scope.matrix(hand) : scope.matrix;
                    if (window.THREE && matrix instanceof THREE.Matrix4) {
                        return matrix.elements;
                    } else {
                        return matrix;
                    }
                } else if (scope.position || scope.quaternion || scope.scale) {
                    _directionTransform.set.apply(_directionTransform, noop);
                    if (scope.quaternion) {
                        _directionTransform.makeRotationFromQuaternion(typeof scope.quaternion === 'function' ? scope.quaternion(hand) : scope.quaternion);
                    }
                    if (scope.position) {
                        _directionTransform.setPosition(typeof scope.position === 'function' ? scope.position(hand) : scope.position);
                    }
                    return _directionTransform.elements;
                } else {
                    return noop;
                }
            };
            scope.getScale = function(hand) {
                if (!isNaN(scope.scale)) {
                    scope.scale = new THREE.Vector3(scope.scale, scope.scale, scope.scale);
                }
                if (typeof scope.scale === 'function') {
                    return scope.scale(hand);
                } else {
                    return scope.scale;
                }
            };
            transformPositions = function(matrix, vec3s) {
                var vec3, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = vec3s.length; _i < _len; _i++) {
                    vec3 = vec3s[_i];
                    if (vec3) {
                        _results.push(Leap.vec3.transformMat4(vec3, vec3, matrix));
                    } else {
                        _results.push(void 0);
                    }
                }
                return _results;
            };
            transformMat4Implicit0 = function(out, a, m) {
                var x, y, z;
                x = a[0];
                y = a[1];
                z = a[2];
                out[0] = m[0] * x + m[4] * y + m[8] * z;
                out[1] = m[1] * x + m[5] * y + m[9] * z;
                out[2] = m[2] * x + m[6] * y + m[10] * z;
                return out;
            };
            transformDirections = function(matrix, vec3s) {
                var vec3, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = vec3s.length; _i < _len; _i++) {
                    vec3 = vec3s[_i];
                    if (vec3) {
                        _results.push(transformMat4Implicit0(vec3, vec3, matrix));
                    } else {
                        _results.push(void 0);
                    }
                }
                return _results;
            };
            transformWithMatrices = function(hand, transform, scale) {
                var finger, scalarScale, _i, _j, _len, _len1, _ref, _ref1;
                transformDirections(transform, [hand.direction, hand.palmNormal, hand.palmVelocity, hand.arm.basis[0], hand.arm.basis[1], hand.arm.basis[2]]);
                _ref = hand.fingers;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    finger = _ref[_i];
                    transformDirections(transform, [finger.direction, finger.metacarpal.basis[0], finger.metacarpal.basis[1], finger.metacarpal.basis[2], finger.proximal.basis[0], finger.proximal.basis[1], finger.proximal.basis[2], finger.medial.basis[0], finger.medial.basis[1], finger.medial.basis[2], finger.distal.basis[0], finger.distal.basis[1], finger.distal.basis[2]]);
                }
                Leap.glMatrix.mat4.scale(transform, transform, scale);
                transformPositions(transform, [hand.palmPosition, hand.stabilizedPalmPosition, hand.sphereCenter, hand.arm.nextJoint, hand.arm.prevJoint]);
                _ref1 = hand.fingers;
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    finger = _ref1[_j];
                    transformPositions(transform, [finger.carpPosition, finger.mcpPosition, finger.pipPosition, finger.dipPosition, finger.distal.nextJoint, finger.tipPosition]);
                }
                scalarScale = (scale[0] + scale[1] + scale[2]) / 3;
                return hand.arm.width *= scalarScale;
            };
            return {
                frame: function(frame) {
                    var finger, hand, len, _i, _j, _len, _len1, _ref, _ref1, _results;
                    if (!frame.valid || frame.data.transformed) {
                        return;
                    }
                    frame.data.transformed = true;
                    _ref = frame.hands;
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        hand = _ref[_i];
                        transformWithMatrices(hand, scope.getTransform(hand), (scope.getScale(hand) || new THREE.Vector3(1, 1, 1)).toArray());
                        if (scope.effectiveParent) {
                            transformWithMatrices(hand, scope.effectiveParent.matrixWorld.elements, scope.effectiveParent.scale.toArray());
                        }
                        len = null;
                        _ref1 = hand.fingers;
                        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                            finger = _ref1[_j];
                            len = Leap.vec3.create();
                            Leap.vec3.sub(len, finger.mcpPosition, finger.carpPosition);
                            finger.metacarpal.length = Leap.vec3.length(len);
                            Leap.vec3.sub(len, finger.pipPosition, finger.mcpPosition);
                            finger.proximal.length = Leap.vec3.length(len);
                            Leap.vec3.sub(len, finger.dipPosition, finger.pipPosition);
                            finger.medial.length = Leap.vec3.length(len);
                            Leap.vec3.sub(len, finger.tipPosition, finger.dipPosition);
                            finger.distal.length = Leap.vec3.length(len);
                        }
                        Leap.vec3.sub(len, hand.arm.prevJoint, hand.arm.nextJoint);
                        _results.push(hand.arm.length = Leap.vec3.length(len));
                    }
                    return _results;
                }
            };
        };

    },{"leapjs":28}],9:[function(require,module,exports){
        /**
         * CANNON body controller for a single Leap Motion hand.
         */
        function HandBody (el, handComponent) {
            this.el = el;
            this.handComponent = handComponent;
            this.system = this.el.sceneEl.systems.leap;
            this.physics = this.el.sceneEl.systems.physics;
            this.physics.addBehavior(this, this.physics.Phase.SIMULATE);

            this.palmBody = /** @type {CANNON.Body} */ null;
            this.fingerBodies = /** @type {{string: CANNON.Body}} */ {};
        }

        HandBody.prototype.remove = function () {
            this.system.removeBehavior(this, this.physics.Phase.SIMULATE);
            for (var id in this.fingerBodies) {
                if (this.fingerBodies.hasOwnProperty(id)) {
                    this.physics.removeBody(this.fingerBodies[id]);
                }
            }
        };

        HandBody.prototype.step = function () {
            var finger, fingerBody,
                hand = this.handComponent.getHand();

            if (!hand || !hand.valid) return;

            this.syncPalmBody(hand, this.palmBody || this.createPalmBody());

            for (var i = 0; i < hand.fingers.length; i++) {
                finger = hand.fingers[i];
                if (finger.valid) {
                    fingerBody = this.fingerBodies[finger.type] || this.createFingerBody(finger);
                    this.syncFingerBody(finger, fingerBody);
                }
            }
        };

        HandBody.prototype.createFingerBody = function (finger) {
            var body = new CANNON.Body({
                shape: new CANNON.Sphere(finger.distal.length / 2),
                material: this.physics.material,
                mass: 0,
                fixedRotation: true
            });
            body.el = this.el;
            this.physics.addBody(body);
            this.fingerBodies[finger.type] = body;
            return body;
        };

        HandBody.prototype.syncFingerBody = (function () {
            var position = new THREE.Vector3();

            return function (finger, body) {
                this.el.object3D.localToWorld(position.fromArray(finger.distal.center()));
                body.position.copy(position);
                body.shapes[0].radius = finger.distal.length / 2;
            };
        }());

        HandBody.prototype.createPalmBody = function () {
            var body = new CANNON.Body({
                shape: new CANNON.Sphere(0.01),
                material: this.physics.material,
                mass: 0
            });
            body.el = this.el;
            this.physics.addBody(body);
            this.palmBody = body;
            return body;
        };

        /**
         * Repositions and rotates the Body instance to match the Leap hand.
         * TODO: There are some residual rotation issues here.
         * @param {LEAP.Hand} hand
         * @param {CANNON.Body} body
         */
        HandBody.prototype.syncPalmBody = (function () {
            var position = new THREE.Vector3(),
                rotation = new THREE.Quaternion(),
                hmdRotation = new THREE.Quaternion(),
                euler = new THREE.Euler(),
                _tmp1 = new THREE.Vector3(),
                _tmp2 = new THREE.Vector3();

            return function (hand, body) {
                rotation.setFromEuler(euler.set(hand.pitch(), hand.yaw(), hand.roll()));
                this.el.object3D.matrixWorld.decompose(_tmp1, hmdRotation, _tmp2);
                body.quaternion.copy(hmdRotation.multiply(rotation));

                this.el.object3D.localToWorld(position.fromArray(hand.palmPosition));
                body.position.copy(position);
            };
        }());

        module.exports = HandBody;

    },{}],10:[function(require,module,exports){
        /**
         * Helper for raycasting, which chooses a raycaster direction based on hand position. Also supports
         * a debugging mode, in which the ray is visible.
         */
        function Intersector () {
            this.arrowHelper = this.createArrowHelper();
            this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 0.2);
        }

        Intersector.prototype.update = function (options, object3D, hand, isHolding) {
            // Update options.
            this.holdDistance = options.holdDistance;
            this.debug = options.debug;

            // Update raycaster.
            this.raycaster.far = this.holdDistance;
            this.raycaster.ray.direction.fromArray(hand.palmNormal);
            this.raycaster.ray.direction.x += hand.direction[0] / 2;
            this.raycaster.ray.direction.y += hand.direction[1] / 2;
            this.raycaster.ray.direction.z += hand.direction[2] / 2;
            this.raycaster.ray.direction.normalize();
            this.raycaster.ray.origin.fromArray(hand.palmPosition);
            object3D.localToWorld(this.raycaster.ray.origin);

            // Update arrow helper.
            if (this.debug) {
                this.arrowHelper = this.arrowHelper || this.createArrowHelper();
                this.arrowHelper.position.copy(this.raycaster.ray.origin);
                object3D.worldToLocal(this.arrowHelper.position);
                this.arrowHelper.setDirection(this.raycaster.ray.direction);
                this.arrowHelper.setLength(this.holdDistance);
                this.arrowHelper.setColor(isHolding ? 0xFF0000 : 0x00FF00);
            } else {
                delete this.arrowHelper;
            }
        };

        Intersector.prototype.intersectObjects = function (objects, isRecursive) {
            return this.raycaster.intersectObjects(objects, isRecursive);
        };

        /** @return {THREE.ArrowHelper} */
        Intersector.prototype.createArrowHelper = function () {
            return new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(),
                this.holdDistance
            );
        };

        /** @return {THREE.Object3D} */
        Intersector.prototype.getMesh = function () {
            return this.arrowHelper;
        };

        /** @return {Intersector} */
        Intersector.prototype.show = function () {
            if (this.arrowHelper) this.arrowHelper.visible = true;
            return this;
        };

        /** @return {Intersector} */
        Intersector.prototype.hide = function () {
            if (this.arrowHelper) this.arrowHelper.visible = false;
            return this;
        };

        module.exports = Intersector;

    },{}],11:[function(require,module,exports){
        var HandMesh = require('../lib/leap.hand-mesh'),
            CircularArray = require('circular-array'),
            Intersector = require('./helpers/intersector'),
            HandBody = require('./helpers/hand-body');

        var nextID = 1;

        /**
         * A-Frame component for a single Leap Motion hand.
         */
        module.exports = {
            schema: {
                hand:               {default: '', oneOf: ['left', 'right'], required: true},
                enablePhysics:      {default: false},
                holdDistance:       {default: 0.2}, // m
                holdDebounce:       {default: 100}, // ms
                holdSelector:       {default: '[holdable]'},
                holdSensitivity:    {default: 0.95}, // [0,1]
                releaseSensitivity: {default: 0.75}, // [0,1]
                debug:              {default: false}
            },

            init: function () {
                this.system = this.el.sceneEl.systems.leap;

                this.handID = nextID++;
                this.hand = /** @type {Leap.Hand} */ null;
                this.handBody = /** @type {HandBody} */ null;
                this.handMesh = new HandMesh();

                this.isVisible = false;
                this.isHolding = false;

                var bufferLen = Math.floor(this.data.holdDebounce / (1000 / 120));
                this.grabStrength = 0;
                this.pinchStrength = 0;
                this.grabStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(bufferLen);
                this.pinchStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(bufferLen);

                this.intersector = new Intersector();
                this.holdTarget = /** @type {AFRAME.Element} */ null;

                this.el.setObject3D('mesh', this.handMesh.getMesh());
                this.handMesh.hide();

                if (this.data.debug) {
                    this.el.object3D.add(this.intersector.getMesh());
                }
            },

            update: function () {
                var data = this.data;
                if (data.enablePhysics && !this.handBody) {
                    this.handBody = new HandBody(this.el, this);
                } else if (!data.enablePhysics && this.handBody) {
                    this.handBody.remove();
                    this.handBody = null;
                }
            },

            remove: function () {
                if (this.handMesh) {
                    this.el.removeObject3D('mesh');
                    this.handMesh = null;
                }
                if (this.handBody) {
                    this.handBody.remove();
                    this.handBody = null;
                }
                if (this.intersector.getMesh()) {
                    this.el.object3D.remove(this.intersector.getMesh());
                    this.intersector = null;
                }
            },

            tick: function () {
                var hand = this.getHand();

                if (hand && hand.valid) {
                    this.handMesh.scaleTo(hand);
                    this.handMesh.formTo(hand);
                    this.grabStrengthBuffer.push(hand.grabStrength);
                    this.pinchStrengthBuffer.push(hand.pinchStrength);
                    this.grabStrength = circularArrayAvg(this.grabStrengthBuffer);
                    this.pinchStrength = circularArrayAvg(this.pinchStrengthBuffer);
                    var isHolding = Math.max(this.grabStrength, this.pinchStrength)
                        > (this.isHolding ? this.data.releaseSensitivity : this.data.holdSensitivity);
                    this.intersector.update(this.data, this.el.object3D, hand, isHolding);
                    if ( isHolding && !this.isHolding) this.hold(hand);
                    if (!isHolding &&  this.isHolding) this.release(hand);
                } else if (this.isHolding) {
                    this.release(null);
                }

                if (hand && !this.isVisible) {
                    this.handMesh.show();
                    this.intersector.show();
                }

                if (!hand && this.isVisible) {
                    this.handMesh.hide();
                    this.intersector.hide();
                }
                this.isVisible = !!hand;
            },

            getHand: function () {
                var data = this.data,
                    frame = this.system.getFrame();
                return frame.hands.length ? frame.hands[frame.hands[0].type === data.hand ? 0 : 1] : null;
            },

            hold: function (hand) {
                var objects, results,
                    eventDetail = this.getEventDetail(hand);

                this.el.emit('leap-holdstart', eventDetail);

                objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.holdSelector))
                    .map(function (el) { return el.object3D; });
                results = this.intersector.intersectObjects(objects, true);
                this.holdTarget = results[0] && results[0].object && results[0].object.el;
                if (this.holdTarget) {
                    this.holdTarget.emit('leap-holdstart', eventDetail);
                }
                this.isHolding = true;
            },

            release: function (hand) {
                var eventDetail = this.getEventDetail(hand);

                this.el.emit('leap-holdstop', eventDetail);

                if (this.holdTarget) {
                    this.holdTarget.emit('leap-holdstop', eventDetail);
                    this.holdTarget = null;
                }
                this.isHolding = false;
            },

            getEventDetail: function (hand) {
                return {
                    hand: hand,
                    handID: this.handID,
                    body: this.handBody ? this.handBody.palmBody : null
                };
            }
        };

        function circularArrayAvg (array) {
            var avg = 0;
            array = array.array();
            for (var i = 0; i < array.length; i++) {
                avg += array[i];
            }
            return avg / array.length;
        }

    },{"../lib/leap.hand-mesh":7,"./helpers/hand-body":9,"./helpers/intersector":10,"circular-array":15}],12:[function(require,module,exports){
        var Leap = require('leapjs'),
            transform = require('../lib/leap.transform.js');

// Defaults from leap.transform.js.
        var DEFAULT_SCALE = 0.001;
        var DEFAULT_POSITION = new THREE.Vector3();
        var DEFAULT_QUATERNION = new THREE.Quaternion();

        Leap.Controller.plugin('transform', transform);

        /**
         * Leap Motion system for A-Frame.
         */
        module.exports = {
            schema: {
                vr: {default: true},
                scale: {default: DEFAULT_SCALE},
                position: {
                    type: 'vec3',
                    default: {
                        x: DEFAULT_POSITION.x,
                        y: DEFAULT_POSITION.y,
                        z: DEFAULT_POSITION.z,
                    }
                },
                quaternion: {
                    type: 'vec4',
                    default: {
                        x: DEFAULT_QUATERNION.x,
                        y: DEFAULT_QUATERNION.y,
                        z: DEFAULT_QUATERNION.z,
                        w: DEFAULT_QUATERNION.w
                    }
                }
            },

            init: function () {
                this.controller = Leap.loop()
                    .use('transform', this.data);
            },

            getFrame: function () {
                return this.controller.frame();
            }
        };

    },{"../lib/leap.transform.js":8,"leapjs":28}],13:[function(require,module,exports){
        if (typeof AFRAME === 'undefined') {
            throw new Error('Component attempted to register before AFRAME was available.');
        }

        require('./lib/THREE.MeshLine');

        AFRAME.registerComponent('meshline', {
            schema: {
                color: { default: '#000' },
                lineWidth: { default: 10 },
                lineWidthStyler: { default: '1' },
                path: {
                    default: [
                        { x: -0.5, y: 0, z: 0 },
                        { x: 0.5, y: 0, z: 0 }
                    ],
                    // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
                    parse: function (value) {
                        return value.split(',').map(AFRAME.utils.coordinates.parse);
                    },
                    // Serialize array of vec3s in case someone does setAttribute('line', 'path', [...]).
                    stringify: function (data) {
                        return data.map(AFRAME.utils.coordinates.stringify).join(',');
                    }
                }
            },

            init: function () {
                this.resolution = new THREE.Vector2 ( window.innerWidth, window.innerHeight ) ;

                var sceneEl = this.el.sceneEl;
                sceneEl.addEventListener( 'render-target-loaded', this.do_update.bind(this) );
                sceneEl.addEventListener( 'render-target-loaded', this.addlisteners.bind(this) );


                /*
    if (sceneEl.hasLoaded) {

      console.log('has loaded');
      this.do_update(); //never happens ?

    } else {

      sceneEl.addEventListener('render-target-loaded', this.do_update.bind(this));

      }
  */
            },

            addlisteners: function () {

                //var canvas = this.el.sceneEl.canvas;

                // canvas does not fire resize events, need window
                window.addEventListener( 'resize', this.do_update.bind (this) );

                //console.log( canvas );
                //this.do_update() ;

            },

            do_update: function () {

                var canvas = this.el.sceneEl.canvas;
                this.resolution.set( canvas.width,  canvas.height );
                //console.log( this.resolution );
                this.update();

            },

            update: function () {
                //cannot use canvas here because it is not created yet at init time
                //console.log("canvas res:");
                //console.log(this.resolution);
                var material = new THREE.MeshLineMaterial({
                    color: new THREE.Color(this.data.color),
                    resolution: this.resolution,
                    sizeAttenuation: false,
                    lineWidth: this.data.lineWidth,
                    //near: 0.1,
                    //far: 1000
                });

                var geometry = new THREE.Geometry();

                this.data.path.forEach(function (vec3) {
                    geometry.vertices.push(
                        new THREE.Vector3(vec3.x, vec3.y, vec3.z)
                    );
                });

                var widthFn = new Function ('p', 'return ' + this.data.lineWidthStyler);
                //? try {var w = widthFn(0);} catch(e) {warn(e);}
                var line = new THREE.MeshLine();
                line.setGeometry( geometry, widthFn );
                this.el.setObject3D('mesh', new THREE.Mesh(line.geometry, material));
            },

            remove: function () {
                this.el.removeObject3D('mesh');
            }
        });

    },{"./lib/THREE.MeshLine":14}],14:[function(require,module,exports){
        THREE.MeshLine = function() {

            this.positions = [];

            this.previous = [];
            this.next = [];
            this.side = [];
            this.width = [];
            this.indices_array = [];
            this.uvs = [];

            this.geometry = new THREE.BufferGeometry();

            this.widthCallback = null;

        }

        THREE.MeshLine.prototype.setGeometry = function( g, c ) {

            this.widthCallback = c;

            this.positions = [];

            if( g instanceof THREE.Geometry ) {
                for( var j = 0; j < g.vertices.length; j++ ) {
                    var v = g.vertices[ j ];
                    this.positions.push( v.x, v.y, v.z );
                    this.positions.push( v.x, v.y, v.z );
                }
            }

            if( g instanceof THREE.BufferGeometry ) {
                // read attribute positions ?
            }

            if( g instanceof Float32Array || g instanceof Array ) {
                for( var j = 0; j < g.length; j += 3 ) {
                    this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
                    this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
                }
            }

            this.process();

        }

        THREE.MeshLine.prototype.compareV3 = function( a, b ) {

            var aa = a * 6;
            var ab = b * 6;
            return ( this.positions[ aa ] === this.positions[ ab ] ) && ( this.positions[ aa + 1 ] === this.positions[ ab + 1 ] ) && ( this.positions[ aa + 2 ] === this.positions[ ab + 2 ] );

        }

        THREE.MeshLine.prototype.copyV3 = function( a ) {

            var aa = a * 6;
            return [ this.positions[ aa ], this.positions[ aa + 1 ], this.positions[ aa + 2 ] ];

        }

        THREE.MeshLine.prototype.process = function() {

            var l = this.positions.length / 6;

            this.previous = [];
            this.next = [];
            this.side = [];
            this.width = [];
            this.indices_array = [];
            this.uvs = [];

            for( var j = 0; j < l; j++ ) {
                this.side.push( 1 );
                this.side.push( -1 );
            }

            var w;
            for( var j = 0; j < l; j++ ) {
                if( this.widthCallback ) w = this.widthCallback( j / ( l -1 ) );
                else w = 1;
                this.width.push( w );
                this.width.push( w );
            }

            for( var j = 0; j < l; j++ ) {
                this.uvs.push( j / ( l - 1 ), 0 );
                this.uvs.push( j / ( l - 1 ), 1 );
            }

            var v;

            if( this.compareV3( 0, l - 1 ) ){
                v = this.copyV3( l - 2 );
            } else {
                v = this.copyV3( 0 );
            }
            this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            for( var j = 0; j < l - 1; j++ ) {
                v = this.copyV3( j );
                this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
                this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            }

            for( var j = 1; j < l; j++ ) {
                v = this.copyV3( j );
                this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
                this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            }

            if( this.compareV3( l - 1, 0 ) ){
                v = this.copyV3( 1 );
            } else {
                v = this.copyV3( l - 1 );
            }
            this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );

            for( var j = 0; j < l - 1; j++ ) {
                var n = j * 2;
                this.indices_array.push( n, n + 1, n + 2 );
                this.indices_array.push( n + 2, n + 1, n + 3 );
            }

            if (!this.attributes) {
                this.attributes = {
                    position: new THREE.BufferAttribute( new Float32Array( this.positions ), 3 ),
                    previous: new THREE.BufferAttribute( new Float32Array( this.previous ), 3 ),
                    next: new THREE.BufferAttribute( new Float32Array( this.next ), 3 ),
                    side: new THREE.BufferAttribute( new Float32Array( this.side ), 1 ),
                    width: new THREE.BufferAttribute( new Float32Array( this.width ), 1 ),
                    uv: new THREE.BufferAttribute( new Float32Array( this.uvs ), 2 ),
                    index: new THREE.BufferAttribute( new Uint16Array( this.indices_array ), 1 )
                }
            } else {
                this.attributes.position.copyArray(new Float32Array(this.positions));
                this.attributes.position.needsUpdate = true;
                this.attributes.previous.copyArray(new Float32Array(this.previous));
                this.attributes.previous.needsUpdate = true;
                this.attributes.next.copyArray(new Float32Array(this.next));
                this.attributes.next.needsUpdate = true;
                this.attributes.side.copyArray(new Float32Array(this.side));
                this.attributes.side.needsUpdate = true;
                this.attributes.width.copyArray(new Float32Array(this.width));
                this.attributes.width.needsUpdate = true;
                this.attributes.uv.copyArray(new Float32Array(this.uvs));
                this.attributes.uv.needsUpdate = true;
                this.attributes.index.copyArray(new Uint16Array(this.index));
                this.attributes.index.needsUpdate = true;
            }

            this.geometry.addAttribute( 'position', this.attributes.position );
            this.geometry.addAttribute( 'previous', this.attributes.previous );
            this.geometry.addAttribute( 'next', this.attributes.next );
            this.geometry.addAttribute( 'side', this.attributes.side );
            this.geometry.addAttribute( 'width', this.attributes.width );
            this.geometry.addAttribute( 'uv', this.attributes.uv );

            this.geometry.setIndex( this.attributes.index );

        }

        THREE.MeshLineMaterial = function ( parameters ) {

            var vertexShaderSource = [
                'precision highp float;',
                '',
                'attribute vec3 position;',
                'attribute vec3 previous;',
                'attribute vec3 next;',
                'attribute float side;',
                'attribute float width;',
                'attribute vec2 uv;',
                '',
                'uniform mat4 projectionMatrix;',
                'uniform mat4 modelViewMatrix;',
                'uniform vec2 resolution;',
                'uniform float lineWidth;',
                'uniform vec3 color;',
                'uniform float opacity;',
                'uniform float near;',
                'uniform float far;',
                'uniform float sizeAttenuation;',
                '',
                'varying vec2 vUV;',
                'varying vec4 vColor;',
                'varying vec3 vPosition;',
                '',
                'vec2 fix( vec4 i, float aspect ) {',
                '',
                '    vec2 res = i.xy / i.w;',
                '    res.x *= aspect;',
                '    return res;',
                '',
                '}',
                '',
                'void main() {',
                '',
                '    float aspect = resolution.x / resolution.y;',
                '	 float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
                '',
                '    vColor = vec4( color, opacity );',
                '    vUV = uv;',
                '',
                '    mat4 m = projectionMatrix * modelViewMatrix;',
                '    vec4 finalPosition = m * vec4( position, 1.0 );',
                '    vec4 prevPos = m * vec4( previous, 1.0 );',
                '    vec4 nextPos = m * vec4( next, 1.0 );',
                '',
                '    vec2 currentP = fix( finalPosition, aspect );',
                '    vec2 prevP = fix( prevPos, aspect );',
                '    vec2 nextP = fix( nextPos, aspect );',
                '',
                '	 float pixelWidth = finalPosition.w * pixelWidthRatio;',
                '    float w = 1.8 * pixelWidth * lineWidth * width;',
                '',
                '    if( sizeAttenuation == 1. ) {',
                '        w = 1.8 * lineWidth * width;',
                '    }',
                '',
                '    vec2 dir;',
                '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
                '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
                '    else {',
                '        vec2 dir1 = normalize( currentP - prevP );',
                '        vec2 dir2 = normalize( nextP - currentP );',
                '        dir = normalize( dir1 + dir2 );',
                '',
                '        vec2 perp = vec2( -dir1.y, dir1.x );',
                '        vec2 miter = vec2( -dir.y, dir.x );',
                '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
                '',
                '    }',
                '',
                '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
                '    vec2 normal = vec2( -dir.y, dir.x );',
                '    normal.x /= aspect;',
                '    normal *= .5 * w;',
                '',
                '    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
                '    finalPosition.xy += offset.xy;',
                '',
                '	 vPosition = ( modelViewMatrix * vec4( position, 1. ) ).xyz;',
                '    gl_Position = finalPosition;',
                '',
                '}' ];

            var fragmentShaderSource = [
                '#extension GL_OES_standard_derivatives : enable',
                'precision mediump float;',
                '',
                'uniform sampler2D map;',
                'uniform float useMap;',
                'uniform float useDash;',
                'uniform vec2 dashArray;',
                '',
                'varying vec2 vUV;',
                'varying vec4 vColor;',
                'varying vec3 vPosition;',
                '',
                'void main() {',
                '',
                '    vec4 c = vColor;',
                '    if( useMap == 1. ) c *= texture2D( map, vUV );',
                '	 if( useDash == 1. ){',
                '	 	 ',
                '	 }',
                '    gl_FragColor = c;',
                '',
                '}' ];

            function check( v, d ) {
                if( v === undefined ) return d;
                return v;
            }

            THREE.Material.call( this );

            parameters = parameters || {};

            this.lineWidth = check( parameters.lineWidth, 1 );
            this.map = check( parameters.map, null );
            this.useMap = check( parameters.useMap, 0 );
            this.color = check( parameters.color, new THREE.Color( 0xffffff ) );
            this.opacity = check( parameters.opacity, 1 );
            this.resolution = check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
            this.sizeAttenuation = check( parameters.sizeAttenuation, 1 );
            this.near = check( parameters.near, 1 );
            this.far = check( parameters.far, 1 );
            this.dashArray = check( parameters.dashArray, [] );
            this.useDash = ( this.dashArray !== [] ) ? 1 : 0;

            var material = new THREE.RawShaderMaterial( {
                uniforms:{
                    lineWidth: { type: 'f', value: this.lineWidth },
                    map: { type: 't', value: this.map },
                    useMap: { type: 'f', value: this.useMap },
                    color: { type: 'c', value: this.color },
                    opacity: { type: 'f', value: this.opacity },
                    resolution: { type: 'v2', value: this.resolution },
                    sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
                    near: { type: 'f', value: this.near },
                    far: { type: 'f', value: this.far },
                    dashArray: { type: 'v2', value: new THREE.Vector2( this.dashArray[ 0 ], this.dashArray[ 1 ] ) },
                    useDash: { type: 'f', value: this.useDash }
                },
                vertexShader: vertexShaderSource.join( '\r\n' ),
                fragmentShader: fragmentShaderSource.join( '\r\n' )
            });

            delete parameters.lineWidth;
            delete parameters.map;
            delete parameters.useMap;
            delete parameters.color;
            delete parameters.opacity;
            delete parameters.resolution;
            delete parameters.sizeAttenuation;
            delete parameters.near;
            delete parameters.far;
            delete parameters.dashArray;

            material.type = 'MeshLineMaterial';

            material.setValues( parameters );

            return material;

        };

        THREE.MeshLineMaterial.prototype = Object.create( THREE.Material.prototype );
        THREE.MeshLineMaterial.prototype.constructor = THREE.MeshLineMaterial;

        THREE.MeshLineMaterial.prototype.copy = function ( source ) {

            THREE.Material.prototype.copy.call( this, source );

            this.lineWidth = source.lineWidth;
            this.map = source.map;
            this.useMap = source.useMap;
            this.color.copy( source.color );
            this.opacity = source.opacity;
            this.resolution.copy( source.resolution );
            this.sizeAttenuation = source.sizeAttenuation;
            this.near = source.near;
            this.far = source.far;

            return this;

        };

    },{}],15:[function(require,module,exports){
        /**
         * Simple circular array data structure, for storing a finitely-sized list of values and
         * automatically dropping values that no longer fit in the array. All operations are O(1).
         * @param {number} size Maximum number of value to retain.
         */
        function CircularArray (size) {
            this._index = 0;
            this._size = size;
            this._array = [];
        }

        CircularArray.prototype._incr = function () { this._index = ++this._index % this._size; };
        CircularArray.prototype.array = function () { return this._array; };
        CircularArray.prototype.push = function (value) {
            this._array[this._index] = value;
            this._incr();
        };

        module.exports = CircularArray;

    },{}],16:[function(require,module,exports){
        /**
         * @fileoverview gl-matrix - High performance matrix and vector operations
         * @author Brandon Jones
         * @author Colin MacKenzie IV
         * @version 2.2.1
         */

        /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


        (function(_global) {
            "use strict";

            var shim = {};
            if (typeof(exports) === 'undefined') {
                if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
                    shim.exports = {};
                    define(function() {
                        return shim.exports;
                    });
                } else {
                    // gl-matrix lives in a browser, define its namespaces in global
                    shim.exports = typeof(window) !== 'undefined' ? window : _global;
                }
            }
            else {
                // gl-matrix lives in commonjs, define its namespaces in exports
                shim.exports = exports;
            }

            (function(exports) {
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


                if(!GLMAT_EPSILON) {
                    var GLMAT_EPSILON = 0.000001;
                }

                if(!GLMAT_ARRAY_TYPE) {
                    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
                }

                if(!GLMAT_RANDOM) {
                    var GLMAT_RANDOM = Math.random;
                }

                /**
                 * @class Common utilities
                 * @name glMatrix
                 */
                var glMatrix = {};

                /**
                 * Sets the type of array used when creating new vectors and matricies
                 *
                 * @param {Type} type Array type, such as Float32Array or Array
                 */
                glMatrix.setMatrixArrayType = function(type) {
                    GLMAT_ARRAY_TYPE = type;
                }

                if(typeof(exports) !== 'undefined') {
                    exports.glMatrix = glMatrix;
                }

                var degree = Math.PI / 180;

                /**
                 * Convert Degree To Radian
                 *
                 * @param {Number} Angle in Degrees
                 */
                glMatrix.toRadian = function(a){
                    return a * degree;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 2 Dimensional Vector
                 * @name vec2
                 */

                var vec2 = {};

                /**
                 * Creates a new, empty vec2
                 *
                 * @returns {vec2} a new 2D vector
                 */
                vec2.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(2);
                    out[0] = 0;
                    out[1] = 0;
                    return out;
                };

                /**
                 * Creates a new vec2 initialized with values from an existing vector
                 *
                 * @param {vec2} a vector to clone
                 * @returns {vec2} a new 2D vector
                 */
                vec2.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(2);
                    out[0] = a[0];
                    out[1] = a[1];
                    return out;
                };

                /**
                 * Creates a new vec2 initialized with the given values
                 *
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @returns {vec2} a new 2D vector
                 */
                vec2.fromValues = function(x, y) {
                    var out = new GLMAT_ARRAY_TYPE(2);
                    out[0] = x;
                    out[1] = y;
                    return out;
                };

                /**
                 * Copy the values from one vec2 to another
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the source vector
                 * @returns {vec2} out
                 */
                vec2.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    return out;
                };

                /**
                 * Set the components of a vec2 to the given values
                 *
                 * @param {vec2} out the receiving vector
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @returns {vec2} out
                 */
                vec2.set = function(out, x, y) {
                    out[0] = x;
                    out[1] = y;
                    return out;
                };

                /**
                 * Adds two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.add = function(out, a, b) {
                    out[0] = a[0] + b[0];
                    out[1] = a[1] + b[1];
                    return out;
                };

                /**
                 * Subtracts vector b from vector a
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.subtract = function(out, a, b) {
                    out[0] = a[0] - b[0];
                    out[1] = a[1] - b[1];
                    return out;
                };

                /**
                 * Alias for {@link vec2.subtract}
                 * @function
                 */
                vec2.sub = vec2.subtract;

                /**
                 * Multiplies two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.multiply = function(out, a, b) {
                    out[0] = a[0] * b[0];
                    out[1] = a[1] * b[1];
                    return out;
                };

                /**
                 * Alias for {@link vec2.multiply}
                 * @function
                 */
                vec2.mul = vec2.multiply;

                /**
                 * Divides two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.divide = function(out, a, b) {
                    out[0] = a[0] / b[0];
                    out[1] = a[1] / b[1];
                    return out;
                };

                /**
                 * Alias for {@link vec2.divide}
                 * @function
                 */
                vec2.div = vec2.divide;

                /**
                 * Returns the minimum of two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.min = function(out, a, b) {
                    out[0] = Math.min(a[0], b[0]);
                    out[1] = Math.min(a[1], b[1]);
                    return out;
                };

                /**
                 * Returns the maximum of two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec2} out
                 */
                vec2.max = function(out, a, b) {
                    out[0] = Math.max(a[0], b[0]);
                    out[1] = Math.max(a[1], b[1]);
                    return out;
                };

                /**
                 * Scales a vec2 by a scalar number
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the vector to scale
                 * @param {Number} b amount to scale the vector by
                 * @returns {vec2} out
                 */
                vec2.scale = function(out, a, b) {
                    out[0] = a[0] * b;
                    out[1] = a[1] * b;
                    return out;
                };

                /**
                 * Adds two vec2's after scaling the second operand by a scalar value
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @param {Number} scale the amount to scale b by before adding
                 * @returns {vec2} out
                 */
                vec2.scaleAndAdd = function(out, a, b, scale) {
                    out[0] = a[0] + (b[0] * scale);
                    out[1] = a[1] + (b[1] * scale);
                    return out;
                };

                /**
                 * Calculates the euclidian distance between two vec2's
                 *
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {Number} distance between a and b
                 */
                vec2.distance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1];
                    return Math.sqrt(x*x + y*y);
                };

                /**
                 * Alias for {@link vec2.distance}
                 * @function
                 */
                vec2.dist = vec2.distance;

                /**
                 * Calculates the squared euclidian distance between two vec2's
                 *
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {Number} squared distance between a and b
                 */
                vec2.squaredDistance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1];
                    return x*x + y*y;
                };

                /**
                 * Alias for {@link vec2.squaredDistance}
                 * @function
                 */
                vec2.sqrDist = vec2.squaredDistance;

                /**
                 * Calculates the length of a vec2
                 *
                 * @param {vec2} a vector to calculate length of
                 * @returns {Number} length of a
                 */
                vec2.length = function (a) {
                    var x = a[0],
                        y = a[1];
                    return Math.sqrt(x*x + y*y);
                };

                /**
                 * Alias for {@link vec2.length}
                 * @function
                 */
                vec2.len = vec2.length;

                /**
                 * Calculates the squared length of a vec2
                 *
                 * @param {vec2} a vector to calculate squared length of
                 * @returns {Number} squared length of a
                 */
                vec2.squaredLength = function (a) {
                    var x = a[0],
                        y = a[1];
                    return x*x + y*y;
                };

                /**
                 * Alias for {@link vec2.squaredLength}
                 * @function
                 */
                vec2.sqrLen = vec2.squaredLength;

                /**
                 * Negates the components of a vec2
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a vector to negate
                 * @returns {vec2} out
                 */
                vec2.negate = function(out, a) {
                    out[0] = -a[0];
                    out[1] = -a[1];
                    return out;
                };

                /**
                 * Normalize a vec2
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a vector to normalize
                 * @returns {vec2} out
                 */
                vec2.normalize = function(out, a) {
                    var x = a[0],
                        y = a[1];
                    var len = x*x + y*y;
                    if (len > 0) {
                        //TODO: evaluate use of glm_invsqrt here?
                        len = 1 / Math.sqrt(len);
                        out[0] = a[0] * len;
                        out[1] = a[1] * len;
                    }
                    return out;
                };

                /**
                 * Calculates the dot product of two vec2's
                 *
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {Number} dot product of a and b
                 */
                vec2.dot = function (a, b) {
                    return a[0] * b[0] + a[1] * b[1];
                };

                /**
                 * Computes the cross product of two vec2's
                 * Note that the cross product must by definition produce a 3D vector
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @returns {vec3} out
                 */
                vec2.cross = function(out, a, b) {
                    var z = a[0] * b[1] - a[1] * b[0];
                    out[0] = out[1] = 0;
                    out[2] = z;
                    return out;
                };

                /**
                 * Performs a linear interpolation between two vec2's
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the first operand
                 * @param {vec2} b the second operand
                 * @param {Number} t interpolation amount between the two inputs
                 * @returns {vec2} out
                 */
                vec2.lerp = function (out, a, b, t) {
                    var ax = a[0],
                        ay = a[1];
                    out[0] = ax + t * (b[0] - ax);
                    out[1] = ay + t * (b[1] - ay);
                    return out;
                };

                /**
                 * Generates a random vector with the given scale
                 *
                 * @param {vec2} out the receiving vector
                 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
                 * @returns {vec2} out
                 */
                vec2.random = function (out, scale) {
                    scale = scale || 1.0;
                    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
                    out[0] = Math.cos(r) * scale;
                    out[1] = Math.sin(r) * scale;
                    return out;
                };

                /**
                 * Transforms the vec2 with a mat2
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the vector to transform
                 * @param {mat2} m matrix to transform with
                 * @returns {vec2} out
                 */
                vec2.transformMat2 = function(out, a, m) {
                    var x = a[0],
                        y = a[1];
                    out[0] = m[0] * x + m[2] * y;
                    out[1] = m[1] * x + m[3] * y;
                    return out;
                };

                /**
                 * Transforms the vec2 with a mat2d
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the vector to transform
                 * @param {mat2d} m matrix to transform with
                 * @returns {vec2} out
                 */
                vec2.transformMat2d = function(out, a, m) {
                    var x = a[0],
                        y = a[1];
                    out[0] = m[0] * x + m[2] * y + m[4];
                    out[1] = m[1] * x + m[3] * y + m[5];
                    return out;
                };

                /**
                 * Transforms the vec2 with a mat3
                 * 3rd vector component is implicitly '1'
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the vector to transform
                 * @param {mat3} m matrix to transform with
                 * @returns {vec2} out
                 */
                vec2.transformMat3 = function(out, a, m) {
                    var x = a[0],
                        y = a[1];
                    out[0] = m[0] * x + m[3] * y + m[6];
                    out[1] = m[1] * x + m[4] * y + m[7];
                    return out;
                };

                /**
                 * Transforms the vec2 with a mat4
                 * 3rd vector component is implicitly '0'
                 * 4th vector component is implicitly '1'
                 *
                 * @param {vec2} out the receiving vector
                 * @param {vec2} a the vector to transform
                 * @param {mat4} m matrix to transform with
                 * @returns {vec2} out
                 */
                vec2.transformMat4 = function(out, a, m) {
                    var x = a[0],
                        y = a[1];
                    out[0] = m[0] * x + m[4] * y + m[12];
                    out[1] = m[1] * x + m[5] * y + m[13];
                    return out;
                };

                /**
                 * Perform some operation over an array of vec2s.
                 *
                 * @param {Array} a the array of vectors to iterate over
                 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
                 * @param {Number} offset Number of elements to skip at the beginning of the array
                 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
                 * @param {Function} fn Function to call for each vector in the array
                 * @param {Object} [arg] additional argument to pass to fn
                 * @returns {Array} a
                 * @function
                 */
                vec2.forEach = (function() {
                    var vec = vec2.create();

                    return function(a, stride, offset, count, fn, arg) {
                        var i, l;
                        if(!stride) {
                            stride = 2;
                        }

                        if(!offset) {
                            offset = 0;
                        }

                        if(count) {
                            l = Math.min((count * stride) + offset, a.length);
                        } else {
                            l = a.length;
                        }

                        for(i = offset; i < l; i += stride) {
                            vec[0] = a[i]; vec[1] = a[i+1];
                            fn(vec, vec, arg);
                            a[i] = vec[0]; a[i+1] = vec[1];
                        }

                        return a;
                    };
                })();

                /**
                 * Returns a string representation of a vector
                 *
                 * @param {vec2} vec vector to represent as a string
                 * @returns {String} string representation of the vector
                 */
                vec2.str = function (a) {
                    return 'vec2(' + a[0] + ', ' + a[1] + ')';
                };

                if(typeof(exports) !== 'undefined') {
                    exports.vec2 = vec2;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 3 Dimensional Vector
                 * @name vec3
                 */

                var vec3 = {};

                /**
                 * Creates a new, empty vec3
                 *
                 * @returns {vec3} a new 3D vector
                 */
                vec3.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(3);
                    out[0] = 0;
                    out[1] = 0;
                    out[2] = 0;
                    return out;
                };

                /**
                 * Creates a new vec3 initialized with values from an existing vector
                 *
                 * @param {vec3} a vector to clone
                 * @returns {vec3} a new 3D vector
                 */
                vec3.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(3);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    return out;
                };

                /**
                 * Creates a new vec3 initialized with the given values
                 *
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @returns {vec3} a new 3D vector
                 */
                vec3.fromValues = function(x, y, z) {
                    var out = new GLMAT_ARRAY_TYPE(3);
                    out[0] = x;
                    out[1] = y;
                    out[2] = z;
                    return out;
                };

                /**
                 * Copy the values from one vec3 to another
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the source vector
                 * @returns {vec3} out
                 */
                vec3.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    return out;
                };

                /**
                 * Set the components of a vec3 to the given values
                 *
                 * @param {vec3} out the receiving vector
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @returns {vec3} out
                 */
                vec3.set = function(out, x, y, z) {
                    out[0] = x;
                    out[1] = y;
                    out[2] = z;
                    return out;
                };

                /**
                 * Adds two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.add = function(out, a, b) {
                    out[0] = a[0] + b[0];
                    out[1] = a[1] + b[1];
                    out[2] = a[2] + b[2];
                    return out;
                };

                /**
                 * Subtracts vector b from vector a
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.subtract = function(out, a, b) {
                    out[0] = a[0] - b[0];
                    out[1] = a[1] - b[1];
                    out[2] = a[2] - b[2];
                    return out;
                };

                /**
                 * Alias for {@link vec3.subtract}
                 * @function
                 */
                vec3.sub = vec3.subtract;

                /**
                 * Multiplies two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.multiply = function(out, a, b) {
                    out[0] = a[0] * b[0];
                    out[1] = a[1] * b[1];
                    out[2] = a[2] * b[2];
                    return out;
                };

                /**
                 * Alias for {@link vec3.multiply}
                 * @function
                 */
                vec3.mul = vec3.multiply;

                /**
                 * Divides two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.divide = function(out, a, b) {
                    out[0] = a[0] / b[0];
                    out[1] = a[1] / b[1];
                    out[2] = a[2] / b[2];
                    return out;
                };

                /**
                 * Alias for {@link vec3.divide}
                 * @function
                 */
                vec3.div = vec3.divide;

                /**
                 * Returns the minimum of two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.min = function(out, a, b) {
                    out[0] = Math.min(a[0], b[0]);
                    out[1] = Math.min(a[1], b[1]);
                    out[2] = Math.min(a[2], b[2]);
                    return out;
                };

                /**
                 * Returns the maximum of two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.max = function(out, a, b) {
                    out[0] = Math.max(a[0], b[0]);
                    out[1] = Math.max(a[1], b[1]);
                    out[2] = Math.max(a[2], b[2]);
                    return out;
                };

                /**
                 * Scales a vec3 by a scalar number
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the vector to scale
                 * @param {Number} b amount to scale the vector by
                 * @returns {vec3} out
                 */
                vec3.scale = function(out, a, b) {
                    out[0] = a[0] * b;
                    out[1] = a[1] * b;
                    out[2] = a[2] * b;
                    return out;
                };

                /**
                 * Adds two vec3's after scaling the second operand by a scalar value
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @param {Number} scale the amount to scale b by before adding
                 * @returns {vec3} out
                 */
                vec3.scaleAndAdd = function(out, a, b, scale) {
                    out[0] = a[0] + (b[0] * scale);
                    out[1] = a[1] + (b[1] * scale);
                    out[2] = a[2] + (b[2] * scale);
                    return out;
                };

                /**
                 * Calculates the euclidian distance between two vec3's
                 *
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {Number} distance between a and b
                 */
                vec3.distance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1],
                        z = b[2] - a[2];
                    return Math.sqrt(x*x + y*y + z*z);
                };

                /**
                 * Alias for {@link vec3.distance}
                 * @function
                 */
                vec3.dist = vec3.distance;

                /**
                 * Calculates the squared euclidian distance between two vec3's
                 *
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {Number} squared distance between a and b
                 */
                vec3.squaredDistance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1],
                        z = b[2] - a[2];
                    return x*x + y*y + z*z;
                };

                /**
                 * Alias for {@link vec3.squaredDistance}
                 * @function
                 */
                vec3.sqrDist = vec3.squaredDistance;

                /**
                 * Calculates the length of a vec3
                 *
                 * @param {vec3} a vector to calculate length of
                 * @returns {Number} length of a
                 */
                vec3.length = function (a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2];
                    return Math.sqrt(x*x + y*y + z*z);
                };

                /**
                 * Alias for {@link vec3.length}
                 * @function
                 */
                vec3.len = vec3.length;

                /**
                 * Calculates the squared length of a vec3
                 *
                 * @param {vec3} a vector to calculate squared length of
                 * @returns {Number} squared length of a
                 */
                vec3.squaredLength = function (a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2];
                    return x*x + y*y + z*z;
                };

                /**
                 * Alias for {@link vec3.squaredLength}
                 * @function
                 */
                vec3.sqrLen = vec3.squaredLength;

                /**
                 * Negates the components of a vec3
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a vector to negate
                 * @returns {vec3} out
                 */
                vec3.negate = function(out, a) {
                    out[0] = -a[0];
                    out[1] = -a[1];
                    out[2] = -a[2];
                    return out;
                };

                /**
                 * Normalize a vec3
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a vector to normalize
                 * @returns {vec3} out
                 */
                vec3.normalize = function(out, a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2];
                    var len = x*x + y*y + z*z;
                    if (len > 0) {
                        //TODO: evaluate use of glm_invsqrt here?
                        len = 1 / Math.sqrt(len);
                        out[0] = a[0] * len;
                        out[1] = a[1] * len;
                        out[2] = a[2] * len;
                    }
                    return out;
                };

                /**
                 * Calculates the dot product of two vec3's
                 *
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {Number} dot product of a and b
                 */
                vec3.dot = function (a, b) {
                    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
                };

                /**
                 * Computes the cross product of two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @returns {vec3} out
                 */
                vec3.cross = function(out, a, b) {
                    var ax = a[0], ay = a[1], az = a[2],
                        bx = b[0], by = b[1], bz = b[2];

                    out[0] = ay * bz - az * by;
                    out[1] = az * bx - ax * bz;
                    out[2] = ax * by - ay * bx;
                    return out;
                };

                /**
                 * Performs a linear interpolation between two vec3's
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the first operand
                 * @param {vec3} b the second operand
                 * @param {Number} t interpolation amount between the two inputs
                 * @returns {vec3} out
                 */
                vec3.lerp = function (out, a, b, t) {
                    var ax = a[0],
                        ay = a[1],
                        az = a[2];
                    out[0] = ax + t * (b[0] - ax);
                    out[1] = ay + t * (b[1] - ay);
                    out[2] = az + t * (b[2] - az);
                    return out;
                };

                /**
                 * Generates a random vector with the given scale
                 *
                 * @param {vec3} out the receiving vector
                 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
                 * @returns {vec3} out
                 */
                vec3.random = function (out, scale) {
                    scale = scale || 1.0;

                    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
                    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
                    var zScale = Math.sqrt(1.0-z*z) * scale;

                    out[0] = Math.cos(r) * zScale;
                    out[1] = Math.sin(r) * zScale;
                    out[2] = z * scale;
                    return out;
                };

                /**
                 * Transforms the vec3 with a mat4.
                 * 4th vector component is implicitly '1'
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the vector to transform
                 * @param {mat4} m matrix to transform with
                 * @returns {vec3} out
                 */
                vec3.transformMat4 = function(out, a, m) {
                    var x = a[0], y = a[1], z = a[2];
                    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
                    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
                    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
                    return out;
                };

                /**
                 * Transforms the vec3 with a mat3.
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the vector to transform
                 * @param {mat4} m the 3x3 matrix to transform with
                 * @returns {vec3} out
                 */
                vec3.transformMat3 = function(out, a, m) {
                    var x = a[0], y = a[1], z = a[2];
                    out[0] = x * m[0] + y * m[3] + z * m[6];
                    out[1] = x * m[1] + y * m[4] + z * m[7];
                    out[2] = x * m[2] + y * m[5] + z * m[8];
                    return out;
                };

                /**
                 * Transforms the vec3 with a quat
                 *
                 * @param {vec3} out the receiving vector
                 * @param {vec3} a the vector to transform
                 * @param {quat} q quaternion to transform with
                 * @returns {vec3} out
                 */
                vec3.transformQuat = function(out, a, q) {
                    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

                    var x = a[0], y = a[1], z = a[2],
                        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

                        // calculate quat * vec
                        ix = qw * x + qy * z - qz * y,
                        iy = qw * y + qz * x - qx * z,
                        iz = qw * z + qx * y - qy * x,
                        iw = -qx * x - qy * y - qz * z;

                    // calculate result * inverse quat
                    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
                    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
                    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
                    return out;
                };

                /*
* Rotate a 3D vector around the x-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
                vec3.rotateX = function(out, a, b, c){
                    var p = [], r=[];
                    //Translate point to the origin
                    p[0] = a[0] - b[0];
                    p[1] = a[1] - b[1];
                    p[2] = a[2] - b[2];

                    //perform rotation
                    r[0] = p[0];
                    r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
                    r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

                    //translate to correct position
                    out[0] = r[0] + b[0];
                    out[1] = r[1] + b[1];
                    out[2] = r[2] + b[2];

                    return out;
                };

                /*
* Rotate a 3D vector around the y-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
                vec3.rotateY = function(out, a, b, c){
                    var p = [], r=[];
                    //Translate point to the origin
                    p[0] = a[0] - b[0];
                    p[1] = a[1] - b[1];
                    p[2] = a[2] - b[2];

                    //perform rotation
                    r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
                    r[1] = p[1];
                    r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);

                    //translate to correct position
                    out[0] = r[0] + b[0];
                    out[1] = r[1] + b[1];
                    out[2] = r[2] + b[2];

                    return out;
                };

                /*
* Rotate a 3D vector around the z-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
                vec3.rotateZ = function(out, a, b, c){
                    var p = [], r=[];
                    //Translate point to the origin
                    p[0] = a[0] - b[0];
                    p[1] = a[1] - b[1];
                    p[2] = a[2] - b[2];

                    //perform rotation
                    r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
                    r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
                    r[2] = p[2];

                    //translate to correct position
                    out[0] = r[0] + b[0];
                    out[1] = r[1] + b[1];
                    out[2] = r[2] + b[2];

                    return out;
                };

                /**
                 * Perform some operation over an array of vec3s.
                 *
                 * @param {Array} a the array of vectors to iterate over
                 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
                 * @param {Number} offset Number of elements to skip at the beginning of the array
                 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
                 * @param {Function} fn Function to call for each vector in the array
                 * @param {Object} [arg] additional argument to pass to fn
                 * @returns {Array} a
                 * @function
                 */
                vec3.forEach = (function() {
                    var vec = vec3.create();

                    return function(a, stride, offset, count, fn, arg) {
                        var i, l;
                        if(!stride) {
                            stride = 3;
                        }

                        if(!offset) {
                            offset = 0;
                        }

                        if(count) {
                            l = Math.min((count * stride) + offset, a.length);
                        } else {
                            l = a.length;
                        }

                        for(i = offset; i < l; i += stride) {
                            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
                            fn(vec, vec, arg);
                            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
                        }

                        return a;
                    };
                })();

                /**
                 * Returns a string representation of a vector
                 *
                 * @param {vec3} vec vector to represent as a string
                 * @returns {String} string representation of the vector
                 */
                vec3.str = function (a) {
                    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
                };

                if(typeof(exports) !== 'undefined') {
                    exports.vec3 = vec3;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 4 Dimensional Vector
                 * @name vec4
                 */

                var vec4 = {};

                /**
                 * Creates a new, empty vec4
                 *
                 * @returns {vec4} a new 4D vector
                 */
                vec4.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = 0;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    return out;
                };

                /**
                 * Creates a new vec4 initialized with values from an existing vector
                 *
                 * @param {vec4} a vector to clone
                 * @returns {vec4} a new 4D vector
                 */
                vec4.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    return out;
                };

                /**
                 * Creates a new vec4 initialized with the given values
                 *
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @param {Number} w W component
                 * @returns {vec4} a new 4D vector
                 */
                vec4.fromValues = function(x, y, z, w) {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = x;
                    out[1] = y;
                    out[2] = z;
                    out[3] = w;
                    return out;
                };

                /**
                 * Copy the values from one vec4 to another
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the source vector
                 * @returns {vec4} out
                 */
                vec4.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    return out;
                };

                /**
                 * Set the components of a vec4 to the given values
                 *
                 * @param {vec4} out the receiving vector
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @param {Number} w W component
                 * @returns {vec4} out
                 */
                vec4.set = function(out, x, y, z, w) {
                    out[0] = x;
                    out[1] = y;
                    out[2] = z;
                    out[3] = w;
                    return out;
                };

                /**
                 * Adds two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.add = function(out, a, b) {
                    out[0] = a[0] + b[0];
                    out[1] = a[1] + b[1];
                    out[2] = a[2] + b[2];
                    out[3] = a[3] + b[3];
                    return out;
                };

                /**
                 * Subtracts vector b from vector a
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.subtract = function(out, a, b) {
                    out[0] = a[0] - b[0];
                    out[1] = a[1] - b[1];
                    out[2] = a[2] - b[2];
                    out[3] = a[3] - b[3];
                    return out;
                };

                /**
                 * Alias for {@link vec4.subtract}
                 * @function
                 */
                vec4.sub = vec4.subtract;

                /**
                 * Multiplies two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.multiply = function(out, a, b) {
                    out[0] = a[0] * b[0];
                    out[1] = a[1] * b[1];
                    out[2] = a[2] * b[2];
                    out[3] = a[3] * b[3];
                    return out;
                };

                /**
                 * Alias for {@link vec4.multiply}
                 * @function
                 */
                vec4.mul = vec4.multiply;

                /**
                 * Divides two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.divide = function(out, a, b) {
                    out[0] = a[0] / b[0];
                    out[1] = a[1] / b[1];
                    out[2] = a[2] / b[2];
                    out[3] = a[3] / b[3];
                    return out;
                };

                /**
                 * Alias for {@link vec4.divide}
                 * @function
                 */
                vec4.div = vec4.divide;

                /**
                 * Returns the minimum of two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.min = function(out, a, b) {
                    out[0] = Math.min(a[0], b[0]);
                    out[1] = Math.min(a[1], b[1]);
                    out[2] = Math.min(a[2], b[2]);
                    out[3] = Math.min(a[3], b[3]);
                    return out;
                };

                /**
                 * Returns the maximum of two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {vec4} out
                 */
                vec4.max = function(out, a, b) {
                    out[0] = Math.max(a[0], b[0]);
                    out[1] = Math.max(a[1], b[1]);
                    out[2] = Math.max(a[2], b[2]);
                    out[3] = Math.max(a[3], b[3]);
                    return out;
                };

                /**
                 * Scales a vec4 by a scalar number
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the vector to scale
                 * @param {Number} b amount to scale the vector by
                 * @returns {vec4} out
                 */
                vec4.scale = function(out, a, b) {
                    out[0] = a[0] * b;
                    out[1] = a[1] * b;
                    out[2] = a[2] * b;
                    out[3] = a[3] * b;
                    return out;
                };

                /**
                 * Adds two vec4's after scaling the second operand by a scalar value
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @param {Number} scale the amount to scale b by before adding
                 * @returns {vec4} out
                 */
                vec4.scaleAndAdd = function(out, a, b, scale) {
                    out[0] = a[0] + (b[0] * scale);
                    out[1] = a[1] + (b[1] * scale);
                    out[2] = a[2] + (b[2] * scale);
                    out[3] = a[3] + (b[3] * scale);
                    return out;
                };

                /**
                 * Calculates the euclidian distance between two vec4's
                 *
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {Number} distance between a and b
                 */
                vec4.distance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1],
                        z = b[2] - a[2],
                        w = b[3] - a[3];
                    return Math.sqrt(x*x + y*y + z*z + w*w);
                };

                /**
                 * Alias for {@link vec4.distance}
                 * @function
                 */
                vec4.dist = vec4.distance;

                /**
                 * Calculates the squared euclidian distance between two vec4's
                 *
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {Number} squared distance between a and b
                 */
                vec4.squaredDistance = function(a, b) {
                    var x = b[0] - a[0],
                        y = b[1] - a[1],
                        z = b[2] - a[2],
                        w = b[3] - a[3];
                    return x*x + y*y + z*z + w*w;
                };

                /**
                 * Alias for {@link vec4.squaredDistance}
                 * @function
                 */
                vec4.sqrDist = vec4.squaredDistance;

                /**
                 * Calculates the length of a vec4
                 *
                 * @param {vec4} a vector to calculate length of
                 * @returns {Number} length of a
                 */
                vec4.length = function (a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2],
                        w = a[3];
                    return Math.sqrt(x*x + y*y + z*z + w*w);
                };

                /**
                 * Alias for {@link vec4.length}
                 * @function
                 */
                vec4.len = vec4.length;

                /**
                 * Calculates the squared length of a vec4
                 *
                 * @param {vec4} a vector to calculate squared length of
                 * @returns {Number} squared length of a
                 */
                vec4.squaredLength = function (a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2],
                        w = a[3];
                    return x*x + y*y + z*z + w*w;
                };

                /**
                 * Alias for {@link vec4.squaredLength}
                 * @function
                 */
                vec4.sqrLen = vec4.squaredLength;

                /**
                 * Negates the components of a vec4
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a vector to negate
                 * @returns {vec4} out
                 */
                vec4.negate = function(out, a) {
                    out[0] = -a[0];
                    out[1] = -a[1];
                    out[2] = -a[2];
                    out[3] = -a[3];
                    return out;
                };

                /**
                 * Normalize a vec4
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a vector to normalize
                 * @returns {vec4} out
                 */
                vec4.normalize = function(out, a) {
                    var x = a[0],
                        y = a[1],
                        z = a[2],
                        w = a[3];
                    var len = x*x + y*y + z*z + w*w;
                    if (len > 0) {
                        len = 1 / Math.sqrt(len);
                        out[0] = a[0] * len;
                        out[1] = a[1] * len;
                        out[2] = a[2] * len;
                        out[3] = a[3] * len;
                    }
                    return out;
                };

                /**
                 * Calculates the dot product of two vec4's
                 *
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @returns {Number} dot product of a and b
                 */
                vec4.dot = function (a, b) {
                    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
                };

                /**
                 * Performs a linear interpolation between two vec4's
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the first operand
                 * @param {vec4} b the second operand
                 * @param {Number} t interpolation amount between the two inputs
                 * @returns {vec4} out
                 */
                vec4.lerp = function (out, a, b, t) {
                    var ax = a[0],
                        ay = a[1],
                        az = a[2],
                        aw = a[3];
                    out[0] = ax + t * (b[0] - ax);
                    out[1] = ay + t * (b[1] - ay);
                    out[2] = az + t * (b[2] - az);
                    out[3] = aw + t * (b[3] - aw);
                    return out;
                };

                /**
                 * Generates a random vector with the given scale
                 *
                 * @param {vec4} out the receiving vector
                 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
                 * @returns {vec4} out
                 */
                vec4.random = function (out, scale) {
                    scale = scale || 1.0;

                    //TODO: This is a pretty awful way of doing this. Find something better.
                    out[0] = GLMAT_RANDOM();
                    out[1] = GLMAT_RANDOM();
                    out[2] = GLMAT_RANDOM();
                    out[3] = GLMAT_RANDOM();
                    vec4.normalize(out, out);
                    vec4.scale(out, out, scale);
                    return out;
                };

                /**
                 * Transforms the vec4 with a mat4.
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the vector to transform
                 * @param {mat4} m matrix to transform with
                 * @returns {vec4} out
                 */
                vec4.transformMat4 = function(out, a, m) {
                    var x = a[0], y = a[1], z = a[2], w = a[3];
                    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
                    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
                    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
                    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
                    return out;
                };

                /**
                 * Transforms the vec4 with a quat
                 *
                 * @param {vec4} out the receiving vector
                 * @param {vec4} a the vector to transform
                 * @param {quat} q quaternion to transform with
                 * @returns {vec4} out
                 */
                vec4.transformQuat = function(out, a, q) {
                    var x = a[0], y = a[1], z = a[2],
                        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

                        // calculate quat * vec
                        ix = qw * x + qy * z - qz * y,
                        iy = qw * y + qz * x - qx * z,
                        iz = qw * z + qx * y - qy * x,
                        iw = -qx * x - qy * y - qz * z;

                    // calculate result * inverse quat
                    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
                    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
                    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
                    return out;
                };

                /**
                 * Perform some operation over an array of vec4s.
                 *
                 * @param {Array} a the array of vectors to iterate over
                 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
                 * @param {Number} offset Number of elements to skip at the beginning of the array
                 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
                 * @param {Function} fn Function to call for each vector in the array
                 * @param {Object} [arg] additional argument to pass to fn
                 * @returns {Array} a
                 * @function
                 */
                vec4.forEach = (function() {
                    var vec = vec4.create();

                    return function(a, stride, offset, count, fn, arg) {
                        var i, l;
                        if(!stride) {
                            stride = 4;
                        }

                        if(!offset) {
                            offset = 0;
                        }

                        if(count) {
                            l = Math.min((count * stride) + offset, a.length);
                        } else {
                            l = a.length;
                        }

                        for(i = offset; i < l; i += stride) {
                            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
                            fn(vec, vec, arg);
                            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
                        }

                        return a;
                    };
                })();

                /**
                 * Returns a string representation of a vector
                 *
                 * @param {vec4} vec vector to represent as a string
                 * @returns {String} string representation of the vector
                 */
                vec4.str = function (a) {
                    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
                };

                if(typeof(exports) !== 'undefined') {
                    exports.vec4 = vec4;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 2x2 Matrix
                 * @name mat2
                 */

                var mat2 = {};

                /**
                 * Creates a new identity mat2
                 *
                 * @returns {mat2} a new 2x2 matrix
                 */
                mat2.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    return out;
                };

                /**
                 * Creates a new mat2 initialized with values from an existing matrix
                 *
                 * @param {mat2} a matrix to clone
                 * @returns {mat2} a new 2x2 matrix
                 */
                mat2.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    return out;
                };

                /**
                 * Copy the values from one mat2 to another
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the source matrix
                 * @returns {mat2} out
                 */
                mat2.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    return out;
                };

                /**
                 * Set a mat2 to the identity matrix
                 *
                 * @param {mat2} out the receiving matrix
                 * @returns {mat2} out
                 */
                mat2.identity = function(out) {
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    return out;
                };

                /**
                 * Transpose the values of a mat2
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the source matrix
                 * @returns {mat2} out
                 */
                mat2.transpose = function(out, a) {
                    // If we are transposing ourselves we can skip a few steps but have to cache some values
                    if (out === a) {
                        var a1 = a[1];
                        out[1] = a[2];
                        out[2] = a1;
                    } else {
                        out[0] = a[0];
                        out[1] = a[2];
                        out[2] = a[1];
                        out[3] = a[3];
                    }

                    return out;
                };

                /**
                 * Inverts a mat2
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the source matrix
                 * @returns {mat2} out
                 */
                mat2.invert = function(out, a) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

                        // Calculate the determinant
                        det = a0 * a3 - a2 * a1;

                    if (!det) {
                        return null;
                    }
                    det = 1.0 / det;

                    out[0] =  a3 * det;
                    out[1] = -a1 * det;
                    out[2] = -a2 * det;
                    out[3] =  a0 * det;

                    return out;
                };

                /**
                 * Calculates the adjugate of a mat2
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the source matrix
                 * @returns {mat2} out
                 */
                mat2.adjoint = function(out, a) {
                    // Caching this value is nessecary if out == a
                    var a0 = a[0];
                    out[0] =  a[3];
                    out[1] = -a[1];
                    out[2] = -a[2];
                    out[3] =  a0;

                    return out;
                };

                /**
                 * Calculates the determinant of a mat2
                 *
                 * @param {mat2} a the source matrix
                 * @returns {Number} determinant of a
                 */
                mat2.determinant = function (a) {
                    return a[0] * a[3] - a[2] * a[1];
                };

                /**
                 * Multiplies two mat2's
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the first operand
                 * @param {mat2} b the second operand
                 * @returns {mat2} out
                 */
                mat2.multiply = function (out, a, b) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
                    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                    out[0] = a0 * b0 + a2 * b1;
                    out[1] = a1 * b0 + a3 * b1;
                    out[2] = a0 * b2 + a2 * b3;
                    out[3] = a1 * b2 + a3 * b3;
                    return out;
                };

                /**
                 * Alias for {@link mat2.multiply}
                 * @function
                 */
                mat2.mul = mat2.multiply;

                /**
                 * Rotates a mat2 by the given angle
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat2} out
                 */
                mat2.rotate = function (out, a, rad) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                        s = Math.sin(rad),
                        c = Math.cos(rad);
                    out[0] = a0 *  c + a2 * s;
                    out[1] = a1 *  c + a3 * s;
                    out[2] = a0 * -s + a2 * c;
                    out[3] = a1 * -s + a3 * c;
                    return out;
                };

                /**
                 * Scales the mat2 by the dimensions in the given vec2
                 *
                 * @param {mat2} out the receiving matrix
                 * @param {mat2} a the matrix to rotate
                 * @param {vec2} v the vec2 to scale the matrix by
                 * @returns {mat2} out
                 **/
                mat2.scale = function(out, a, v) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                        v0 = v[0], v1 = v[1];
                    out[0] = a0 * v0;
                    out[1] = a1 * v0;
                    out[2] = a2 * v1;
                    out[3] = a3 * v1;
                    return out;
                };

                /**
                 * Returns a string representation of a mat2
                 *
                 * @param {mat2} mat matrix to represent as a string
                 * @returns {String} string representation of the matrix
                 */
                mat2.str = function (a) {
                    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
                };

                /**
                 * Returns Frobenius norm of a mat2
                 *
                 * @param {mat2} a the matrix to calculate Frobenius norm of
                 * @returns {Number} Frobenius norm
                 */
                mat2.frob = function (a) {
                    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
                };

                /**
                 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
                 * @param {mat2} L the lower triangular matrix
                 * @param {mat2} D the diagonal matrix
                 * @param {mat2} U the upper triangular matrix
                 * @param {mat2} a the input matrix to factorize
                 */

                mat2.LDU = function (L, D, U, a) {
                    L[2] = a[2]/a[0];
                    U[0] = a[0];
                    U[1] = a[1];
                    U[3] = a[3] - L[2] * U[1];
                    return [L, D, U];
                };

                if(typeof(exports) !== 'undefined') {
                    exports.mat2 = mat2;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 2x3 Matrix
                 * @name mat2d
                 *
                 * @description
                 * A mat2d contains six elements defined as:
                 * <pre>
                 * [a, c, tx,
                 *  b, d, ty]
                 * </pre>
                 * This is a short form for the 3x3 matrix:
                 * <pre>
                 * [a, c, tx,
                 *  b, d, ty,
                 *  0, 0, 1]
                 * </pre>
                 * The last row is ignored so the array is shorter and operations are faster.
                 */

                var mat2d = {};

                /**
                 * Creates a new identity mat2d
                 *
                 * @returns {mat2d} a new 2x3 matrix
                 */
                mat2d.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(6);
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    out[4] = 0;
                    out[5] = 0;
                    return out;
                };

                /**
                 * Creates a new mat2d initialized with values from an existing matrix
                 *
                 * @param {mat2d} a matrix to clone
                 * @returns {mat2d} a new 2x3 matrix
                 */
                mat2d.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(6);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    return out;
                };

                /**
                 * Copy the values from one mat2d to another
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the source matrix
                 * @returns {mat2d} out
                 */
                mat2d.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    return out;
                };

                /**
                 * Set a mat2d to the identity matrix
                 *
                 * @param {mat2d} out the receiving matrix
                 * @returns {mat2d} out
                 */
                mat2d.identity = function(out) {
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    out[4] = 0;
                    out[5] = 0;
                    return out;
                };

                /**
                 * Inverts a mat2d
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the source matrix
                 * @returns {mat2d} out
                 */
                mat2d.invert = function(out, a) {
                    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
                        atx = a[4], aty = a[5];

                    var det = aa * ad - ab * ac;
                    if(!det){
                        return null;
                    }
                    det = 1.0 / det;

                    out[0] = ad * det;
                    out[1] = -ab * det;
                    out[2] = -ac * det;
                    out[3] = aa * det;
                    out[4] = (ac * aty - ad * atx) * det;
                    out[5] = (ab * atx - aa * aty) * det;
                    return out;
                };

                /**
                 * Calculates the determinant of a mat2d
                 *
                 * @param {mat2d} a the source matrix
                 * @returns {Number} determinant of a
                 */
                mat2d.determinant = function (a) {
                    return a[0] * a[3] - a[1] * a[2];
                };

                /**
                 * Multiplies two mat2d's
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the first operand
                 * @param {mat2d} b the second operand
                 * @returns {mat2d} out
                 */
                mat2d.multiply = function (out, a, b) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
                    out[0] = a0 * b0 + a2 * b1;
                    out[1] = a1 * b0 + a3 * b1;
                    out[2] = a0 * b2 + a2 * b3;
                    out[3] = a1 * b2 + a3 * b3;
                    out[4] = a0 * b4 + a2 * b5 + a4;
                    out[5] = a1 * b4 + a3 * b5 + a5;
                    return out;
                };

                /**
                 * Alias for {@link mat2d.multiply}
                 * @function
                 */
                mat2d.mul = mat2d.multiply;


                /**
                 * Rotates a mat2d by the given angle
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat2d} out
                 */
                mat2d.rotate = function (out, a, rad) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                        s = Math.sin(rad),
                        c = Math.cos(rad);
                    out[0] = a0 *  c + a2 * s;
                    out[1] = a1 *  c + a3 * s;
                    out[2] = a0 * -s + a2 * c;
                    out[3] = a1 * -s + a3 * c;
                    out[4] = a4;
                    out[5] = a5;
                    return out;
                };

                /**
                 * Scales the mat2d by the dimensions in the given vec2
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the matrix to translate
                 * @param {vec2} v the vec2 to scale the matrix by
                 * @returns {mat2d} out
                 **/
                mat2d.scale = function(out, a, v) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                        v0 = v[0], v1 = v[1];
                    out[0] = a0 * v0;
                    out[1] = a1 * v0;
                    out[2] = a2 * v1;
                    out[3] = a3 * v1;
                    out[4] = a4;
                    out[5] = a5;
                    return out;
                };

                /**
                 * Translates the mat2d by the dimensions in the given vec2
                 *
                 * @param {mat2d} out the receiving matrix
                 * @param {mat2d} a the matrix to translate
                 * @param {vec2} v the vec2 to translate the matrix by
                 * @returns {mat2d} out
                 **/
                mat2d.translate = function(out, a, v) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                        v0 = v[0], v1 = v[1];
                    out[0] = a0;
                    out[1] = a1;
                    out[2] = a2;
                    out[3] = a3;
                    out[4] = a0 * v0 + a2 * v1 + a4;
                    out[5] = a1 * v0 + a3 * v1 + a5;
                    return out;
                };

                /**
                 * Returns a string representation of a mat2d
                 *
                 * @param {mat2d} a matrix to represent as a string
                 * @returns {String} string representation of the matrix
                 */
                mat2d.str = function (a) {
                    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                        a[3] + ', ' + a[4] + ', ' + a[5] + ')';
                };

                /**
                 * Returns Frobenius norm of a mat2d
                 *
                 * @param {mat2d} a the matrix to calculate Frobenius norm of
                 * @returns {Number} Frobenius norm
                 */
                mat2d.frob = function (a) {
                    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
                };

                if(typeof(exports) !== 'undefined') {
                    exports.mat2d = mat2d;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 3x3 Matrix
                 * @name mat3
                 */

                var mat3 = {};

                /**
                 * Creates a new identity mat3
                 *
                 * @returns {mat3} a new 3x3 matrix
                 */
                mat3.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(9);
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 1;
                    out[5] = 0;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 1;
                    return out;
                };

                /**
                 * Copies the upper-left 3x3 values into the given mat3.
                 *
                 * @param {mat3} out the receiving 3x3 matrix
                 * @param {mat4} a   the source 4x4 matrix
                 * @returns {mat3} out
                 */
                mat3.fromMat4 = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[4];
                    out[4] = a[5];
                    out[5] = a[6];
                    out[6] = a[8];
                    out[7] = a[9];
                    out[8] = a[10];
                    return out;
                };

                /**
                 * Creates a new mat3 initialized with values from an existing matrix
                 *
                 * @param {mat3} a matrix to clone
                 * @returns {mat3} a new 3x3 matrix
                 */
                mat3.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(9);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    out[6] = a[6];
                    out[7] = a[7];
                    out[8] = a[8];
                    return out;
                };

                /**
                 * Copy the values from one mat3 to another
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the source matrix
                 * @returns {mat3} out
                 */
                mat3.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    out[6] = a[6];
                    out[7] = a[7];
                    out[8] = a[8];
                    return out;
                };

                /**
                 * Set a mat3 to the identity matrix
                 *
                 * @param {mat3} out the receiving matrix
                 * @returns {mat3} out
                 */
                mat3.identity = function(out) {
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 1;
                    out[5] = 0;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 1;
                    return out;
                };

                /**
                 * Transpose the values of a mat3
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the source matrix
                 * @returns {mat3} out
                 */
                mat3.transpose = function(out, a) {
                    // If we are transposing ourselves we can skip a few steps but have to cache some values
                    if (out === a) {
                        var a01 = a[1], a02 = a[2], a12 = a[5];
                        out[1] = a[3];
                        out[2] = a[6];
                        out[3] = a01;
                        out[5] = a[7];
                        out[6] = a02;
                        out[7] = a12;
                    } else {
                        out[0] = a[0];
                        out[1] = a[3];
                        out[2] = a[6];
                        out[3] = a[1];
                        out[4] = a[4];
                        out[5] = a[7];
                        out[6] = a[2];
                        out[7] = a[5];
                        out[8] = a[8];
                    }

                    return out;
                };

                /**
                 * Inverts a mat3
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the source matrix
                 * @returns {mat3} out
                 */
                mat3.invert = function(out, a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8],

                        b01 = a22 * a11 - a12 * a21,
                        b11 = -a22 * a10 + a12 * a20,
                        b21 = a21 * a10 - a11 * a20,

                        // Calculate the determinant
                        det = a00 * b01 + a01 * b11 + a02 * b21;

                    if (!det) {
                        return null;
                    }
                    det = 1.0 / det;

                    out[0] = b01 * det;
                    out[1] = (-a22 * a01 + a02 * a21) * det;
                    out[2] = (a12 * a01 - a02 * a11) * det;
                    out[3] = b11 * det;
                    out[4] = (a22 * a00 - a02 * a20) * det;
                    out[5] = (-a12 * a00 + a02 * a10) * det;
                    out[6] = b21 * det;
                    out[7] = (-a21 * a00 + a01 * a20) * det;
                    out[8] = (a11 * a00 - a01 * a10) * det;
                    return out;
                };

                /**
                 * Calculates the adjugate of a mat3
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the source matrix
                 * @returns {mat3} out
                 */
                mat3.adjoint = function(out, a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8];

                    out[0] = (a11 * a22 - a12 * a21);
                    out[1] = (a02 * a21 - a01 * a22);
                    out[2] = (a01 * a12 - a02 * a11);
                    out[3] = (a12 * a20 - a10 * a22);
                    out[4] = (a00 * a22 - a02 * a20);
                    out[5] = (a02 * a10 - a00 * a12);
                    out[6] = (a10 * a21 - a11 * a20);
                    out[7] = (a01 * a20 - a00 * a21);
                    out[8] = (a00 * a11 - a01 * a10);
                    return out;
                };

                /**
                 * Calculates the determinant of a mat3
                 *
                 * @param {mat3} a the source matrix
                 * @returns {Number} determinant of a
                 */
                mat3.determinant = function (a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8];

                    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
                };

                /**
                 * Multiplies two mat3's
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the first operand
                 * @param {mat3} b the second operand
                 * @returns {mat3} out
                 */
                mat3.multiply = function (out, a, b) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8],

                        b00 = b[0], b01 = b[1], b02 = b[2],
                        b10 = b[3], b11 = b[4], b12 = b[5],
                        b20 = b[6], b21 = b[7], b22 = b[8];

                    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
                    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
                    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

                    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
                    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
                    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

                    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
                    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
                    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
                    return out;
                };

                /**
                 * Alias for {@link mat3.multiply}
                 * @function
                 */
                mat3.mul = mat3.multiply;

                /**
                 * Translate a mat3 by the given vector
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the matrix to translate
                 * @param {vec2} v vector to translate by
                 * @returns {mat3} out
                 */
                mat3.translate = function(out, a, v) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8],
                        x = v[0], y = v[1];

                    out[0] = a00;
                    out[1] = a01;
                    out[2] = a02;

                    out[3] = a10;
                    out[4] = a11;
                    out[5] = a12;

                    out[6] = x * a00 + y * a10 + a20;
                    out[7] = x * a01 + y * a11 + a21;
                    out[8] = x * a02 + y * a12 + a22;
                    return out;
                };

                /**
                 * Rotates a mat3 by the given angle
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat3} out
                 */
                mat3.rotate = function (out, a, rad) {
                    var a00 = a[0], a01 = a[1], a02 = a[2],
                        a10 = a[3], a11 = a[4], a12 = a[5],
                        a20 = a[6], a21 = a[7], a22 = a[8],

                        s = Math.sin(rad),
                        c = Math.cos(rad);

                    out[0] = c * a00 + s * a10;
                    out[1] = c * a01 + s * a11;
                    out[2] = c * a02 + s * a12;

                    out[3] = c * a10 - s * a00;
                    out[4] = c * a11 - s * a01;
                    out[5] = c * a12 - s * a02;

                    out[6] = a20;
                    out[7] = a21;
                    out[8] = a22;
                    return out;
                };

                /**
                 * Scales the mat3 by the dimensions in the given vec2
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat3} a the matrix to rotate
                 * @param {vec2} v the vec2 to scale the matrix by
                 * @returns {mat3} out
                 **/
                mat3.scale = function(out, a, v) {
                    var x = v[0], y = v[1];

                    out[0] = x * a[0];
                    out[1] = x * a[1];
                    out[2] = x * a[2];

                    out[3] = y * a[3];
                    out[4] = y * a[4];
                    out[5] = y * a[5];

                    out[6] = a[6];
                    out[7] = a[7];
                    out[8] = a[8];
                    return out;
                };

                /**
                 * Copies the values from a mat2d into a mat3
                 *
                 * @param {mat3} out the receiving matrix
                 * @param {mat2d} a the matrix to copy
                 * @returns {mat3} out
                 **/
                mat3.fromMat2d = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = 0;

                    out[3] = a[2];
                    out[4] = a[3];
                    out[5] = 0;

                    out[6] = a[4];
                    out[7] = a[5];
                    out[8] = 1;
                    return out;
                };

                /**
                 * Calculates a 3x3 matrix from the given quaternion
                 *
                 * @param {mat3} out mat3 receiving operation result
                 * @param {quat} q Quaternion to create matrix from
                 *
                 * @returns {mat3} out
                 */
                mat3.fromQuat = function (out, q) {
                    var x = q[0], y = q[1], z = q[2], w = q[3],
                        x2 = x + x,
                        y2 = y + y,
                        z2 = z + z,

                        xx = x * x2,
                        yx = y * x2,
                        yy = y * y2,
                        zx = z * x2,
                        zy = z * y2,
                        zz = z * z2,
                        wx = w * x2,
                        wy = w * y2,
                        wz = w * z2;

                    out[0] = 1 - yy - zz;
                    out[3] = yx - wz;
                    out[6] = zx + wy;

                    out[1] = yx + wz;
                    out[4] = 1 - xx - zz;
                    out[7] = zy - wx;

                    out[2] = zx - wy;
                    out[5] = zy + wx;
                    out[8] = 1 - xx - yy;

                    return out;
                };

                /**
                 * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
                 *
                 * @param {mat3} out mat3 receiving operation result
                 * @param {mat4} a Mat4 to derive the normal matrix from
                 *
                 * @returns {mat3} out
                 */
                mat3.normalFromMat4 = function (out, a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                        b00 = a00 * a11 - a01 * a10,
                        b01 = a00 * a12 - a02 * a10,
                        b02 = a00 * a13 - a03 * a10,
                        b03 = a01 * a12 - a02 * a11,
                        b04 = a01 * a13 - a03 * a11,
                        b05 = a02 * a13 - a03 * a12,
                        b06 = a20 * a31 - a21 * a30,
                        b07 = a20 * a32 - a22 * a30,
                        b08 = a20 * a33 - a23 * a30,
                        b09 = a21 * a32 - a22 * a31,
                        b10 = a21 * a33 - a23 * a31,
                        b11 = a22 * a33 - a23 * a32,

                        // Calculate the determinant
                        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

                    if (!det) {
                        return null;
                    }
                    det = 1.0 / det;

                    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

                    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

                    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

                    return out;
                };

                /**
                 * Returns a string representation of a mat3
                 *
                 * @param {mat3} mat matrix to represent as a string
                 * @returns {String} string representation of the matrix
                 */
                mat3.str = function (a) {
                    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                        a[3] + ', ' + a[4] + ', ' + a[5] + ', ' +
                        a[6] + ', ' + a[7] + ', ' + a[8] + ')';
                };

                /**
                 * Returns Frobenius norm of a mat3
                 *
                 * @param {mat3} a the matrix to calculate Frobenius norm of
                 * @returns {Number} Frobenius norm
                 */
                mat3.frob = function (a) {
                    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
                };


                if(typeof(exports) !== 'undefined') {
                    exports.mat3 = mat3;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class 4x4 Matrix
                 * @name mat4
                 */

                var mat4 = {};

                /**
                 * Creates a new identity mat4
                 *
                 * @returns {mat4} a new 4x4 matrix
                 */
                mat4.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(16);
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 0;
                    out[5] = 1;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 0;
                    out[9] = 0;
                    out[10] = 1;
                    out[11] = 0;
                    out[12] = 0;
                    out[13] = 0;
                    out[14] = 0;
                    out[15] = 1;
                    return out;
                };

                /**
                 * Creates a new mat4 initialized with values from an existing matrix
                 *
                 * @param {mat4} a matrix to clone
                 * @returns {mat4} a new 4x4 matrix
                 */
                mat4.clone = function(a) {
                    var out = new GLMAT_ARRAY_TYPE(16);
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    out[6] = a[6];
                    out[7] = a[7];
                    out[8] = a[8];
                    out[9] = a[9];
                    out[10] = a[10];
                    out[11] = a[11];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                    return out;
                };

                /**
                 * Copy the values from one mat4 to another
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the source matrix
                 * @returns {mat4} out
                 */
                mat4.copy = function(out, a) {
                    out[0] = a[0];
                    out[1] = a[1];
                    out[2] = a[2];
                    out[3] = a[3];
                    out[4] = a[4];
                    out[5] = a[5];
                    out[6] = a[6];
                    out[7] = a[7];
                    out[8] = a[8];
                    out[9] = a[9];
                    out[10] = a[10];
                    out[11] = a[11];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                    return out;
                };

                /**
                 * Set a mat4 to the identity matrix
                 *
                 * @param {mat4} out the receiving matrix
                 * @returns {mat4} out
                 */
                mat4.identity = function(out) {
                    out[0] = 1;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 0;
                    out[5] = 1;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 0;
                    out[9] = 0;
                    out[10] = 1;
                    out[11] = 0;
                    out[12] = 0;
                    out[13] = 0;
                    out[14] = 0;
                    out[15] = 1;
                    return out;
                };

                /**
                 * Transpose the values of a mat4
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the source matrix
                 * @returns {mat4} out
                 */
                mat4.transpose = function(out, a) {
                    // If we are transposing ourselves we can skip a few steps but have to cache some values
                    if (out === a) {
                        var a01 = a[1], a02 = a[2], a03 = a[3],
                            a12 = a[6], a13 = a[7],
                            a23 = a[11];

                        out[1] = a[4];
                        out[2] = a[8];
                        out[3] = a[12];
                        out[4] = a01;
                        out[6] = a[9];
                        out[7] = a[13];
                        out[8] = a02;
                        out[9] = a12;
                        out[11] = a[14];
                        out[12] = a03;
                        out[13] = a13;
                        out[14] = a23;
                    } else {
                        out[0] = a[0];
                        out[1] = a[4];
                        out[2] = a[8];
                        out[3] = a[12];
                        out[4] = a[1];
                        out[5] = a[5];
                        out[6] = a[9];
                        out[7] = a[13];
                        out[8] = a[2];
                        out[9] = a[6];
                        out[10] = a[10];
                        out[11] = a[14];
                        out[12] = a[3];
                        out[13] = a[7];
                        out[14] = a[11];
                        out[15] = a[15];
                    }

                    return out;
                };

                /**
                 * Inverts a mat4
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the source matrix
                 * @returns {mat4} out
                 */
                mat4.invert = function(out, a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                        b00 = a00 * a11 - a01 * a10,
                        b01 = a00 * a12 - a02 * a10,
                        b02 = a00 * a13 - a03 * a10,
                        b03 = a01 * a12 - a02 * a11,
                        b04 = a01 * a13 - a03 * a11,
                        b05 = a02 * a13 - a03 * a12,
                        b06 = a20 * a31 - a21 * a30,
                        b07 = a20 * a32 - a22 * a30,
                        b08 = a20 * a33 - a23 * a30,
                        b09 = a21 * a32 - a22 * a31,
                        b10 = a21 * a33 - a23 * a31,
                        b11 = a22 * a33 - a23 * a32,

                        // Calculate the determinant
                        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

                    if (!det) {
                        return null;
                    }
                    det = 1.0 / det;

                    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
                    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
                    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
                    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
                    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
                    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
                    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
                    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
                    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
                    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

                    return out;
                };

                /**
                 * Calculates the adjugate of a mat4
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the source matrix
                 * @returns {mat4} out
                 */
                mat4.adjoint = function(out, a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

                    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
                    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
                    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
                    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
                    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
                    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
                    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
                    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
                    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
                    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
                    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
                    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
                    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
                    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
                    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
                    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
                    return out;
                };

                /**
                 * Calculates the determinant of a mat4
                 *
                 * @param {mat4} a the source matrix
                 * @returns {Number} determinant of a
                 */
                mat4.determinant = function (a) {
                    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                        b00 = a00 * a11 - a01 * a10,
                        b01 = a00 * a12 - a02 * a10,
                        b02 = a00 * a13 - a03 * a10,
                        b03 = a01 * a12 - a02 * a11,
                        b04 = a01 * a13 - a03 * a11,
                        b05 = a02 * a13 - a03 * a12,
                        b06 = a20 * a31 - a21 * a30,
                        b07 = a20 * a32 - a22 * a30,
                        b08 = a20 * a33 - a23 * a30,
                        b09 = a21 * a32 - a22 * a31,
                        b10 = a21 * a33 - a23 * a31,
                        b11 = a22 * a33 - a23 * a32;

                    // Calculate the determinant
                    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
                };

                /**
                 * Multiplies two mat4's
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the first operand
                 * @param {mat4} b the second operand
                 * @returns {mat4} out
                 */
                mat4.multiply = function (out, a, b) {
                    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

                    // Cache only the current line of the second matrix
                    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
                    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
                    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
                    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
                    return out;
                };

                /**
                 * Alias for {@link mat4.multiply}
                 * @function
                 */
                mat4.mul = mat4.multiply;

                /**
                 * Translate a mat4 by the given vector
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to translate
                 * @param {vec3} v vector to translate by
                 * @returns {mat4} out
                 */
                mat4.translate = function (out, a, v) {
                    var x = v[0], y = v[1], z = v[2],
                        a00, a01, a02, a03,
                        a10, a11, a12, a13,
                        a20, a21, a22, a23;

                    if (a === out) {
                        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
                        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
                        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
                        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
                    } else {
                        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
                        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
                        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

                        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
                        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
                        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

                        out[12] = a00 * x + a10 * y + a20 * z + a[12];
                        out[13] = a01 * x + a11 * y + a21 * z + a[13];
                        out[14] = a02 * x + a12 * y + a22 * z + a[14];
                        out[15] = a03 * x + a13 * y + a23 * z + a[15];
                    }

                    return out;
                };

                /**
                 * Scales the mat4 by the dimensions in the given vec3
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to scale
                 * @param {vec3} v the vec3 to scale the matrix by
                 * @returns {mat4} out
                 **/
                mat4.scale = function(out, a, v) {
                    var x = v[0], y = v[1], z = v[2];

                    out[0] = a[0] * x;
                    out[1] = a[1] * x;
                    out[2] = a[2] * x;
                    out[3] = a[3] * x;
                    out[4] = a[4] * y;
                    out[5] = a[5] * y;
                    out[6] = a[6] * y;
                    out[7] = a[7] * y;
                    out[8] = a[8] * z;
                    out[9] = a[9] * z;
                    out[10] = a[10] * z;
                    out[11] = a[11] * z;
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                    return out;
                };

                /**
                 * Rotates a mat4 by the given angle
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @param {vec3} axis the axis to rotate around
                 * @returns {mat4} out
                 */
                mat4.rotate = function (out, a, rad, axis) {
                    var x = axis[0], y = axis[1], z = axis[2],
                        len = Math.sqrt(x * x + y * y + z * z),
                        s, c, t,
                        a00, a01, a02, a03,
                        a10, a11, a12, a13,
                        a20, a21, a22, a23,
                        b00, b01, b02,
                        b10, b11, b12,
                        b20, b21, b22;

                    if (Math.abs(len) < GLMAT_EPSILON) { return null; }

                    len = 1 / len;
                    x *= len;
                    y *= len;
                    z *= len;

                    s = Math.sin(rad);
                    c = Math.cos(rad);
                    t = 1 - c;

                    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
                    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
                    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

                    // Construct the elements of the rotation matrix
                    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
                    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
                    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

                    // Perform rotation-specific matrix multiplication
                    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
                    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
                    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
                    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
                    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
                    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
                    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
                    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
                    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
                    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
                    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
                    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

                    if (a !== out) { // If the source and destination differ, copy the unchanged last row
                        out[12] = a[12];
                        out[13] = a[13];
                        out[14] = a[14];
                        out[15] = a[15];
                    }
                    return out;
                };

                /**
                 * Rotates a matrix by the given angle around the X axis
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat4} out
                 */
                mat4.rotateX = function (out, a, rad) {
                    var s = Math.sin(rad),
                        c = Math.cos(rad),
                        a10 = a[4],
                        a11 = a[5],
                        a12 = a[6],
                        a13 = a[7],
                        a20 = a[8],
                        a21 = a[9],
                        a22 = a[10],
                        a23 = a[11];

                    if (a !== out) { // If the source and destination differ, copy the unchanged rows
                        out[0]  = a[0];
                        out[1]  = a[1];
                        out[2]  = a[2];
                        out[3]  = a[3];
                        out[12] = a[12];
                        out[13] = a[13];
                        out[14] = a[14];
                        out[15] = a[15];
                    }

                    // Perform axis-specific matrix multiplication
                    out[4] = a10 * c + a20 * s;
                    out[5] = a11 * c + a21 * s;
                    out[6] = a12 * c + a22 * s;
                    out[7] = a13 * c + a23 * s;
                    out[8] = a20 * c - a10 * s;
                    out[9] = a21 * c - a11 * s;
                    out[10] = a22 * c - a12 * s;
                    out[11] = a23 * c - a13 * s;
                    return out;
                };

                /**
                 * Rotates a matrix by the given angle around the Y axis
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat4} out
                 */
                mat4.rotateY = function (out, a, rad) {
                    var s = Math.sin(rad),
                        c = Math.cos(rad),
                        a00 = a[0],
                        a01 = a[1],
                        a02 = a[2],
                        a03 = a[3],
                        a20 = a[8],
                        a21 = a[9],
                        a22 = a[10],
                        a23 = a[11];

                    if (a !== out) { // If the source and destination differ, copy the unchanged rows
                        out[4]  = a[4];
                        out[5]  = a[5];
                        out[6]  = a[6];
                        out[7]  = a[7];
                        out[12] = a[12];
                        out[13] = a[13];
                        out[14] = a[14];
                        out[15] = a[15];
                    }

                    // Perform axis-specific matrix multiplication
                    out[0] = a00 * c - a20 * s;
                    out[1] = a01 * c - a21 * s;
                    out[2] = a02 * c - a22 * s;
                    out[3] = a03 * c - a23 * s;
                    out[8] = a00 * s + a20 * c;
                    out[9] = a01 * s + a21 * c;
                    out[10] = a02 * s + a22 * c;
                    out[11] = a03 * s + a23 * c;
                    return out;
                };

                /**
                 * Rotates a matrix by the given angle around the Z axis
                 *
                 * @param {mat4} out the receiving matrix
                 * @param {mat4} a the matrix to rotate
                 * @param {Number} rad the angle to rotate the matrix by
                 * @returns {mat4} out
                 */
                mat4.rotateZ = function (out, a, rad) {
                    var s = Math.sin(rad),
                        c = Math.cos(rad),
                        a00 = a[0],
                        a01 = a[1],
                        a02 = a[2],
                        a03 = a[3],
                        a10 = a[4],
                        a11 = a[5],
                        a12 = a[6],
                        a13 = a[7];

                    if (a !== out) { // If the source and destination differ, copy the unchanged last row
                        out[8]  = a[8];
                        out[9]  = a[9];
                        out[10] = a[10];
                        out[11] = a[11];
                        out[12] = a[12];
                        out[13] = a[13];
                        out[14] = a[14];
                        out[15] = a[15];
                    }

                    // Perform axis-specific matrix multiplication
                    out[0] = a00 * c + a10 * s;
                    out[1] = a01 * c + a11 * s;
                    out[2] = a02 * c + a12 * s;
                    out[3] = a03 * c + a13 * s;
                    out[4] = a10 * c - a00 * s;
                    out[5] = a11 * c - a01 * s;
                    out[6] = a12 * c - a02 * s;
                    out[7] = a13 * c - a03 * s;
                    return out;
                };

                /**
                 * Creates a matrix from a quaternion rotation and vector translation
                 * This is equivalent to (but much faster than):
                 *
                 *     mat4.identity(dest);
                 *     mat4.translate(dest, vec);
                 *     var quatMat = mat4.create();
                 *     quat4.toMat4(quat, quatMat);
                 *     mat4.multiply(dest, quatMat);
                 *
                 * @param {mat4} out mat4 receiving operation result
                 * @param {quat4} q Rotation quaternion
                 * @param {vec3} v Translation vector
                 * @returns {mat4} out
                 */
                mat4.fromRotationTranslation = function (out, q, v) {
                    // Quaternion math
                    var x = q[0], y = q[1], z = q[2], w = q[3],
                        x2 = x + x,
                        y2 = y + y,
                        z2 = z + z,

                        xx = x * x2,
                        xy = x * y2,
                        xz = x * z2,
                        yy = y * y2,
                        yz = y * z2,
                        zz = z * z2,
                        wx = w * x2,
                        wy = w * y2,
                        wz = w * z2;

                    out[0] = 1 - (yy + zz);
                    out[1] = xy + wz;
                    out[2] = xz - wy;
                    out[3] = 0;
                    out[4] = xy - wz;
                    out[5] = 1 - (xx + zz);
                    out[6] = yz + wx;
                    out[7] = 0;
                    out[8] = xz + wy;
                    out[9] = yz - wx;
                    out[10] = 1 - (xx + yy);
                    out[11] = 0;
                    out[12] = v[0];
                    out[13] = v[1];
                    out[14] = v[2];
                    out[15] = 1;

                    return out;
                };

                mat4.fromQuat = function (out, q) {
                    var x = q[0], y = q[1], z = q[2], w = q[3],
                        x2 = x + x,
                        y2 = y + y,
                        z2 = z + z,

                        xx = x * x2,
                        yx = y * x2,
                        yy = y * y2,
                        zx = z * x2,
                        zy = z * y2,
                        zz = z * z2,
                        wx = w * x2,
                        wy = w * y2,
                        wz = w * z2;

                    out[0] = 1 - yy - zz;
                    out[1] = yx + wz;
                    out[2] = zx - wy;
                    out[3] = 0;

                    out[4] = yx - wz;
                    out[5] = 1 - xx - zz;
                    out[6] = zy + wx;
                    out[7] = 0;

                    out[8] = zx + wy;
                    out[9] = zy - wx;
                    out[10] = 1 - xx - yy;
                    out[11] = 0;

                    out[12] = 0;
                    out[13] = 0;
                    out[14] = 0;
                    out[15] = 1;

                    return out;
                };

                /**
                 * Generates a frustum matrix with the given bounds
                 *
                 * @param {mat4} out mat4 frustum matrix will be written into
                 * @param {Number} left Left bound of the frustum
                 * @param {Number} right Right bound of the frustum
                 * @param {Number} bottom Bottom bound of the frustum
                 * @param {Number} top Top bound of the frustum
                 * @param {Number} near Near bound of the frustum
                 * @param {Number} far Far bound of the frustum
                 * @returns {mat4} out
                 */
                mat4.frustum = function (out, left, right, bottom, top, near, far) {
                    var rl = 1 / (right - left),
                        tb = 1 / (top - bottom),
                        nf = 1 / (near - far);
                    out[0] = (near * 2) * rl;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 0;
                    out[5] = (near * 2) * tb;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = (right + left) * rl;
                    out[9] = (top + bottom) * tb;
                    out[10] = (far + near) * nf;
                    out[11] = -1;
                    out[12] = 0;
                    out[13] = 0;
                    out[14] = (far * near * 2) * nf;
                    out[15] = 0;
                    return out;
                };

                /**
                 * Generates a perspective projection matrix with the given bounds
                 *
                 * @param {mat4} out mat4 frustum matrix will be written into
                 * @param {number} fovy Vertical field of view in radians
                 * @param {number} aspect Aspect ratio. typically viewport width/height
                 * @param {number} near Near bound of the frustum
                 * @param {number} far Far bound of the frustum
                 * @returns {mat4} out
                 */
                mat4.perspective = function (out, fovy, aspect, near, far) {
                    var f = 1.0 / Math.tan(fovy / 2),
                        nf = 1 / (near - far);
                    out[0] = f / aspect;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 0;
                    out[5] = f;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 0;
                    out[9] = 0;
                    out[10] = (far + near) * nf;
                    out[11] = -1;
                    out[12] = 0;
                    out[13] = 0;
                    out[14] = (2 * far * near) * nf;
                    out[15] = 0;
                    return out;
                };

                /**
                 * Generates a orthogonal projection matrix with the given bounds
                 *
                 * @param {mat4} out mat4 frustum matrix will be written into
                 * @param {number} left Left bound of the frustum
                 * @param {number} right Right bound of the frustum
                 * @param {number} bottom Bottom bound of the frustum
                 * @param {number} top Top bound of the frustum
                 * @param {number} near Near bound of the frustum
                 * @param {number} far Far bound of the frustum
                 * @returns {mat4} out
                 */
                mat4.ortho = function (out, left, right, bottom, top, near, far) {
                    var lr = 1 / (left - right),
                        bt = 1 / (bottom - top),
                        nf = 1 / (near - far);
                    out[0] = -2 * lr;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 0;
                    out[4] = 0;
                    out[5] = -2 * bt;
                    out[6] = 0;
                    out[7] = 0;
                    out[8] = 0;
                    out[9] = 0;
                    out[10] = 2 * nf;
                    out[11] = 0;
                    out[12] = (left + right) * lr;
                    out[13] = (top + bottom) * bt;
                    out[14] = (far + near) * nf;
                    out[15] = 1;
                    return out;
                };

                /**
                 * Generates a look-at matrix with the given eye position, focal point, and up axis
                 *
                 * @param {mat4} out mat4 frustum matrix will be written into
                 * @param {vec3} eye Position of the viewer
                 * @param {vec3} center Point the viewer is looking at
                 * @param {vec3} up vec3 pointing up
                 * @returns {mat4} out
                 */
                mat4.lookAt = function (out, eye, center, up) {
                    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
                        eyex = eye[0],
                        eyey = eye[1],
                        eyez = eye[2],
                        upx = up[0],
                        upy = up[1],
                        upz = up[2],
                        centerx = center[0],
                        centery = center[1],
                        centerz = center[2];

                    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
                        Math.abs(eyey - centery) < GLMAT_EPSILON &&
                        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
                        return mat4.identity(out);
                    }

                    z0 = eyex - centerx;
                    z1 = eyey - centery;
                    z2 = eyez - centerz;

                    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
                    z0 *= len;
                    z1 *= len;
                    z2 *= len;

                    x0 = upy * z2 - upz * z1;
                    x1 = upz * z0 - upx * z2;
                    x2 = upx * z1 - upy * z0;
                    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
                    if (!len) {
                        x0 = 0;
                        x1 = 0;
                        x2 = 0;
                    } else {
                        len = 1 / len;
                        x0 *= len;
                        x1 *= len;
                        x2 *= len;
                    }

                    y0 = z1 * x2 - z2 * x1;
                    y1 = z2 * x0 - z0 * x2;
                    y2 = z0 * x1 - z1 * x0;

                    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
                    if (!len) {
                        y0 = 0;
                        y1 = 0;
                        y2 = 0;
                    } else {
                        len = 1 / len;
                        y0 *= len;
                        y1 *= len;
                        y2 *= len;
                    }

                    out[0] = x0;
                    out[1] = y0;
                    out[2] = z0;
                    out[3] = 0;
                    out[4] = x1;
                    out[5] = y1;
                    out[6] = z1;
                    out[7] = 0;
                    out[8] = x2;
                    out[9] = y2;
                    out[10] = z2;
                    out[11] = 0;
                    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
                    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
                    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
                    out[15] = 1;

                    return out;
                };

                /**
                 * Returns a string representation of a mat4
                 *
                 * @param {mat4} mat matrix to represent as a string
                 * @returns {String} string representation of the matrix
                 */
                mat4.str = function (a) {
                    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                        a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                        a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
                        a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
                };

                /**
                 * Returns Frobenius norm of a mat4
                 *
                 * @param {mat4} a the matrix to calculate Frobenius norm of
                 * @returns {Number} Frobenius norm
                 */
                mat4.frob = function (a) {
                    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
                };


                if(typeof(exports) !== 'undefined') {
                    exports.mat4 = mat4;
                }
                ;
                /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

                /**
                 * @class Quaternion
                 * @name quat
                 */

                var quat = {};

                /**
                 * Creates a new identity quat
                 *
                 * @returns {quat} a new quaternion
                 */
                quat.create = function() {
                    var out = new GLMAT_ARRAY_TYPE(4);
                    out[0] = 0;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    return out;
                };

                /**
                 * Sets a quaternion to represent the shortest rotation from one
                 * vector to another.
                 *
                 * Both vectors are assumed to be unit length.
                 *
                 * @param {quat} out the receiving quaternion.
                 * @param {vec3} a the initial vector
                 * @param {vec3} b the destination vector
                 * @returns {quat} out
                 */
                quat.rotationTo = (function() {
                    var tmpvec3 = vec3.create();
                    var xUnitVec3 = vec3.fromValues(1,0,0);
                    var yUnitVec3 = vec3.fromValues(0,1,0);

                    return function(out, a, b) {
                        var dot = vec3.dot(a, b);
                        if (dot < -0.999999) {
                            vec3.cross(tmpvec3, xUnitVec3, a);
                            if (vec3.length(tmpvec3) < 0.000001)
                                vec3.cross(tmpvec3, yUnitVec3, a);
                            vec3.normalize(tmpvec3, tmpvec3);
                            quat.setAxisAngle(out, tmpvec3, Math.PI);
                            return out;
                        } else if (dot > 0.999999) {
                            out[0] = 0;
                            out[1] = 0;
                            out[2] = 0;
                            out[3] = 1;
                            return out;
                        } else {
                            vec3.cross(tmpvec3, a, b);
                            out[0] = tmpvec3[0];
                            out[1] = tmpvec3[1];
                            out[2] = tmpvec3[2];
                            out[3] = 1 + dot;
                            return quat.normalize(out, out);
                        }
                    };
                })();

                /**
                 * Sets the specified quaternion with values corresponding to the given
                 * axes. Each axis is a vec3 and is expected to be unit length and
                 * perpendicular to all other specified axes.
                 *
                 * @param {vec3} view  the vector representing the viewing direction
                 * @param {vec3} right the vector representing the local "right" direction
                 * @param {vec3} up    the vector representing the local "up" direction
                 * @returns {quat} out
                 */
                quat.setAxes = (function() {
                    var matr = mat3.create();

                    return function(out, view, right, up) {
                        matr[0] = right[0];
                        matr[3] = right[1];
                        matr[6] = right[2];

                        matr[1] = up[0];
                        matr[4] = up[1];
                        matr[7] = up[2];

                        matr[2] = -view[0];
                        matr[5] = -view[1];
                        matr[8] = -view[2];

                        return quat.normalize(out, quat.fromMat3(out, matr));
                    };
                })();

                /**
                 * Creates a new quat initialized with values from an existing quaternion
                 *
                 * @param {quat} a quaternion to clone
                 * @returns {quat} a new quaternion
                 * @function
                 */
                quat.clone = vec4.clone;

                /**
                 * Creates a new quat initialized with the given values
                 *
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @param {Number} w W component
                 * @returns {quat} a new quaternion
                 * @function
                 */
                quat.fromValues = vec4.fromValues;

                /**
                 * Copy the values from one quat to another
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a the source quaternion
                 * @returns {quat} out
                 * @function
                 */
                quat.copy = vec4.copy;

                /**
                 * Set the components of a quat to the given values
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {Number} x X component
                 * @param {Number} y Y component
                 * @param {Number} z Z component
                 * @param {Number} w W component
                 * @returns {quat} out
                 * @function
                 */
                quat.set = vec4.set;

                /**
                 * Set a quat to the identity quaternion
                 *
                 * @param {quat} out the receiving quaternion
                 * @returns {quat} out
                 */
                quat.identity = function(out) {
                    out[0] = 0;
                    out[1] = 0;
                    out[2] = 0;
                    out[3] = 1;
                    return out;
                };

                /**
                 * Sets a quat from the given angle and rotation axis,
                 * then returns it.
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {vec3} axis the axis around which to rotate
                 * @param {Number} rad the angle in radians
                 * @returns {quat} out
                 **/
                quat.setAxisAngle = function(out, axis, rad) {
                    rad = rad * 0.5;
                    var s = Math.sin(rad);
                    out[0] = s * axis[0];
                    out[1] = s * axis[1];
                    out[2] = s * axis[2];
                    out[3] = Math.cos(rad);
                    return out;
                };

                /**
                 * Adds two quat's
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a the first operand
                 * @param {quat} b the second operand
                 * @returns {quat} out
                 * @function
                 */
                quat.add = vec4.add;

                /**
                 * Multiplies two quat's
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a the first operand
                 * @param {quat} b the second operand
                 * @returns {quat} out
                 */
                quat.multiply = function(out, a, b) {
                    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                        bx = b[0], by = b[1], bz = b[2], bw = b[3];

                    out[0] = ax * bw + aw * bx + ay * bz - az * by;
                    out[1] = ay * bw + aw * by + az * bx - ax * bz;
                    out[2] = az * bw + aw * bz + ax * by - ay * bx;
                    out[3] = aw * bw - ax * bx - ay * by - az * bz;
                    return out;
                };

                /**
                 * Alias for {@link quat.multiply}
                 * @function
                 */
                quat.mul = quat.multiply;

                /**
                 * Scales a quat by a scalar number
                 *
                 * @param {quat} out the receiving vector
                 * @param {quat} a the vector to scale
                 * @param {Number} b amount to scale the vector by
                 * @returns {quat} out
                 * @function
                 */
                quat.scale = vec4.scale;

                /**
                 * Rotates a quaternion by the given angle about the X axis
                 *
                 * @param {quat} out quat receiving operation result
                 * @param {quat} a quat to rotate
                 * @param {number} rad angle (in radians) to rotate
                 * @returns {quat} out
                 */
                quat.rotateX = function (out, a, rad) {
                    rad *= 0.5;

                    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                        bx = Math.sin(rad), bw = Math.cos(rad);

                    out[0] = ax * bw + aw * bx;
                    out[1] = ay * bw + az * bx;
                    out[2] = az * bw - ay * bx;
                    out[3] = aw * bw - ax * bx;
                    return out;
                };

                /**
                 * Rotates a quaternion by the given angle about the Y axis
                 *
                 * @param {quat} out quat receiving operation result
                 * @param {quat} a quat to rotate
                 * @param {number} rad angle (in radians) to rotate
                 * @returns {quat} out
                 */
                quat.rotateY = function (out, a, rad) {
                    rad *= 0.5;

                    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                        by = Math.sin(rad), bw = Math.cos(rad);

                    out[0] = ax * bw - az * by;
                    out[1] = ay * bw + aw * by;
                    out[2] = az * bw + ax * by;
                    out[3] = aw * bw - ay * by;
                    return out;
                };

                /**
                 * Rotates a quaternion by the given angle about the Z axis
                 *
                 * @param {quat} out quat receiving operation result
                 * @param {quat} a quat to rotate
                 * @param {number} rad angle (in radians) to rotate
                 * @returns {quat} out
                 */
                quat.rotateZ = function (out, a, rad) {
                    rad *= 0.5;

                    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                        bz = Math.sin(rad), bw = Math.cos(rad);

                    out[0] = ax * bw + ay * bz;
                    out[1] = ay * bw - ax * bz;
                    out[2] = az * bw + aw * bz;
                    out[3] = aw * bw - az * bz;
                    return out;
                };

                /**
                 * Calculates the W component of a quat from the X, Y, and Z components.
                 * Assumes that quaternion is 1 unit in length.
                 * Any existing W component will be ignored.
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a quat to calculate W component of
                 * @returns {quat} out
                 */
                quat.calculateW = function (out, a) {
                    var x = a[0], y = a[1], z = a[2];

                    out[0] = x;
                    out[1] = y;
                    out[2] = z;
                    out[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
                    return out;
                };

                /**
                 * Calculates the dot product of two quat's
                 *
                 * @param {quat} a the first operand
                 * @param {quat} b the second operand
                 * @returns {Number} dot product of a and b
                 * @function
                 */
                quat.dot = vec4.dot;

                /**
                 * Performs a linear interpolation between two quat's
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a the first operand
                 * @param {quat} b the second operand
                 * @param {Number} t interpolation amount between the two inputs
                 * @returns {quat} out
                 * @function
                 */
                quat.lerp = vec4.lerp;

                /**
                 * Performs a spherical linear interpolation between two quat
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a the first operand
                 * @param {quat} b the second operand
                 * @param {Number} t interpolation amount between the two inputs
                 * @returns {quat} out
                 */
                quat.slerp = function (out, a, b, t) {
                    // benchmarks:
                    //    http://jsperf.com/quaternion-slerp-implementations

                    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                        bx = b[0], by = b[1], bz = b[2], bw = b[3];

                    var        omega, cosom, sinom, scale0, scale1;

                    // calc cosine
                    cosom = ax * bx + ay * by + az * bz + aw * bw;
                    // adjust signs (if necessary)
                    if ( cosom < 0.0 ) {
                        cosom = -cosom;
                        bx = - bx;
                        by = - by;
                        bz = - bz;
                        bw = - bw;
                    }
                    // calculate coefficients
                    if ( (1.0 - cosom) > 0.000001 ) {
                        // standard case (slerp)
                        omega  = Math.acos(cosom);
                        sinom  = Math.sin(omega);
                        scale0 = Math.sin((1.0 - t) * omega) / sinom;
                        scale1 = Math.sin(t * omega) / sinom;
                    } else {
                        // "from" and "to" quaternions are very close
                        //  ... so we can do a linear interpolation
                        scale0 = 1.0 - t;
                        scale1 = t;
                    }
                    // calculate final values
                    out[0] = scale0 * ax + scale1 * bx;
                    out[1] = scale0 * ay + scale1 * by;
                    out[2] = scale0 * az + scale1 * bz;
                    out[3] = scale0 * aw + scale1 * bw;

                    return out;
                };

                /**
                 * Calculates the inverse of a quat
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a quat to calculate inverse of
                 * @returns {quat} out
                 */
                quat.invert = function(out, a) {
                    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
                        invDot = dot ? 1.0/dot : 0;

                    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

                    out[0] = -a0*invDot;
                    out[1] = -a1*invDot;
                    out[2] = -a2*invDot;
                    out[3] = a3*invDot;
                    return out;
                };

                /**
                 * Calculates the conjugate of a quat
                 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a quat to calculate conjugate of
                 * @returns {quat} out
                 */
                quat.conjugate = function (out, a) {
                    out[0] = -a[0];
                    out[1] = -a[1];
                    out[2] = -a[2];
                    out[3] = a[3];
                    return out;
                };

                /**
                 * Calculates the length of a quat
                 *
                 * @param {quat} a vector to calculate length of
                 * @returns {Number} length of a
                 * @function
                 */
                quat.length = vec4.length;

                /**
                 * Alias for {@link quat.length}
                 * @function
                 */
                quat.len = quat.length;

                /**
                 * Calculates the squared length of a quat
                 *
                 * @param {quat} a vector to calculate squared length of
                 * @returns {Number} squared length of a
                 * @function
                 */
                quat.squaredLength = vec4.squaredLength;

                /**
                 * Alias for {@link quat.squaredLength}
                 * @function
                 */
                quat.sqrLen = quat.squaredLength;

                /**
                 * Normalize a quat
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {quat} a quaternion to normalize
                 * @returns {quat} out
                 * @function
                 */
                quat.normalize = vec4.normalize;

                /**
                 * Creates a quaternion from the given 3x3 rotation matrix.
                 *
                 * NOTE: The resultant quaternion is not normalized, so you should be sure
                 * to renormalize the quaternion yourself where necessary.
                 *
                 * @param {quat} out the receiving quaternion
                 * @param {mat3} m rotation matrix
                 * @returns {quat} out
                 * @function
                 */
                quat.fromMat3 = function(out, m) {
                    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
                    // article "Quaternion Calculus and Fast Animation".
                    var fTrace = m[0] + m[4] + m[8];
                    var fRoot;

                    if ( fTrace > 0.0 ) {
                        // |w| > 1/2, may as well choose w > 1/2
                        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
                        out[3] = 0.5 * fRoot;
                        fRoot = 0.5/fRoot;  // 1/(4w)
                        out[0] = (m[7]-m[5])*fRoot;
                        out[1] = (m[2]-m[6])*fRoot;
                        out[2] = (m[3]-m[1])*fRoot;
                    } else {
                        // |w| <= 1/2
                        var i = 0;
                        if ( m[4] > m[0] )
                            i = 1;
                        if ( m[8] > m[i*3+i] )
                            i = 2;
                        var j = (i+1)%3;
                        var k = (i+2)%3;

                        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
                        out[i] = 0.5 * fRoot;
                        fRoot = 0.5 / fRoot;
                        out[3] = (m[k*3+j] - m[j*3+k]) * fRoot;
                        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
                        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
                    }

                    return out;
                };

                /**
                 * Returns a string representation of a quatenion
                 *
                 * @param {quat} vec vector to represent as a string
                 * @returns {String} string representation of the vector
                 */
                quat.str = function (a) {
                    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
                };

                if(typeof(exports) !== 'undefined') {
                    exports.quat = quat;
                }
                ;













            })(shim.exports);
        })(this);

    },{}],17:[function(require,module,exports){
        var Pointable = require('./pointable'),
            glMatrix = require("gl-matrix")
            , vec3 = glMatrix.vec3
            , mat3 = glMatrix.mat3
            , mat4 = glMatrix.mat4
            , _ = require('underscore');


        var Bone = module.exports = function(finger, data) {
            this.finger = finger;

            this._center = null, this._matrix = null;

            /**
             * An integer code for the name of this bone.
             *
             * * 0 -- metacarpal
             * * 1 -- proximal
             * * 2 -- medial
             * * 3 -- distal
             * * 4 -- arm
             *
             * @member type
             * @type {number}
             * @memberof Leap.Bone.prototype
             */
            this.type = data.type;

            /**
             * The position of the previous, or base joint of the bone closer to the wrist.
             * @type {vector3}
             */
            this.prevJoint = data.prevJoint;

            /**
             * The position of the next joint, or the end of the bone closer to the finger tip.
             * @type {vector3}
             */
            this.nextJoint = data.nextJoint;

            /**
             * The estimated width of the tool in millimeters.
             *
             * The reported width is the average width of the visible portion of the
             * tool from the hand to the tip. If the width isn't known,
             * then a value of 0 is returned.
             *
             * Pointable objects representing fingers do not have a width property.
             *
             * @member width
             * @type {number}
             * @memberof Leap.Pointable.prototype
             */
            this.width = data.width;

            var displacement = new Array(3);
            vec3.sub(displacement, data.nextJoint, data.prevJoint);

            this.length = vec3.length(displacement);


            /**
             *
             * These fully-specify the orientation of the bone.
             * See examples/threejs-bones.html for more info
             * Three vec3s:
             *  x (red): The rotation axis of the finger, pointing outwards.  (In general, away from the thumb )
             *  y (green): The "up" vector, orienting the top of the finger
             *  z (blue): The roll axis of the bone.
             *
             *  Most up vectors will be pointing the same direction, except for the thumb, which is more rightwards.
             *
             *  The thumb has one fewer bones than the fingers, but there are the same number of joints & joint-bases provided
             *  the first two appear in the same position, but only the second (proximal) rotates.
             *
             *  Normalized.
             */
            this.basis = data.basis;
        };

        Bone.prototype.left = function(){

            if (this._left) return this._left;

            this._left =  mat3.determinant(this.basis[0].concat(this.basis[1]).concat(this.basis[2])) < 0;

            return this._left;

        };


        /**
         * The Affine transformation matrix describing the orientation of the bone, in global Leap-space.
         * It contains a 3x3 rotation matrix (in the "top left"), and center coordinates in the fourth column.
         *
         * Unlike the basis, the right and left hands have the same coordinate system.
         *
         */
        Bone.prototype.matrix = function(){

            if (this._matrix) return this._matrix;

            var b = this.basis,
                t = this._matrix = mat4.create();

            // open transform mat4 from rotation mat3
            t[0] = b[0][0], t[1] = b[0][1], t[2]  = b[0][2];
            t[4] = b[1][0], t[5] = b[1][1], t[6]  = b[1][2];
            t[8] = b[2][0], t[9] = b[2][1], t[10] = b[2][2];

            t[3] = this.center()[0];
            t[7] = this.center()[1];
            t[11] = this.center()[2];

            if ( this.left() ) {
                // flip the basis to be right-handed
                t[0] *= -1;
                t[1] *= -1;
                t[2] *= -1;
            }

            return this._matrix;
        };

        /**
         * Helper method to linearly interpolate between the two ends of the bone.
         *
         * when t = 0, the position of prevJoint will be returned
         * when t = 1, the position of nextJoint will be returned
         */
        Bone.prototype.lerp = function(out, t){

            vec3.lerp(out, this.prevJoint, this.nextJoint, t);

        };

        /**
         *
         * The center position of the bone
         * Returns a vec3 array.
         *
         */
        Bone.prototype.center = function(){

            if (this._center) return this._center;

            var center = vec3.create();
            this.lerp(center, 0.5);
            this._center = center;
            return center;

        };

// The negative of the z-basis
        Bone.prototype.direction = function(){

            return [
                this.basis[2][0] * -1,
                this.basis[2][1] * -1,
                this.basis[2][2] * -1
            ];

        };

    },{"./pointable":31,"gl-matrix":16,"underscore":37}],18:[function(require,module,exports){
        var CircularBuffer = module.exports = function(size) {
            this.pos = 0;
            this._buf = [];
            this.size = size;
        }

        CircularBuffer.prototype.get = function(i) {
            if (i == undefined) i = 0;
            if (i >= this.size) return undefined;
            if (i >= this._buf.length) return undefined;
            return this._buf[(this.pos - i - 1) % this.size];
        }

        CircularBuffer.prototype.push = function(o) {
            this._buf[this.pos % this.size] = o;
            return this.pos++;
        }

    },{}],19:[function(require,module,exports){
        var chooseProtocol = require('../protocol').chooseProtocol
            , EventEmitter = require('events').EventEmitter
            , _ = require('underscore');

        var BaseConnection = module.exports = function(opts) {
            this.opts = _.defaults(opts || {}, {
                host : '127.0.0.1',
                enableGestures: false,
                scheme: this.getScheme(),
                port: this.getPort(),
                background: false,
                optimizeHMD: false,
                requestProtocolVersion: BaseConnection.defaultProtocolVersion
            });
            this.host = this.opts.host;
            this.port = this.opts.port;
            this.scheme = this.opts.scheme;
            this.protocolVersionVerified = false;
            this.background = null;
            this.optimizeHMD = null;
            this.on('ready', function() {
                this.enableGestures(this.opts.enableGestures);
                this.setBackground(this.opts.background);
                this.setOptimizeHMD(this.opts.optimizeHMD);

                if (this.opts.optimizeHMD){
                    console.log("Optimized for head mounted display usage.");
                }else {
                    console.log("Optimized for desktop usage.");
                }

            });
        };

// The latest available:
        BaseConnection.defaultProtocolVersion = 6;

        BaseConnection.prototype.getUrl = function() {
            return this.scheme + "//" + this.host + ":" + this.port + "/v" + this.opts.requestProtocolVersion + ".json";
        }


        BaseConnection.prototype.getScheme = function(){
            return 'ws:'
        }

        BaseConnection.prototype.getPort = function(){
            return 6437
        }


        BaseConnection.prototype.setBackground = function(state) {
            this.opts.background = state;
            if (this.protocol && this.protocol.sendBackground && this.background !== this.opts.background) {
                this.background = this.opts.background;
                this.protocol.sendBackground(this, this.opts.background);
            }
        }

        BaseConnection.prototype.setOptimizeHMD = function(state) {
            this.opts.optimizeHMD = state;
            if (this.protocol && this.protocol.sendOptimizeHMD && this.optimizeHMD !== this.opts.optimizeHMD) {
                this.optimizeHMD = this.opts.optimizeHMD;
                this.protocol.sendOptimizeHMD(this, this.opts.optimizeHMD);
            }
        }

        BaseConnection.prototype.handleOpen = function() {
            if (!this.connected) {
                this.connected = true;
                this.emit('connect');
            }
        }

        BaseConnection.prototype.enableGestures = function(enabled) {
            this.gesturesEnabled = enabled ? true : false;
            this.send(this.protocol.encode({"enableGestures": this.gesturesEnabled}));
        }

        BaseConnection.prototype.handleClose = function(code, reason) {
            if (!this.connected) return;
            this.disconnect();

            // 1001 - an active connection is closed
            // 1006 - cannot connect
            if (code === 1001 && this.opts.requestProtocolVersion > 1) {
                if (this.protocolVersionVerified) {
                    this.protocolVersionVerified = false;
                }else{
                    this.opts.requestProtocolVersion--;
                }
            }
            this.startReconnection();
        }

        BaseConnection.prototype.startReconnection = function() {
            var connection = this;
            if(!this.reconnectionTimer){
                (this.reconnectionTimer = setInterval(function() { connection.reconnect() }, 500));
            }
        }

        BaseConnection.prototype.stopReconnection = function() {
            this.reconnectionTimer = clearInterval(this.reconnectionTimer);
        }

// By default, disconnect will prevent auto-reconnection.
// Pass in true to allow the reconnection loop not be interrupted continue
        BaseConnection.prototype.disconnect = function(allowReconnect) {
            if (!allowReconnect) this.stopReconnection();
            if (!this.socket) return;
            this.socket.close();
            delete this.socket;
            delete this.protocol;
            delete this.background; // This is not persisted when reconnecting to the web socket server
            delete this.optimizeHMD;
            delete this.focusedState;
            if (this.connected) {
                this.connected = false;
                this.emit('disconnect');
            }
            return true;
        }

        BaseConnection.prototype.reconnect = function() {
            if (this.connected) {
                this.stopReconnection();
            } else {
                this.disconnect(true);
                this.connect();
            }
        }

        BaseConnection.prototype.handleData = function(data) {
            var message = JSON.parse(data);

            var messageEvent;
            if (this.protocol === undefined) {
                messageEvent = this.protocol = chooseProtocol(message);
                this.protocolVersionVerified = true;
                this.emit('ready');
            } else {
                messageEvent = this.protocol(message);
            }
            this.emit(messageEvent.type, messageEvent);
        }

        BaseConnection.prototype.connect = function() {
            if (this.socket) return;
            this.socket = this.setupSocket();
            return true;
        }

        BaseConnection.prototype.send = function(data) {
            this.socket.send(data);
        }

        BaseConnection.prototype.reportFocus = function(state) {
            if (!this.connected || this.focusedState === state) return;
            this.focusedState = state;
            this.emit(this.focusedState ? 'focus' : 'blur');
            if (this.protocol && this.protocol.sendFocused) {
                this.protocol.sendFocused(this, this.focusedState);
            }
        }

        _.extend(BaseConnection.prototype, EventEmitter.prototype);
    },{"../protocol":32,"events":1,"underscore":37}],20:[function(require,module,exports){
        var BaseConnection = module.exports = require('./base')
            , _ = require('underscore');


        var BrowserConnection = module.exports = function(opts) {
            BaseConnection.call(this, opts);
            var connection = this;
            this.on('ready', function() { connection.startFocusLoop(); })
            this.on('disconnect', function() { connection.stopFocusLoop(); })
        }

        _.extend(BrowserConnection.prototype, BaseConnection.prototype);

        BrowserConnection.__proto__ = BaseConnection;

        BrowserConnection.prototype.useSecure = function(){
            return location.protocol === 'https:'
        }

        BrowserConnection.prototype.getScheme = function(){
            return this.useSecure() ? 'wss:' : 'ws:'
        }

        BrowserConnection.prototype.getPort = function(){
            return this.useSecure() ? 6436 : 6437
        }

        BrowserConnection.prototype.setupSocket = function() {
            var connection = this;
            var socket = new WebSocket(this.getUrl());
            socket.onopen = function() { connection.handleOpen(); };
            socket.onclose = function(data) { connection.handleClose(data['code'], data['reason']); };
            socket.onmessage = function(message) { connection.handleData(message.data) };
            socket.onerror = function(error) {

                // attempt to degrade to ws: after one failed attempt for older Leap Service installations.
                if (connection.useSecure() && connection.scheme === 'wss:'){
                    connection.scheme = 'ws:';
                    connection.port = 6437;
                    connection.disconnect();
                    connection.connect();
                }

            };
            return socket;
        }

        BrowserConnection.prototype.startFocusLoop = function() {
            if (this.focusDetectorTimer) return;
            var connection = this;
            var propertyName = null;
            if (typeof document.hidden !== "undefined") {
                propertyName = "hidden";
            } else if (typeof document.mozHidden !== "undefined") {
                propertyName = "mozHidden";
            } else if (typeof document.msHidden !== "undefined") {
                propertyName = "msHidden";
            } else if (typeof document.webkitHidden !== "undefined") {
                propertyName = "webkitHidden";
            } else {
                propertyName = undefined;
            }

            if (connection.windowVisible === undefined) {
                connection.windowVisible = propertyName === undefined ? true : document[propertyName] === false;
            }

            var focusListener = window.addEventListener('focus', function(e) {
                connection.windowVisible = true;
                updateFocusState();
            });

            var blurListener = window.addEventListener('blur', function(e) {
                connection.windowVisible = false;
                updateFocusState();
            });

            this.on('disconnect', function() {
                window.removeEventListener('focus', focusListener);
                window.removeEventListener('blur', blurListener);
            });

            var updateFocusState = function() {
                var isVisible = propertyName === undefined ? true : document[propertyName] === false;
                connection.reportFocus(isVisible && connection.windowVisible);
            }

            // save 100ms when resuming focus
            updateFocusState();

            this.focusDetectorTimer = setInterval(updateFocusState, 100);
        }

        BrowserConnection.prototype.stopFocusLoop = function() {
            if (!this.focusDetectorTimer) return;
            clearTimeout(this.focusDetectorTimer);
            delete this.focusDetectorTimer;
        }

    },{"./base":19,"underscore":37}],21:[function(require,module,exports){
        var WebSocket = require('ws')
            , BaseConnection = require('./base')
            , _ = require('underscore');

        var NodeConnection = module.exports = function(opts) {
            BaseConnection.call(this, opts);
            var connection = this;
            this.on('ready', function() { connection.reportFocus(true); });
        }

        _.extend(NodeConnection.prototype, BaseConnection.prototype);

        NodeConnection.__proto__ = BaseConnection;

        NodeConnection.prototype.setupSocket = function() {
            var connection = this;
            var socket = new WebSocket(this.getUrl());
            socket.on('open', function() { connection.handleOpen(); });
            socket.on('message', function(m) { connection.handleData(m); });
            socket.on('close', function(code, reason) { connection.handleClose(code, reason); });
            socket.on('error', function() { connection.startReconnection(); });
            return socket;
        }

    },{"./base":19,"underscore":37,"ws":38}],22:[function(require,module,exports){
        (function (process){
            var Frame = require('./frame')
                , Hand = require('./hand')
                , Pointable = require('./pointable')
                , Finger = require('./finger')
                , CircularBuffer = require("./circular_buffer")
                , Pipeline = require("./pipeline")
                , EventEmitter = require('events').EventEmitter
                , gestureListener = require('./gesture').gestureListener
                , Dialog = require('./dialog')
                , _ = require('underscore');

            /**
             * Constructs a Controller object.
             *
             * When creating a Controller object, you may optionally pass in options
             * to set the host , set the port, enable gestures, or select the frame event type.
             *
             * ```javascript
             * var controller = new Leap.Controller({
 *   host: '127.0.0.1',
 *   port: 6437,
 *   enableGestures: true,
 *   frameEventName: 'animationFrame'
 * });
             * ```
             *
             * @class Controller
             * @memberof Leap
             * @classdesc
             * The Controller class is your main interface to the Leap Motion Controller.
             *
             * Create an instance of this Controller class to access frames of tracking data
             * and configuration information. Frame data can be polled at any time using the
             * [Controller.frame]{@link Leap.Controller#frame}() function. Call frame() or frame(0) to get the most recent
             * frame. Set the history parameter to a positive integer to access previous frames.
             * A controller stores up to 60 frames in its frame history.
             *
             * Polling is an appropriate strategy for applications which already have an
             * intrinsic update loop, such as a game.
             *
             * loopWhileDisconnected defaults to true, and maintains a 60FPS frame rate even when Leap Motion is not streaming
             * data at that rate (such as no hands in frame).  This is important for VR/WebGL apps which rely on rendering for
             * regular visual updates, including from other input devices.  Flipping this to false should be considered an
             * optimization for very specific use-cases.
             *
             *
             */


            var Controller = module.exports = function(opts) {
                var inNode = (typeof(process) !== 'undefined' && process.versions && process.versions.node),
                    controller = this;

                opts = _.defaults(opts || {}, {
                    inNode: inNode
                });

                this.inNode = opts.inNode;

                opts = _.defaults(opts || {}, {
                    frameEventName: this.useAnimationLoop() ? 'animationFrame' : 'deviceFrame',
                    suppressAnimationLoop: !this.useAnimationLoop(),
                    loopWhileDisconnected: true,
                    useAllPlugins: false,
                    checkVersion: true
                });

                this.animationFrameRequested = false;
                this.onAnimationFrame = function(timestamp) {
                    if (controller.lastConnectionFrame.valid){
                        controller.emit('animationFrame', controller.lastConnectionFrame);
                    }
                    controller.emit('frameEnd', timestamp);
                    if (
                        controller.loopWhileDisconnected &&
                        ( ( controller.connection.focusedState !== false )  // loop while undefined, pre-ready.
                            || controller.connection.opts.background) ){
                        window.requestAnimationFrame(controller.onAnimationFrame);
                    }else{
                        controller.animationFrameRequested = false;
                    }
                };
                this.suppressAnimationLoop = opts.suppressAnimationLoop;
                this.loopWhileDisconnected = opts.loopWhileDisconnected;
                this.frameEventName = opts.frameEventName;
                this.useAllPlugins = opts.useAllPlugins;
                this.history = new CircularBuffer(200);
                this.lastFrame = Frame.Invalid;
                this.lastValidFrame = Frame.Invalid;
                this.lastConnectionFrame = Frame.Invalid;
                this.accumulatedGestures = [];
                this.checkVersion = opts.checkVersion;
                if (opts.connectionType === undefined) {
                    this.connectionType = (this.inBrowser() ? require('./connection/browser') : require('./connection/node'));
                } else {
                    this.connectionType = opts.connectionType;
                }
                this.connection = new this.connectionType(opts);
                this.streamingCount = 0;
                this.devices = {};
                this.plugins = {};
                this._pluginPipelineSteps = {};
                this._pluginExtendedMethods = {};
                if (opts.useAllPlugins) this.useRegisteredPlugins();
                this.setupFrameEvents(opts);
                this.setupConnectionEvents();

                this.startAnimationLoop(); // immediately when started
            }

            Controller.prototype.gesture = function(type, cb) {
                var creator = gestureListener(this, type);
                if (cb !== undefined) {
                    creator.stop(cb);
                }
                return creator;
            }

            /*
 * @returns the controller
 */
            Controller.prototype.setBackground = function(state) {
                this.connection.setBackground(state);
                return this;
            }

            Controller.prototype.setOptimizeHMD = function(state) {
                this.connection.setOptimizeHMD(state);
                return this;
            }

            Controller.prototype.inBrowser = function() {
                return !this.inNode;
            }

            Controller.prototype.useAnimationLoop = function() {
                return this.inBrowser() && !this.inBackgroundPage();
            }

            Controller.prototype.inBackgroundPage = function(){
                // http://developer.chrome.com/extensions/extension#method-getBackgroundPage
                return (typeof(chrome) !== "undefined") &&
                    chrome.extension &&
                    chrome.extension.getBackgroundPage &&
                    (chrome.extension.getBackgroundPage() === window)
            }

            /*
 * @returns the controller
 */
            Controller.prototype.connect = function() {
                this.connection.connect();
                return this;
            }

            Controller.prototype.streaming = function() {
                return this.streamingCount > 0;
            }

            Controller.prototype.connected = function() {
                return !!this.connection.connected;
            }

            Controller.prototype.startAnimationLoop = function(){
                if (!this.suppressAnimationLoop && !this.animationFrameRequested) {
                    this.animationFrameRequested = true;
                    window.requestAnimationFrame(this.onAnimationFrame);
                }
            }

            /*
 * @returns the controller
 */
            Controller.prototype.disconnect = function() {
                this.connection.disconnect();
                return this;
            }

            /**
             * Returns a frame of tracking data from the Leap.
             *
             * Use the optional history parameter to specify which frame to retrieve.
             * Call frame() or frame(0) to access the most recent frame; call frame(1) to
             * access the previous frame, and so on. If you use a history value greater
             * than the number of stored frames, then the controller returns an invalid frame.
             *
             * @method frame
             * @memberof Leap.Controller.prototype
             * @param {number} history The age of the frame to return, counting backwards from
             * the most recent frame (0) into the past and up to the maximum age (59).
             * @returns {Leap.Frame} The specified frame; or, if no history
             * parameter is specified, the newest frame. If a frame is not available at
             * the specified history position, an invalid Frame is returned.
             **/
            Controller.prototype.frame = function(num) {
                return this.history.get(num) || Frame.Invalid;
            }

            Controller.prototype.loop = function(callback) {
                if (callback) {
                    if (typeof callback === 'function'){
                        this.on(this.frameEventName, callback);
                    }else{
                        // callback is actually of the form: {eventName: callback}
                        this.setupFrameEvents(callback);
                    }
                }

                return this.connect();
            }

            Controller.prototype.addStep = function(step) {
                if (!this.pipeline) this.pipeline = new Pipeline(this);
                this.pipeline.addStep(step);
            }

// this is run on every deviceFrame
            Controller.prototype.processFrame = function(frame) {
                if (frame.gestures) {
                    this.accumulatedGestures = this.accumulatedGestures.concat(frame.gestures);
                }
                // lastConnectionFrame is used by the animation loop
                this.lastConnectionFrame = frame;
                this.startAnimationLoop(); // Only has effect if loopWhileDisconnected: false
                this.emit('deviceFrame', frame);
            }

// on a this.deviceEventName (usually 'animationFrame' in browsers), this emits a 'frame'
            Controller.prototype.processFinishedFrame = function(frame) {
                this.lastFrame = frame;
                if (frame.valid) {
                    this.lastValidFrame = frame;
                }
                frame.controller = this;
                frame.historyIdx = this.history.push(frame);
                if (frame.gestures) {
                    frame.gestures = this.accumulatedGestures;
                    this.accumulatedGestures = [];
                    for (var gestureIdx = 0; gestureIdx != frame.gestures.length; gestureIdx++) {
                        this.emit("gesture", frame.gestures[gestureIdx], frame);
                    }
                }
                if (this.pipeline) {
                    frame = this.pipeline.run(frame);
                    if (!frame) frame = Frame.Invalid;
                }
                this.emit('frame', frame);
                this.emitHandEvents(frame);
            }

            /**
             * The controller will emit 'hand' events for every hand on each frame.  The hand in question will be passed
             * to the event callback.
             *
             * @param frame
             */
            Controller.prototype.emitHandEvents = function(frame){
                for (var i = 0; i < frame.hands.length; i++){
                    this.emit('hand', frame.hands[i]);
                }
            }

            Controller.prototype.setupFrameEvents = function(opts){
                if (opts.frame){
                    this.on('frame', opts.frame);
                }
                if (opts.hand){
                    this.on('hand', opts.hand);
                }
            }

            /**
             Controller events.  The old 'deviceConnected' and 'deviceDisconnected' have been depricated -
             use 'deviceStreaming' and 'deviceStopped' instead, except in the case of an unexpected disconnect.

             There are 4 pairs of device events recently added/changed:
             -deviceAttached/deviceRemoved - called when a device's physical connection to the computer changes
             -deviceStreaming/deviceStopped - called when a device is paused or resumed.
             -streamingStarted/streamingStopped - called when there is/is no longer at least 1 streaming device.
             Always comes after deviceStreaming.

             The first of all of the above event pairs is triggered as appropriate upon connection.  All of
             these events receives an argument with the most recent info about the device that triggered it.
             These events will always be fired in the order they are listed here, with reverse ordering for the
             matching shutdown call. (ie, deviceStreaming always comes after deviceAttached, and deviceStopped
             will come before deviceRemoved).

             -deviceConnected/deviceDisconnected - These are considered deprecated and will be removed in
             the next revision.  In contrast to the other events and in keeping with it's original behavior,
             it will only be fired when a device begins streaming AFTER a connection has been established.
             It is not paired, and receives no device info.  Nearly identical functionality to
             streamingStarted/Stopped if you need to port.
             */
            Controller.prototype.setupConnectionEvents = function() {
                var controller = this;
                this.connection.on('frame', function(frame) {
                    controller.processFrame(frame);
                });
                // either deviceFrame or animationFrame:
                this.on(this.frameEventName, function(frame) {
                    controller.processFinishedFrame(frame);
                });


                // here we backfill the 0.5.0 deviceEvents as best possible
                // backfill begin streaming events
                var backfillStreamingStartedEventsHandler = function(){
                    if (controller.connection.opts.requestProtocolVersion < 5 && controller.streamingCount == 0){
                        controller.streamingCount = 1;
                        var info = {
                            attached: true,
                            streaming: true,
                            type: 'unknown',
                            id: "Lx00000000000"
                        };
                        controller.devices[info.id] = info;

                        controller.emit('deviceAttached', info);
                        controller.emit('deviceStreaming', info);
                        controller.emit('streamingStarted', info);
                        controller.connection.removeListener('frame', backfillStreamingStartedEventsHandler)
                    }
                }

                var backfillStreamingStoppedEvents = function(){
                    if (controller.streamingCount > 0) {
                        for (var deviceId in controller.devices){
                            controller.emit('deviceStopped', controller.devices[deviceId]);
                            controller.emit('deviceRemoved', controller.devices[deviceId]);
                        }
                        // only emit streamingStopped once, with the last device
                        controller.emit('streamingStopped', controller.devices[deviceId]);

                        controller.streamingCount = 0;

                        for (var deviceId in controller.devices){
                            delete controller.devices[deviceId];
                        }
                    }
                }
                // Delegate connection events
                this.connection.on('focus', function() {

                    if ( controller.loopWhileDisconnected ){

                        controller.startAnimationLoop();

                    }

                    controller.emit('focus');

                });
                this.connection.on('blur', function() { controller.emit('blur') });
                this.connection.on('protocol', function(protocol) {

                    protocol.on('beforeFrameCreated', function(frameData){
                        controller.emit('beforeFrameCreated', frameData)
                    });

                    protocol.on('afterFrameCreated', function(frame, frameData){
                        controller.emit('afterFrameCreated', frame, frameData)
                    });

                    controller.emit('protocol', protocol);
                });

                this.connection.on('ready', function() {

                    if (controller.checkVersion && !controller.inNode){
                        // show dialog only to web users
                        controller.checkOutOfDate();
                    }

                    controller.emit('ready');
                });

                this.connection.on('connect', function() {
                    controller.emit('connect');
                    controller.connection.removeListener('frame', backfillStreamingStartedEventsHandler)
                    controller.connection.on('frame', backfillStreamingStartedEventsHandler);
                });

                this.connection.on('disconnect', function() {
                    controller.emit('disconnect');
                    backfillStreamingStoppedEvents();
                });

                // this does not fire when the controller is manually disconnected
                // or for Leap Service v1.2.0+
                this.connection.on('deviceConnect', function(evt) {
                    if (evt.state){
                        controller.emit('deviceConnected');
                        controller.connection.removeListener('frame', backfillStreamingStartedEventsHandler)
                        controller.connection.on('frame', backfillStreamingStartedEventsHandler);
                    }else{
                        controller.emit('deviceDisconnected');
                        backfillStreamingStoppedEvents();
                    }
                });

                // Does not fire for Leap Service pre v1.2.0
                this.connection.on('deviceEvent', function(evt) {
                    var info = evt.state,
                        oldInfo = controller.devices[info.id];

                    //Grab a list of changed properties in the device info
                    var changed = {};
                    for(var property in info) {
                        //If a property i doesn't exist the cache, or has changed...
                        if( !oldInfo || !oldInfo.hasOwnProperty(property) || oldInfo[property] != info[property] ) {
                            changed[property] = true;
                        }
                    }

                    //Update the device list
                    controller.devices[info.id] = info;

                    //Fire events based on change list
                    if(changed.attached) {
                        controller.emit(info.attached ? 'deviceAttached' : 'deviceRemoved', info);
                    }

                    if(!changed.streaming) return;

                    if(info.streaming) {
                        controller.streamingCount++;
                        controller.emit('deviceStreaming', info);
                        if( controller.streamingCount == 1 ) {
                            controller.emit('streamingStarted', info);
                        }
                        //if attached & streaming both change to true at the same time, that device was streaming
                        //already when we connected.
                        if(!changed.attached) {
                            controller.emit('deviceConnected');
                        }
                    }
                    //Since when devices are attached all fields have changed, don't send events for streaming being false.
                    else if(!(changed.attached && info.attached)) {
                        controller.streamingCount--;
                        controller.emit('deviceStopped', info);
                        if(controller.streamingCount == 0){
                            controller.emit('streamingStopped', info);
                        }
                        controller.emit('deviceDisconnected');
                    }

                });


                this.on('newListener', function(event, listener) {
                    if( event == 'deviceConnected' || event == 'deviceDisconnected' ) {
                        console.warn(event + " events are depricated.  Consider using 'streamingStarted/streamingStopped' or 'deviceStreaming/deviceStopped' instead");
                    }
                });

            };




// Checks if the protocol version is the latest, if if not, shows the dialog.
            Controller.prototype.checkOutOfDate = function(){
                console.assert(this.connection && this.connection.protocol);

                var serviceVersion = this.connection.protocol.serviceVersion;
                var protocolVersion = this.connection.protocol.version;
                var defaultProtocolVersion = this.connectionType.defaultProtocolVersion;

                if (defaultProtocolVersion > protocolVersion){

                    console.warn("Your Protocol Version is v" + protocolVersion +
                        ", this app was designed for v" + defaultProtocolVersion);

                    Dialog.warnOutOfDate({
                        sV: serviceVersion,
                        pV: protocolVersion
                    });
                    return true
                }else{
                    return false
                }

            };



            Controller._pluginFactories = {};

            /*
 * Registers a plugin, making is accessible to controller.use later on.
 *
 * @member plugin
 * @memberof Leap.Controller.prototype
 * @param {String} name The name of the plugin (usually camelCase).
 * @param {function} factory A factory method which will return an instance of a plugin.
 * The factory receives an optional hash of options, passed in via controller.use.
 *
 * Valid keys for the object include frame, hand, finger, tool, and pointable.  The value
 * of each key can be either a function or an object.  If given a function, that function
 * will be called once for every instance of the object, with that instance injected as an
 * argument.  This allows decoration of objects with additional data:
 *
 * ```javascript
 * Leap.Controller.plugin('testPlugin', function(options){
 *   return {
 *     frame: function(frame){
 *       frame.foo = 'bar';
 *     }
 *   }
 * });
 * ```
 *
 * When hand is used, the callback is called for every hand in `frame.hands`.  Note that
 * hand objects are recreated with every new frame, so that data saved on the hand will not
 * persist.
 *
 * ```javascript
 * Leap.Controller.plugin('testPlugin', function(){
 *   return {
 *     hand: function(hand){
 *       console.log('testPlugin running on hand ' + hand.id);
 *     }
 *   }
 * });
 * ```
 *
 * A factory can return an object to add custom functionality to Frames, Hands, or Pointables.
 * The methods are added directly to the object's prototype.  Finger and Tool cannot be used here, Pointable
 * must be used instead.
 * This is encouraged for calculations which may not be necessary on every frame.
 * Memoization is also encouraged, for cases where the method may be called many times per frame by the application.
 *
 * ```javascript
 * // This plugin allows hand.usefulData() to be called later.
 * Leap.Controller.plugin('testPlugin', function(){
 *   return {
 *     hand: {
 *       usefulData: function(){
 *         console.log('usefulData on hand', this.id);
 *         // memoize the results on to the hand, preventing repeat work:
 *         this.x || this.x = someExpensiveCalculation();
 *         return this.x;
 *       }
 *     }
 *   }
 * });
 *
 * Note that the factory pattern allows encapsulation for every plugin instance.
 *
 * ```javascript
 * Leap.Controller.plugin('testPlugin', function(options){
 *   options || options = {}
 *   options.center || options.center = [0,0,0]
 *
 *   privatePrintingMethod = function(){
 *     console.log('privatePrintingMethod - options', options);
 *   }
 *
 *   return {
 *     pointable: {
 *       publicPrintingMethod: function(){
 *         privatePrintingMethod();
 *       }
 *     }
 *   }
 * });
 *
 */
            Controller.plugin = function(pluginName, factory) {
                if (this._pluginFactories[pluginName]) {
                    console.warn("Plugin \"" + pluginName + "\" already registered");
                }
                return this._pluginFactories[pluginName] = factory;
            };

            /*
 * Returns a list of registered plugins.
 * @returns {Array} Plugin Factories.
 */
            Controller.plugins = function() {
                return _.keys(this._pluginFactories);
            };



            var setPluginCallbacks = function(pluginName, type, callback){

                if ( ['beforeFrameCreated', 'afterFrameCreated'].indexOf(type) != -1 ){

                    // todo - not able to "unuse" a plugin currently
                    this.on(type, callback);

                }else {

                    if (!this.pipeline) this.pipeline = new Pipeline(this);

                    if (!this._pluginPipelineSteps[pluginName]) this._pluginPipelineSteps[pluginName] = [];

                    this._pluginPipelineSteps[pluginName].push(

                        this.pipeline.addWrappedStep(type, callback)

                    );

                }

            };

            var setPluginMethods = function(pluginName, type, hash){
                var klass;

                if (!this._pluginExtendedMethods[pluginName]) this._pluginExtendedMethods[pluginName] = [];

                switch (type) {
                    case 'frame':
                        klass = Frame;
                        break;
                    case 'hand':
                        klass = Hand;
                        break;
                    case 'pointable':
                        klass = Pointable;
                        _.extend(Finger.prototype, hash);
                        _.extend(Finger.Invalid,   hash);
                        break;
                    case 'finger':
                        klass = Finger;
                        break;
                    default:
                        throw pluginName + ' specifies invalid object type "' + type + '" for prototypical extension'
                }

                _.extend(klass.prototype, hash);
                _.extend(klass.Invalid, hash);
                this._pluginExtendedMethods[pluginName].push([klass, hash])

            }



            /*
 * Begin using a registered plugin.  The plugin's functionality will be added to all frames
 * returned by the controller (and/or added to the objects within the frame).
 *  - The order of plugin execution inside the loop will match the order in which use is called by the application.
 *  - The plugin be run for both deviceFrames and animationFrames.
 *
 *  If called a second time, the options will be merged with those of the already instantiated plugin.
 *
 * @method use
 * @memberOf Leap.Controller.prototype
 * @param pluginName
 * @param {Hash} Options to be passed to the plugin's factory.
 * @returns the controller
 */
            Controller.prototype.use = function(pluginName, options) {
                var functionOrHash, pluginFactory, key, pluginInstance;

                pluginFactory = (typeof pluginName == 'function') ? pluginName : Controller._pluginFactories[pluginName];

                if (!pluginFactory) {
                    throw 'Leap Plugin ' + pluginName + ' not found.';
                }

                options || (options = {});

                if (this.plugins[pluginName]){
                    _.extend(this.plugins[pluginName], options);
                    return this;
                }

                this.plugins[pluginName] = options;

                pluginInstance = pluginFactory.call(this, options);

                for (key in pluginInstance) {

                    functionOrHash = pluginInstance[key];

                    if (typeof functionOrHash === 'function') {

                        setPluginCallbacks.call(this, pluginName, key, functionOrHash);

                    } else {

                        setPluginMethods.call(this, pluginName, key, functionOrHash);

                    }

                }

                return this;
            };




            /*
 * Stop using a used plugin.  This will remove any of the plugin's pipeline methods (those called on every frame)
 * and remove any methods which extend frame-object prototypes.
 *
 * @method stopUsing
 * @memberOf Leap.Controller.prototype
 * @param pluginName
 * @returns the controller
 */
            Controller.prototype.stopUsing = function (pluginName) {
                var steps = this._pluginPipelineSteps[pluginName],
                    extMethodHashes = this._pluginExtendedMethods[pluginName],
                    i = 0, klass, extMethodHash;

                if (!this.plugins[pluginName]) return;

                if (steps) {
                    for (i = 0; i < steps.length; i++) {
                        this.pipeline.removeStep(steps[i]);
                    }
                }

                if (extMethodHashes){
                    for (i = 0; i < extMethodHashes.length; i++){
                        klass = extMethodHashes[i][0];
                        extMethodHash = extMethodHashes[i][1];
                        for (var methodName in extMethodHash) {
                            delete klass.prototype[methodName];
                            delete klass.Invalid[methodName];
                        }
                    }
                }

                delete this.plugins[pluginName];

                return this;
            }

            Controller.prototype.useRegisteredPlugins = function(){
                for (var plugin in Controller._pluginFactories){
                    this.use(plugin);
                }
            }


            _.extend(Controller.prototype, EventEmitter.prototype);

        }).call(this,require('_process'))
    },{"./circular_buffer":18,"./connection/browser":20,"./connection/node":21,"./dialog":23,"./finger":24,"./frame":25,"./gesture":26,"./hand":27,"./pipeline":30,"./pointable":31,"_process":2,"events":1,"underscore":37}],23:[function(require,module,exports){
        (function (process){
            var Dialog = module.exports = function(message, options){
                this.options = (options || {});
                this.message = message;

                this.createElement();
            };

            Dialog.prototype.createElement = function(){
                this.element = document.createElement('div');
                this.element.className = "leapjs-dialog";
                this.element.style.position = "fixed";
                this.element.style.top = '8px';
                this.element.style.left = 0;
                this.element.style.right = 0;
                this.element.style.textAlign = 'center';
                this.element.style.zIndex = 1000;

                var dialog  = document.createElement('div');
                this.element.appendChild(dialog);
                dialog.style.className = "leapjs-dialog";
                dialog.style.display = "inline-block";
                dialog.style.margin = "auto";
                dialog.style.padding = "8px";
                dialog.style.color = "#222";
                dialog.style.background = "#eee";
                dialog.style.borderRadius = "4px";
                dialog.style.border = "1px solid #999";
                dialog.style.textAlign = "left";
                dialog.style.cursor = "pointer";
                dialog.style.whiteSpace = "nowrap";
                dialog.style.transition = "box-shadow 1s linear";
                dialog.innerHTML = this.message;


                if (this.options.onclick){
                    dialog.addEventListener('click', this.options.onclick);
                }

                if (this.options.onmouseover){
                    dialog.addEventListener('mouseover', this.options.onmouseover);
                }

                if (this.options.onmouseout){
                    dialog.addEventListener('mouseout', this.options.onmouseout);
                }

                if (this.options.onmousemove){
                    dialog.addEventListener('mousemove', this.options.onmousemove);
                }
            };

            Dialog.prototype.show = function(){
                document.body.appendChild(this.element);
                return this;
            };

            Dialog.prototype.hide = function(){
                document.body.removeChild(this.element);
                return this;
            };




// Shows a DOM dialog box with links to developer.leapmotion.com to upgrade
// This will work whether or not the Leap is plugged in,
// As long as it is called after a call to .connect() and the 'ready' event has fired.
            Dialog.warnOutOfDate = function(params){
                params || (params = {});

                var url = "http://developer.leapmotion.com?";

                params.returnTo = window.location.href;

                for (var key in params){
                    url += key + '=' + encodeURIComponent(params[key]) + '&';
                }

                var dialog,
                    onclick = function(event){

                        if (event.target.id != 'leapjs-decline-upgrade'){

                            var popup = window.open(url,
                                '_blank',
                                'height=800,width=1000,location=1,menubar=1,resizable=1,status=1,toolbar=1,scrollbars=1'
                            );

                            if (window.focus) {popup.focus()}

                        }

                        dialog.hide();

                        return true;
                    },


                    message = "This site requires Leap Motion Tracking V2." +
                        "<button id='leapjs-accept-upgrade'  style='color: #444; transition: box-shadow 100ms linear; cursor: pointer; vertical-align: baseline; margin-left: 16px;'>Upgrade</button>" +
                        "<button id='leapjs-decline-upgrade' style='color: #444; transition: box-shadow 100ms linear; cursor: pointer; vertical-align: baseline; margin-left: 8px; '>Not Now</button>";

                dialog = new Dialog(message, {
                        onclick: onclick,
                        onmousemove: function(e){
                            if (e.target == document.getElementById('leapjs-decline-upgrade')){
                                document.getElementById('leapjs-decline-upgrade').style.color = '#000';
                                document.getElementById('leapjs-decline-upgrade').style.boxShadow = '0px 0px 2px #5daa00';

                                document.getElementById('leapjs-accept-upgrade').style.color = '#444';
                                document.getElementById('leapjs-accept-upgrade').style.boxShadow = 'none';
                            }else{
                                document.getElementById('leapjs-accept-upgrade').style.color = '#000';
                                document.getElementById('leapjs-accept-upgrade').style.boxShadow = '0px 0px 2px #5daa00';

                                document.getElementById('leapjs-decline-upgrade').style.color = '#444';
                                document.getElementById('leapjs-decline-upgrade').style.boxShadow = 'none';
                            }
                        },
                        onmouseout: function(){
                            document.getElementById('leapjs-decline-upgrade').style.color = '#444';
                            document.getElementById('leapjs-decline-upgrade').style.boxShadow = 'none';
                            document.getElementById('leapjs-accept-upgrade').style.color = '#444';
                            document.getElementById('leapjs-accept-upgrade').style.boxShadow = 'none';
                        }
                    }
                );

                return dialog.show();
            };


// Tracks whether we've warned for lack of bones API.  This will be shown only for early private-beta members.
            Dialog.hasWarnedBones = false;

            Dialog.warnBones = function(){
                if (this.hasWarnedBones) return;
                this.hasWarnedBones = true;

                console.warn("Your Leap Service is out of date");

                if ( !(typeof(process) !== 'undefined' && process.versions && process.versions.node) ){
                    this.warnOutOfDate({reason: 'bones'});
                }

            }
        }).call(this,require('_process'))
    },{"_process":2}],24:[function(require,module,exports){
        var Pointable = require('./pointable'),
            Bone = require('./bone')
            , Dialog = require('./dialog')
            , _ = require('underscore');

        /**
         * Constructs a Finger object.
         *
         * An uninitialized finger is considered invalid.
         * Get valid Finger objects from a Frame or a Hand object.
         *
         * @class Finger
         * @memberof Leap
         * @classdesc
         * The Finger class reports the physical characteristics of a finger.
         *
         * Both fingers and tools are classified as Pointable objects. Use the
         * Pointable.tool property to determine whether a Pointable object represents a
         * tool or finger. The Leap classifies a detected entity as a tool when it is
         * thinner, straighter, and longer than a typical finger.
         *
         * Note that Finger objects can be invalid, which means that they do not
         * contain valid tracking data and do not correspond to a physical entity.
         * Invalid Finger objects can be the result of asking for a Finger object
         * using an ID from an earlier frame when no Finger objects with that ID
         * exist in the current frame. A Finger object created from the Finger
         * constructor is also invalid. Test for validity with the Pointable.valid
         * property.
         */
        var Finger = module.exports = function(data) {
            Pointable.call(this, data); // use pointable as super-constructor

            /**
             * The position of the distal interphalangeal joint of the finger.
             * This joint is closest to the tip.
             *
             * The distal interphalangeal joint is located between the most extreme segment
             * of the finger (the distal phalanx) and the middle segment (the medial
             * phalanx).
             *
             * @member dipPosition
             * @type {number[]}
             * @memberof Leap.Finger.prototype
             */
            this.dipPosition = data.dipPosition;

            /**
             * The position of the proximal interphalangeal joint of the finger. This joint is the middle
             * joint of a finger.
             *
             * The proximal interphalangeal joint is located between the two finger segments
             * closest to the hand (the proximal and the medial phalanges). On a thumb,
             * which lacks an medial phalanx, this joint index identifies the knuckle joint
             * between the proximal phalanx and the metacarpal bone.
             *
             * @member pipPosition
             * @type {number[]}
             * @memberof Leap.Finger.prototype
             */
            this.pipPosition = data.pipPosition;

            /**
             * The position of the metacarpopophalangeal joint, or knuckle, of the finger.
             *
             * The metacarpopophalangeal joint is located at the base of a finger between
             * the metacarpal bone and the first phalanx. The common name for this joint is
             * the knuckle.
             *
             * On a thumb, which has one less phalanx than a finger, this joint index
             * identifies the thumb joint near the base of the hand, between the carpal
             * and metacarpal bones.
             *
             * @member mcpPosition
             * @type {number[]}
             * @memberof Leap.Finger.prototype
             */
            this.mcpPosition = data.mcpPosition;

            /**
             * The position of the Carpometacarpal joint
             *
             * This is at the distal end of the wrist, and has no common name.
             *
             */
            this.carpPosition = data.carpPosition;

            /**
             * Whether or not this finger is in an extended posture.
             *
             * A finger is considered extended if it is extended straight from the hand as if
             * pointing. A finger is not extended when it is bent down and curled towards the
             * palm.
             * @member extended
             * @type {Boolean}
             * @memberof Leap.Finger.prototype
             */
            this.extended = data.extended;

            /**
             * An integer code for the name of this finger.
             *
             * * 0 -- thumb
             * * 1 -- index finger
             * * 2 -- middle finger
             * * 3 -- ring finger
             * * 4 -- pinky
             *
             * @member type
             * @type {number}
             * @memberof Leap.Finger.prototype
             */
            this.type = data.type;

            this.finger = true;

            /**
             * The joint positions of this finger as an array in the order base to tip.
             *
             * @member positions
             * @type {array[]}
             * @memberof Leap.Finger.prototype
             */
            this.positions = [this.carpPosition, this.mcpPosition, this.pipPosition, this.dipPosition, this.tipPosition];

            if (data.bases){
                this.addBones(data);
            } else {
                Dialog.warnBones();
            }

        };

        _.extend(Finger.prototype, Pointable.prototype);


        Finger.prototype.addBones = function(data){
            /**
             * Four bones per finger, from wrist outwards:
             * metacarpal, proximal, medial, and distal.
             *
             * See http://en.wikipedia.org/wiki/Interphalangeal_articulations_of_hand
             */
            this.metacarpal   = new Bone(this, {
                type: 0,
                width: this.width,
                prevJoint: this.carpPosition,
                nextJoint: this.mcpPosition,
                basis: data.bases[0]
            });

            this.proximal     = new Bone(this, {
                type: 1,
                width: this.width,
                prevJoint: this.mcpPosition,
                nextJoint: this.pipPosition,
                basis: data.bases[1]
            });

            this.medial = new Bone(this, {
                type: 2,
                width: this.width,
                prevJoint: this.pipPosition,
                nextJoint: this.dipPosition,
                basis: data.bases[2]
            });

            /**
             * Note that the `distal.nextJoint` position is slightly different from the `finger.tipPosition`.
             * The former is at the very end of the bone, where the latter is the center of a sphere positioned at
             * the tip of the finger.  The btipPosition "bone tip position" is a few mm closer to the wrist than
             * the tipPosition.
             * @type {Bone}
             */
            this.distal       = new Bone(this, {
                type: 3,
                width: this.width,
                prevJoint: this.dipPosition,
                nextJoint: data.btipPosition,
                basis: data.bases[3]
            });

            this.bones = [this.metacarpal, this.proximal, this.medial, this.distal];
        };

        Finger.prototype.toString = function() {
            return "Finger [ id:" + this.id + " " + this.length + "mmx | width:" + this.width + "mm | direction:" + this.direction + ' ]';
        };

        Finger.Invalid = { valid: false };

    },{"./bone":17,"./dialog":23,"./pointable":31,"underscore":37}],25:[function(require,module,exports){
        var Hand = require("./hand")
            , Pointable = require("./pointable")
            , createGesture = require("./gesture").createGesture
            , glMatrix = require("gl-matrix")
            , mat3 = glMatrix.mat3
            , vec3 = glMatrix.vec3
            , InteractionBox = require("./interaction_box")
            , Finger = require('./finger')
            , _ = require("underscore");

        /**
         * Constructs a Frame object.
         *
         * Frame instances created with this constructor are invalid.
         * Get valid Frame objects by calling the
         * [Controller.frame]{@link Leap.Controller#frame}() function.
         *<C-D-Space>
         * @class Frame
         * @memberof Leap
         * @classdesc
         * The Frame class represents a set of hand and finger tracking data detected
         * in a single frame.
         *
         * The Leap detects hands, fingers and tools within the tracking area, reporting
         * their positions, orientations and motions in frames at the Leap frame rate.
         *
         * Access Frame objects using the [Controller.frame]{@link Leap.Controller#frame}() function.
         */
        var Frame = module.exports = function(data) {
            /**
             * Reports whether this Frame instance is valid.
             *
             * A valid Frame is one generated by the Controller object that contains
             * tracking data for all detected entities. An invalid Frame contains no
             * actual tracking data, but you can call its functions without risk of a
             * undefined object exception. The invalid Frame mechanism makes it more
             * convenient to track individual data across the frame history. For example,
             * you can invoke:
             *
             * ```javascript
             * var finger = controller.frame(n).finger(fingerID);
             * ```
             *
             * for an arbitrary Frame history value, "n", without first checking whether
             * frame(n) returned a null object. (You should still check that the
             * returned Finger instance is valid.)
             *
             * @member valid
             * @memberof Leap.Frame.prototype
             * @type {Boolean}
             */
            this.valid = true;
            /**
             * A unique ID for this Frame. Consecutive frames processed by the Leap
             * have consecutive increasing values.
             * @member id
             * @memberof Leap.Frame.prototype
             * @type {String}
             */
            this.id = data.id;
            /**
             * The frame capture time in microseconds elapsed since the Leap started.
             * @member timestamp
             * @memberof Leap.Frame.prototype
             * @type {number}
             */
            this.timestamp = data.timestamp;
            /**
             * The list of Hand objects detected in this frame, given in arbitrary order.
             * The list can be empty if no hands are detected.
             *
             * @member hands[]
             * @memberof Leap.Frame.prototype
             * @type {Leap.Hand}
             */
            this.hands = [];
            this.handsMap = {};
            /**
             * The list of Pointable objects (fingers and tools) detected in this frame,
             * given in arbitrary order. The list can be empty if no fingers or tools are
             * detected.
             *
             * @member pointables[]
             * @memberof Leap.Frame.prototype
             * @type {Leap.Pointable}
             */
            this.pointables = [];
            /**
             * The list of Tool objects detected in this frame, given in arbitrary order.
             * The list can be empty if no tools are detected.
             *
             * @member tools[]
             * @memberof Leap.Frame.prototype
             * @type {Leap.Pointable}
             */
            this.tools = [];
            /**
             * The list of Finger objects detected in this frame, given in arbitrary order.
             * The list can be empty if no fingers are detected.
             * @member fingers[]
             * @memberof Leap.Frame.prototype
             * @type {Leap.Pointable}
             */
            this.fingers = [];

            /**
             * The InteractionBox associated with the current frame.
             *
             * @member interactionBox
             * @memberof Leap.Frame.prototype
             * @type {Leap.InteractionBox}
             */
            if (data.interactionBox) {
                this.interactionBox = new InteractionBox(data.interactionBox);
            }
            this.gestures = [];
            this.pointablesMap = {};
            this._translation = data.t;
            this._rotation = _.flatten(data.r);
            this._scaleFactor = data.s;
            this.data = data;
            this.type = 'frame'; // used by event emitting
            this.currentFrameRate = data.currentFrameRate;

            if (data.gestures) {
                /**
                 * The list of Gesture objects detected in this frame, given in arbitrary order.
                 * The list can be empty if no gestures are detected.
                 *
                 * Circle and swipe gestures are updated every frame. Tap gestures
                 * only appear in the list for a single frame.
                 * @member gestures[]
                 * @memberof Leap.Frame.prototype
                 * @type {Leap.Gesture}
                 */
                for (var gestureIdx = 0, gestureCount = data.gestures.length; gestureIdx != gestureCount; gestureIdx++) {
                    this.gestures.push(createGesture(data.gestures[gestureIdx]));
                }
            }
            this.postprocessData(data);
        };

        Frame.prototype.postprocessData = function(data){
            if (!data) {
                data = this.data;
            }

            for (var handIdx = 0, handCount = data.hands.length; handIdx != handCount; handIdx++) {
                var hand = new Hand(data.hands[handIdx]);
                hand.frame = this;
                this.hands.push(hand);
                this.handsMap[hand.id] = hand;
            }

            data.pointables = _.sortBy(data.pointables, function(pointable) { return pointable.id });

            for (var pointableIdx = 0, pointableCount = data.pointables.length; pointableIdx != pointableCount; pointableIdx++) {
                var pointableData = data.pointables[pointableIdx];
                var pointable = pointableData.dipPosition ? new Finger(pointableData) : new Pointable(pointableData);
                pointable.frame = this;
                this.addPointable(pointable);
            }
        };

        /**
         * Adds data from a pointable element into the pointablesMap;
         * also adds the pointable to the frame.handsMap hand to which it belongs,
         * and to the hand's tools or hand's fingers map.
         *
         * @param pointable {Object} a Pointable
         */
        Frame.prototype.addPointable = function (pointable) {
            this.pointables.push(pointable);
            this.pointablesMap[pointable.id] = pointable;
            (pointable.tool ? this.tools : this.fingers).push(pointable);
            if (pointable.handId !== undefined && this.handsMap.hasOwnProperty(pointable.handId)) {
                var hand = this.handsMap[pointable.handId];
                hand.pointables.push(pointable);
                (pointable.tool ? hand.tools : hand.fingers).push(pointable);
                switch (pointable.type){
                    case 0:
                        hand.thumb = pointable;
                        break;
                    case 1:
                        hand.indexFinger = pointable;
                        break;
                    case 2:
                        hand.middleFinger = pointable;
                        break;
                    case 3:
                        hand.ringFinger = pointable;
                        break;
                    case 4:
                        hand.pinky = pointable;
                        break;
                }
            }
        };

        /**
         * The tool with the specified ID in this frame.
         *
         * Use the Frame tool() function to retrieve a tool from
         * this frame using an ID value obtained from a previous frame.
         * This function always returns a Pointable object, but if no tool
         * with the specified ID is present, an invalid Pointable object is returned.
         *
         * Note that ID values persist across frames, but only until tracking of a
         * particular object is lost. If tracking of a tool is lost and subsequently
         * regained, the new Pointable object representing that tool may have a
         * different ID than that representing the tool in an earlier frame.
         *
         * @method tool
         * @memberof Leap.Frame.prototype
         * @param {String} id The ID value of a Tool object from a previous frame.
         * @returns {Leap.Pointable} The tool with the
         * matching ID if one exists in this frame; otherwise, an invalid Pointable object
         * is returned.
         */
        Frame.prototype.tool = function(id) {
            var pointable = this.pointable(id);
            return pointable.tool ? pointable : Pointable.Invalid;
        };

        /**
         * The Pointable object with the specified ID in this frame.
         *
         * Use the Frame pointable() function to retrieve the Pointable object from
         * this frame using an ID value obtained from a previous frame.
         * This function always returns a Pointable object, but if no finger or tool
         * with the specified ID is present, an invalid Pointable object is returned.
         *
         * Note that ID values persist across frames, but only until tracking of a
         * particular object is lost. If tracking of a finger or tool is lost and subsequently
         * regained, the new Pointable object representing that finger or tool may have
         * a different ID than that representing the finger or tool in an earlier frame.
         *
         * @method pointable
         * @memberof Leap.Frame.prototype
         * @param {String} id The ID value of a Pointable object from a previous frame.
         * @returns {Leap.Pointable} The Pointable object with
         * the matching ID if one exists in this frame;
         * otherwise, an invalid Pointable object is returned.
         */
        Frame.prototype.pointable = function(id) {
            return this.pointablesMap[id] || Pointable.Invalid;
        };

        /**
         * The finger with the specified ID in this frame.
         *
         * Use the Frame finger() function to retrieve the finger from
         * this frame using an ID value obtained from a previous frame.
         * This function always returns a Finger object, but if no finger
         * with the specified ID is present, an invalid Pointable object is returned.
         *
         * Note that ID values persist across frames, but only until tracking of a
         * particular object is lost. If tracking of a finger is lost and subsequently
         * regained, the new Pointable object representing that physical finger may have
         * a different ID than that representing the finger in an earlier frame.
         *
         * @method finger
         * @memberof Leap.Frame.prototype
         * @param {String} id The ID value of a finger from a previous frame.
         * @returns {Leap.Pointable} The finger with the
         * matching ID if one exists in this frame; otherwise, an invalid Pointable
         * object is returned.
         */
        Frame.prototype.finger = function(id) {
            var pointable = this.pointable(id);
            return !pointable.tool ? pointable : Pointable.Invalid;
        };

        /**
         * The Hand object with the specified ID in this frame.
         *
         * Use the Frame hand() function to retrieve the Hand object from
         * this frame using an ID value obtained from a previous frame.
         * This function always returns a Hand object, but if no hand
         * with the specified ID is present, an invalid Hand object is returned.
         *
         * Note that ID values persist across frames, but only until tracking of a
         * particular object is lost. If tracking of a hand is lost and subsequently
         * regained, the new Hand object representing that physical hand may have
         * a different ID than that representing the physical hand in an earlier frame.
         *
         * @method hand
         * @memberof Leap.Frame.prototype
         * @param {String} id The ID value of a Hand object from a previous frame.
         * @returns {Leap.Hand} The Hand object with the matching
         * ID if one exists in this frame; otherwise, an invalid Hand object is returned.
         */
        Frame.prototype.hand = function(id) {
            return this.handsMap[id] || Hand.Invalid;
        };

        /**
         * The angle of rotation around the rotation axis derived from the overall
         * rotational motion between the current frame and the specified frame.
         *
         * The returned angle is expressed in radians measured clockwise around
         * the rotation axis (using the right-hand rule) between the start and end frames.
         * The value is always between 0 and pi radians (0 and 180 degrees).
         *
         * The Leap derives frame rotation from the relative change in position and
         * orientation of all objects detected in the field of view.
         *
         * If either this frame or sinceFrame is an invalid Frame object, then the
         * angle of rotation is zero.
         *
         * @method rotationAngle
         * @memberof Leap.Frame.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @param {number[]} [axis] The axis to measure rotation around.
         * @returns {number} A positive value containing the heuristically determined
         * rotational change between the current frame and that specified in the sinceFrame parameter.
         */
        Frame.prototype.rotationAngle = function(sinceFrame, axis) {
            if (!this.valid || !sinceFrame.valid) return 0.0;

            var rot = this.rotationMatrix(sinceFrame);
            var cs = (rot[0] + rot[4] + rot[8] - 1.0)*0.5;
            var angle = Math.acos(cs);
            angle = isNaN(angle) ? 0.0 : angle;

            if (axis !== undefined) {
                var rotAxis = this.rotationAxis(sinceFrame);
                angle *= vec3.dot(rotAxis, vec3.normalize(vec3.create(), axis));
            }

            return angle;
        };

        /**
         * The axis of rotation derived from the overall rotational motion between
         * the current frame and the specified frame.
         *
         * The returned direction vector is normalized.
         *
         * The Leap derives frame rotation from the relative change in position and
         * orientation of all objects detected in the field of view.
         *
         * If either this frame or sinceFrame is an invalid Frame object, or if no
         * rotation is detected between the two frames, a zero vector is returned.
         *
         * @method rotationAxis
         * @memberof Leap.Frame.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @returns {number[]} A normalized direction vector representing the axis of the heuristically determined
         * rotational change between the current frame and that specified in the sinceFrame parameter.
         */
        Frame.prototype.rotationAxis = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return vec3.create();
            return vec3.normalize(vec3.create(), [
                this._rotation[7] - sinceFrame._rotation[5],
                this._rotation[2] - sinceFrame._rotation[6],
                this._rotation[3] - sinceFrame._rotation[1]
            ]);
        }

        /**
         * The transform matrix expressing the rotation derived from the overall
         * rotational motion between the current frame and the specified frame.
         *
         * The Leap derives frame rotation from the relative change in position and
         * orientation of all objects detected in the field of view.
         *
         * If either this frame or sinceFrame is an invalid Frame object, then
         * this method returns an identity matrix.
         *
         * @method rotationMatrix
         * @memberof Leap.Frame.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @returns {number[]} A transformation matrix containing the heuristically determined
         * rotational change between the current frame and that specified in the sinceFrame parameter.
         */
        Frame.prototype.rotationMatrix = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return mat3.create();
            var transpose = mat3.transpose(mat3.create(), this._rotation)
            return mat3.multiply(mat3.create(), sinceFrame._rotation, transpose);
        }

        /**
         * The scale factor derived from the overall motion between the current frame and the specified frame.
         *
         * The scale factor is always positive. A value of 1.0 indicates no scaling took place.
         * Values between 0.0 and 1.0 indicate contraction and values greater than 1.0 indicate expansion.
         *
         * The Leap derives scaling from the relative inward or outward motion of all
         * objects detected in the field of view (independent of translation and rotation).
         *
         * If either this frame or sinceFrame is an invalid Frame object, then this method returns 1.0.
         *
         * @method scaleFactor
         * @memberof Leap.Frame.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative scaling.
         * @returns {number} A positive value representing the heuristically determined
         * scaling change ratio between the current frame and that specified in the sinceFrame parameter.
         */
        Frame.prototype.scaleFactor = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return 1.0;
            return Math.exp(this._scaleFactor - sinceFrame._scaleFactor);
        }

        /**
         * The change of position derived from the overall linear motion between the
         * current frame and the specified frame.
         *
         * The returned translation vector provides the magnitude and direction of the
         * movement in millimeters.
         *
         * The Leap derives frame translation from the linear motion of all objects
         * detected in the field of view.
         *
         * If either this frame or sinceFrame is an invalid Frame object, then this
         * method returns a zero vector.
         *
         * @method translation
         * @memberof Leap.Frame.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative translation.
         * @returns {number[]} A vector representing the heuristically determined change in
         * position of all objects between the current frame and that specified in the sinceFrame parameter.
         */
        Frame.prototype.translation = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return vec3.create();
            return vec3.subtract(vec3.create(), this._translation, sinceFrame._translation);
        }

        /**
         * A string containing a brief, human readable description of the Frame object.
         *
         * @method toString
         * @memberof Leap.Frame.prototype
         * @returns {String} A brief description of this frame.
         */
        Frame.prototype.toString = function() {
            var str = "Frame [ id:"+this.id+" | timestamp:"+this.timestamp+" | Hand count:("+this.hands.length+") | Pointable count:("+this.pointables.length+")";
            if (this.gestures) str += " | Gesture count:("+this.gestures.length+")";
            str += " ]";
            return str;
        }

        /**
         * Returns a JSON-formatted string containing the hands, pointables and gestures
         * in this frame.
         *
         * @method dump
         * @memberof Leap.Frame.prototype
         * @returns {String} A JSON-formatted string.
         */
        Frame.prototype.dump = function() {
            var out = '';
            out += "Frame Info:<br/>";
            out += this.toString();
            out += "<br/><br/>Hands:<br/>"
            for (var handIdx = 0, handCount = this.hands.length; handIdx != handCount; handIdx++) {
                out += "  "+ this.hands[handIdx].toString() + "<br/>";
            }
            out += "<br/><br/>Pointables:<br/>";
            for (var pointableIdx = 0, pointableCount = this.pointables.length; pointableIdx != pointableCount; pointableIdx++) {
                out += "  "+ this.pointables[pointableIdx].toString() + "<br/>";
            }
            if (this.gestures) {
                out += "<br/><br/>Gestures:<br/>";
                for (var gestureIdx = 0, gestureCount = this.gestures.length; gestureIdx != gestureCount; gestureIdx++) {
                    out += "  "+ this.gestures[gestureIdx].toString() + "<br/>";
                }
            }
            out += "<br/><br/>Raw JSON:<br/>";
            out += JSON.stringify(this.data);
            return out;
        }

        /**
         * An invalid Frame object.
         *
         * You can use this invalid Frame in comparisons testing
         * whether a given Frame instance is valid or invalid. (You can also check the
         * [Frame.valid]{@link Leap.Frame#valid} property.)
         *
         * @static
         * @type {Leap.Frame}
         * @name Invalid
         * @memberof Leap.Frame
         */
        Frame.Invalid = {
            valid: false,
            hands: [],
            fingers: [],
            tools: [],
            gestures: [],
            pointables: [],
            pointable: function() { return Pointable.Invalid },
            finger: function() { return Pointable.Invalid },
            hand: function() { return Hand.Invalid },
            toString: function() { return "invalid frame" },
            dump: function() { return this.toString() },
            rotationAngle: function() { return 0.0; },
            rotationMatrix: function() { return mat3.create(); },
            rotationAxis: function() { return vec3.create(); },
            scaleFactor: function() { return 1.0; },
            translation: function() { return vec3.create(); }
        };

    },{"./finger":24,"./gesture":26,"./hand":27,"./interaction_box":29,"./pointable":31,"gl-matrix":16,"underscore":37}],26:[function(require,module,exports){
        var glMatrix = require("gl-matrix")
            , vec3 = glMatrix.vec3
            , EventEmitter = require('events').EventEmitter
            , _ = require('underscore');

        /**
         * Constructs a new Gesture object.
         *
         * An uninitialized Gesture object is considered invalid. Get valid instances
         * of the Gesture class, which will be one of the Gesture subclasses, from a
         * Frame object.
         *
         * @class Gesture
         * @abstract
         * @memberof Leap
         * @classdesc
         * The Gesture class represents a recognized movement by the user.
         *
         * The Leap watches the activity within its field of view for certain movement
         * patterns typical of a user gesture or command. For example, a movement from side to
         * side with the hand can indicate a swipe gesture, while a finger poking forward
         * can indicate a screen tap gesture.
         *
         * When the Leap recognizes a gesture, it assigns an ID and adds a
         * Gesture object to the frame gesture list. For continuous gestures, which
         * occur over many frames, the Leap updates the gesture by adding
         * a Gesture object having the same ID and updated properties in each
         * subsequent frame.
         *
         * **Important:** Recognition for each type of gesture must be enabled;
         * otherwise **no gestures are recognized or reported**.
         *
         * Subclasses of Gesture define the properties for the specific movement patterns
         * recognized by the Leap.
         *
         * The Gesture subclasses for include:
         *
         * * CircleGesture -- A circular movement by a finger.
         * * SwipeGesture -- A straight line movement by the hand with fingers extended.
         * * ScreenTapGesture -- A forward tapping movement by a finger.
         * * KeyTapGesture -- A downward tapping movement by a finger.
         *
         * Circle and swipe gestures are continuous and these objects can have a
         * state of start, update, and stop.
         *
         * The screen tap gesture is a discrete gesture. The Leap only creates a single
         * ScreenTapGesture object appears for each tap and it always has a stop state.
         *
         * Get valid Gesture instances from a Frame object. You can get a list of gestures
         * from the Frame gestures array. You can also use the Frame gesture() method
         * to find a gesture in the current frame using an ID value obtained in a
         * previous frame.
         *
         * Gesture objects can be invalid. For example, when you get a gesture by ID
         * using Frame.gesture(), and there is no gesture with that ID in the current
         * frame, then gesture() returns an Invalid Gesture object (rather than a null
         * value). Always check object validity in situations where a gesture might be
         * invalid.
         */
        var createGesture = exports.createGesture = function(data) {
            var gesture;
            switch (data.type) {
                case 'circle':
                    gesture = new CircleGesture(data);
                    break;
                case 'swipe':
                    gesture = new SwipeGesture(data);
                    break;
                case 'screenTap':
                    gesture = new ScreenTapGesture(data);
                    break;
                case 'keyTap':
                    gesture = new KeyTapGesture(data);
                    break;
                default:
                    throw "unknown gesture type";
            }

            /**
             * The gesture ID.
             *
             * All Gesture objects belonging to the same recognized movement share the
             * same ID value. Use the ID value with the Frame::gesture() method to
             * find updates related to this Gesture object in subsequent frames.
             *
             * @member id
             * @memberof Leap.Gesture.prototype
             * @type {number}
             */
            gesture.id = data.id;
            /**
             * The list of hands associated with this Gesture, if any.
             *
             * If no hands are related to this gesture, the list is empty.
             *
             * @member handIds
             * @memberof Leap.Gesture.prototype
             * @type {Array}
             */
            gesture.handIds = data.handIds.slice();
            /**
             * The list of fingers and tools associated with this Gesture, if any.
             *
             * If no Pointable objects are related to this gesture, the list is empty.
             *
             * @member pointableIds
             * @memberof Leap.Gesture.prototype
             * @type {Array}
             */
            gesture.pointableIds = data.pointableIds.slice();
            /**
             * The elapsed duration of the recognized movement up to the
             * frame containing this Gesture object, in microseconds.
             *
             * The duration reported for the first Gesture in the sequence (with the
             * start state) will typically be a small positive number since
             * the movement must progress far enough for the Leap to recognize it as
             * an intentional gesture.
             *
             * @member duration
             * @memberof Leap.Gesture.prototype
             * @type {number}
             */
            gesture.duration = data.duration;
            /**
             * The gesture ID.
             *
             * Recognized movements occur over time and have a beginning, a middle,
             * and an end. The 'state()' attribute reports where in that sequence this
             * Gesture object falls.
             *
             * Possible values for the state field are:
             *
             * * start
             * * update
             * * stop
             *
             * @member state
             * @memberof Leap.Gesture.prototype
             * @type {String}
             */
            gesture.state = data.state;
            /**
             * The gesture type.
             *
             * Possible values for the type field are:
             *
             * * circle
             * * swipe
             * * screenTap
             * * keyTap
             *
             * @member type
             * @memberof Leap.Gesture.prototype
             * @type {String}
             */
            gesture.type = data.type;
            return gesture;
        }

        /*
 * Returns a builder object, which uses method chaining for gesture callback binding.
 */
        var gestureListener = exports.gestureListener = function(controller, type) {
            var handlers = {};
            var gestureMap = {};

            controller.on('gesture', function(gesture, frame) {
                if (gesture.type == type) {
                    if (gesture.state == "start" || gesture.state == "stop") {
                        if (gestureMap[gesture.id] === undefined) {
                            var gestureTracker = new Gesture(gesture, frame);
                            gestureMap[gesture.id] = gestureTracker;
                            _.each(handlers, function(cb, name) {
                                gestureTracker.on(name, cb);
                            });
                        }
                    }
                    gestureMap[gesture.id].update(gesture, frame);
                    if (gesture.state == "stop") {
                        delete gestureMap[gesture.id];
                    }
                }
            });
            var builder = {
                start: function(cb) {
                    handlers['start'] = cb;
                    return builder;
                },
                stop: function(cb) {
                    handlers['stop'] = cb;
                    return builder;
                },
                complete: function(cb) {
                    handlers['stop'] = cb;
                    return builder;
                },
                update: function(cb) {
                    handlers['update'] = cb;
                    return builder;
                }
            }
            return builder;
        }

        var Gesture = exports.Gesture = function(gesture, frame) {
            this.gestures = [gesture];
            this.frames = [frame];
        }

        Gesture.prototype.update = function(gesture, frame) {
            this.lastGesture = gesture;
            this.lastFrame = frame;
            this.gestures.push(gesture);
            this.frames.push(frame);
            this.emit(gesture.state, this);
        }

        Gesture.prototype.translation = function() {
            return vec3.subtract(vec3.create(), this.lastGesture.startPosition, this.lastGesture.position);
        }

        _.extend(Gesture.prototype, EventEmitter.prototype);

        /**
         * Constructs a new CircleGesture object.
         *
         * An uninitialized CircleGesture object is considered invalid. Get valid instances
         * of the CircleGesture class from a Frame object.
         *
         * @class CircleGesture
         * @memberof Leap
         * @augments Leap.Gesture
         * @classdesc
         * The CircleGesture classes represents a circular finger movement.
         *
         * A circle movement is recognized when the tip of a finger draws a circle
         * within the Leap field of view.
         *
         * ![CircleGesture](images/Leap_Gesture_Circle.png)
         *
         * Circle gestures are continuous. The CircleGesture objects for the gesture have
         * three possible states:
         *
         * * start -- The circle gesture has just started. The movement has
         *  progressed far enough for the recognizer to classify it as a circle.
         * * update -- The circle gesture is continuing.
         * * stop -- The circle gesture is finished.
         */
        var CircleGesture = function(data) {
            /**
             * The center point of the circle within the Leap frame of reference.
             *
             * @member center
             * @memberof Leap.CircleGesture.prototype
             * @type {number[]}
             */
            this.center = data.center;
            /**
             * The normal vector for the circle being traced.
             *
             * If you draw the circle clockwise, the normal vector points in the same
             * general direction as the pointable object drawing the circle. If you draw
             * the circle counterclockwise, the normal points back toward the
             * pointable. If the angle between the normal and the pointable object
             * drawing the circle is less than 90 degrees, then the circle is clockwise.
             *
             * ```javascript
             *    var clockwiseness;
             *    if (circle.pointable.direction.angleTo(circle.normal) <= PI/4) {
  *        clockwiseness = "clockwise";
  *    }
             *    else
             *    {
  *        clockwiseness = "counterclockwise";
  *    }
             * ```
             *
             * @member normal
             * @memberof Leap.CircleGesture.prototype
             * @type {number[]}
             */
            this.normal = data.normal;
            /**
             * The number of times the finger tip has traversed the circle.
             *
             * Progress is reported as a positive number of the number. For example,
             * a progress value of .5 indicates that the finger has gone halfway
             * around, while a value of 3 indicates that the finger has gone around
             * the the circle three times.
             *
             * Progress starts where the circle gesture began. Since the circle
             * must be partially formed before the Leap can recognize it, progress
             * will be greater than zero when a circle gesture first appears in the
             * frame.
             *
             * @member progress
             * @memberof Leap.CircleGesture.prototype
             * @type {number}
             */
            this.progress = data.progress;
            /**
             * The radius of the circle in mm.
             *
             * @member radius
             * @memberof Leap.CircleGesture.prototype
             * @type {number}
             */
            this.radius = data.radius;
        }

        CircleGesture.prototype.toString = function() {
            return "CircleGesture ["+JSON.stringify(this)+"]";
        }

        /**
         * Constructs a new SwipeGesture object.
         *
         * An uninitialized SwipeGesture object is considered invalid. Get valid instances
         * of the SwipeGesture class from a Frame object.
         *
         * @class SwipeGesture
         * @memberof Leap
         * @augments Leap.Gesture
         * @classdesc
         * The SwipeGesture class represents a swiping motion of a finger or tool.
         *
         * ![SwipeGesture](images/Leap_Gesture_Swipe.png)
         *
         * Swipe gestures are continuous.
         */
        var SwipeGesture = function(data) {
            /**
             * The starting position within the Leap frame of
             * reference, in mm.
             *
             * @member startPosition
             * @memberof Leap.SwipeGesture.prototype
             * @type {number[]}
             */
            this.startPosition = data.startPosition;
            /**
             * The current swipe position within the Leap frame of
             * reference, in mm.
             *
             * @member position
             * @memberof Leap.SwipeGesture.prototype
             * @type {number[]}
             */
            this.position = data.position;
            /**
             * The unit direction vector parallel to the swipe motion.
             *
             * You can compare the components of the vector to classify the swipe as
             * appropriate for your application. For example, if you are using swipes
             * for two dimensional scrolling, you can compare the x and y values to
             * determine if the swipe is primarily horizontal or vertical.
             *
             * @member direction
             * @memberof Leap.SwipeGesture.prototype
             * @type {number[]}
             */
            this.direction = data.direction;
            /**
             * The speed of the finger performing the swipe gesture in
             * millimeters per second.
             *
             * @member speed
             * @memberof Leap.SwipeGesture.prototype
             * @type {number}
             */
            this.speed = data.speed;
        }

        SwipeGesture.prototype.toString = function() {
            return "SwipeGesture ["+JSON.stringify(this)+"]";
        }

        /**
         * Constructs a new ScreenTapGesture object.
         *
         * An uninitialized ScreenTapGesture object is considered invalid. Get valid instances
         * of the ScreenTapGesture class from a Frame object.
         *
         * @class ScreenTapGesture
         * @memberof Leap
         * @augments Leap.Gesture
         * @classdesc
         * The ScreenTapGesture class represents a tapping gesture by a finger or tool.
         *
         * A screen tap gesture is recognized when the tip of a finger pokes forward
         * and then springs back to approximately the original postion, as if
         * tapping a vertical screen. The tapping finger must pause briefly before beginning the tap.
         *
         * ![ScreenTap](images/Leap_Gesture_Tap2.png)
         *
         * ScreenTap gestures are discrete. The ScreenTapGesture object representing a tap always
         * has the state, STATE_STOP. Only one ScreenTapGesture object is created for each
         * screen tap gesture recognized.
         */
        var ScreenTapGesture = function(data) {
            /**
             * The position where the screen tap is registered.
             *
             * @member position
             * @memberof Leap.ScreenTapGesture.prototype
             * @type {number[]}
             */
            this.position = data.position;
            /**
             * The direction of finger tip motion.
             *
             * @member direction
             * @memberof Leap.ScreenTapGesture.prototype
             * @type {number[]}
             */
            this.direction = data.direction;
            /**
             * The progess value is always 1.0 for a screen tap gesture.
             *
             * @member progress
             * @memberof Leap.ScreenTapGesture.prototype
             * @type {number}
             */
            this.progress = data.progress;
        }

        ScreenTapGesture.prototype.toString = function() {
            return "ScreenTapGesture ["+JSON.stringify(this)+"]";
        }

        /**
         * Constructs a new KeyTapGesture object.
         *
         * An uninitialized KeyTapGesture object is considered invalid. Get valid instances
         * of the KeyTapGesture class from a Frame object.
         *
         * @class KeyTapGesture
         * @memberof Leap
         * @augments Leap.Gesture
         * @classdesc
         * The KeyTapGesture class represents a tapping gesture by a finger or tool.
         *
         * A key tap gesture is recognized when the tip of a finger rotates down toward the
         * palm and then springs back to approximately the original postion, as if
         * tapping. The tapping finger must pause briefly before beginning the tap.
         *
         * ![KeyTap](images/Leap_Gesture_Tap.png)
         *
         * Key tap gestures are discrete. The KeyTapGesture object representing a tap always
         * has the state, STATE_STOP. Only one KeyTapGesture object is created for each
         * key tap gesture recognized.
         */
        var KeyTapGesture = function(data) {
            /**
             * The position where the key tap is registered.
             *
             * @member position
             * @memberof Leap.KeyTapGesture.prototype
             * @type {number[]}
             */
            this.position = data.position;
            /**
             * The direction of finger tip motion.
             *
             * @member direction
             * @memberof Leap.KeyTapGesture.prototype
             * @type {number[]}
             */
            this.direction = data.direction;
            /**
             * The progess value is always 1.0 for a key tap gesture.
             *
             * @member progress
             * @memberof Leap.KeyTapGesture.prototype
             * @type {number}
             */
            this.progress = data.progress;
        }

        KeyTapGesture.prototype.toString = function() {
            return "KeyTapGesture ["+JSON.stringify(this)+"]";
        }

    },{"events":1,"gl-matrix":16,"underscore":37}],27:[function(require,module,exports){
        var Pointable = require("./pointable")
            , Bone = require('./bone')
            , glMatrix = require("gl-matrix")
            , mat3 = glMatrix.mat3
            , vec3 = glMatrix.vec3
            , _ = require("underscore");

        /**
         * Constructs a Hand object.
         *
         * An uninitialized hand is considered invalid.
         * Get valid Hand objects from a Frame object.
         * @class Hand
         * @memberof Leap
         * @classdesc
         * The Hand class reports the physical characteristics of a detected hand.
         *
         * Hand tracking data includes a palm position and velocity; vectors for
         * the palm normal and direction to the fingers; properties of a sphere fit
         * to the hand; and lists of the attached fingers and tools.
         *
         * Note that Hand objects can be invalid, which means that they do not contain
         * valid tracking data and do not correspond to a physical entity. Invalid Hand
         * objects can be the result of asking for a Hand object using an ID from an
         * earlier frame when no Hand objects with that ID exist in the current frame.
         * A Hand object created from the Hand constructor is also invalid.
         * Test for validity with the [Hand.valid]{@link Leap.Hand#valid} property.
         */
        var Hand = module.exports = function(data) {
            /**
             * A unique ID assigned to this Hand object, whose value remains the same
             * across consecutive frames while the tracked hand remains visible. If
             * tracking is lost (for example, when a hand is occluded by another hand
             * or when it is withdrawn from or reaches the edge of the Leap field of view),
             * the Leap may assign a new ID when it detects the hand in a future frame.
             *
             * Use the ID value with the {@link Frame.hand}() function to find this
             * Hand object in future frames.
             *
             * @member id
             * @memberof Leap.Hand.prototype
             * @type {String}
             */
            this.id = data.id;
            /**
             * The center position of the palm in millimeters from the Leap origin.
             * @member palmPosition
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.palmPosition = data.palmPosition;
            /**
             * The direction from the palm position toward the fingers.
             *
             * The direction is expressed as a unit vector pointing in the same
             * direction as the directed line from the palm position to the fingers.
             *
             * @member direction
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.direction = data.direction;
            /**
             * The rate of change of the palm position in millimeters/second.
             *
             * @member palmVeclocity
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.palmVelocity = data.palmVelocity;
            /**
             * The normal vector to the palm. If your hand is flat, this vector will
             * point downward, or "out" of the front surface of your palm.
             *
             * ![Palm Vectors](images/Leap_Palm_Vectors.png)
             *
             * The direction is expressed as a unit vector pointing in the same
             * direction as the palm normal (that is, a vector orthogonal to the palm).
             * @member palmNormal
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.palmNormal = data.palmNormal;
            /**
             * The center of a sphere fit to the curvature of this hand.
             *
             * This sphere is placed roughly as if the hand were holding a ball.
             *
             * ![Hand Ball](images/Leap_Hand_Ball.png)
             * @member sphereCenter
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.sphereCenter = data.sphereCenter;
            /**
             * The radius of a sphere fit to the curvature of this hand, in millimeters.
             *
             * This sphere is placed roughly as if the hand were holding a ball. Thus the
             * size of the sphere decreases as the fingers are curled into a fist.
             *
             * @member sphereRadius
             * @memberof Leap.Hand.prototype
             * @type {number}
             */
            this.sphereRadius = data.sphereRadius;
            /**
             * Reports whether this is a valid Hand object.
             *
             * @member valid
             * @memberof Leap.Hand.prototype
             * @type {boolean}
             */
            this.valid = true;
            /**
             * The list of Pointable objects (fingers and tools) detected in this frame
             * that are associated with this hand, given in arbitrary order. The list
             * can be empty if no fingers or tools associated with this hand are detected.
             *
             * Use the {@link Pointable} tool property to determine
             * whether or not an item in the list represents a tool or finger.
             * You can also get only the tools using the Hand.tools[] list or
             * only the fingers using the Hand.fingers[] list.
             *
             * @member pointables[]
             * @memberof Leap.Hand.prototype
             * @type {Leap.Pointable[]}
             */
            this.pointables = [];
            /**
             * The list of fingers detected in this frame that are attached to
             * this hand, given in arbitrary order.
             *
             * The list can be empty if no fingers attached to this hand are detected.
             *
             * @member fingers[]
             * @memberof Leap.Hand.prototype
             * @type {Leap.Pointable[]}
             */
            this.fingers = [];

            if (data.armBasis){
                this.arm = new Bone(this, {
                    type: 4,
                    width: data.armWidth,
                    prevJoint: data.elbow,
                    nextJoint: data.wrist,
                    basis: data.armBasis
                });
            }else{
                this.arm = null;
            }

            /**
             * The list of tools detected in this frame that are held by this
             * hand, given in arbitrary order.
             *
             * The list can be empty if no tools held by this hand are detected.
             *
             * @member tools[]
             * @memberof Leap.Hand.prototype
             * @type {Leap.Pointable[]}
             */
            this.tools = [];
            this._translation = data.t;
            this._rotation = _.flatten(data.r);
            this._scaleFactor = data.s;

            /**
             * Time the hand has been visible in seconds.
             *
             * @member timeVisible
             * @memberof Leap.Hand.prototype
             * @type {number}
             */
            this.timeVisible = data.timeVisible;

            /**
             * The palm position with stabalization
             * @member stabilizedPalmPosition
             * @memberof Leap.Hand.prototype
             * @type {number[]}
             */
            this.stabilizedPalmPosition = data.stabilizedPalmPosition;

            /**
             * Reports whether this is a left or a right hand.
             *
             * @member type
             * @type {String}
             * @memberof Leap.Hand.prototype
             */
            this.type = data.type;
            this.grabStrength = data.grabStrength;
            this.pinchStrength = data.pinchStrength;
            this.confidence = data.confidence;
        }

        /**
         * The finger with the specified ID attached to this hand.
         *
         * Use this function to retrieve a Pointable object representing a finger
         * attached to this hand using an ID value obtained from a previous frame.
         * This function always returns a Pointable object, but if no finger
         * with the specified ID is present, an invalid Pointable object is returned.
         *
         * Note that the ID values assigned to fingers persist across frames, but only
         * until tracking of a particular finger is lost. If tracking of a finger is
         * lost and subsequently regained, the new Finger object representing that
         * finger may have a different ID than that representing the finger in an
         * earlier frame.
         *
         * @method finger
         * @memberof Leap.Hand.prototype
         * @param {String} id The ID value of a finger from a previous frame.
         * @returns {Leap.Pointable} The Finger object with
         * the matching ID if one exists for this hand in this frame; otherwise, an
         * invalid Finger object is returned.
         */
        Hand.prototype.finger = function(id) {
            var finger = this.frame.finger(id);
            return (finger && (finger.handId == this.id)) ? finger : Pointable.Invalid;
        }

        /**
         * The angle of rotation around the rotation axis derived from the change in
         * orientation of this hand, and any associated fingers and tools, between the
         * current frame and the specified frame.
         *
         * The returned angle is expressed in radians measured clockwise around the
         * rotation axis (using the right-hand rule) between the start and end frames.
         * The value is always between 0 and pi radians (0 and 180 degrees).
         *
         * If a corresponding Hand object is not found in sinceFrame, or if either
         * this frame or sinceFrame are invalid Frame objects, then the angle of rotation is zero.
         *
         * @method rotationAngle
         * @memberof Leap.Hand.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @param {numnber[]} [axis] The axis to measure rotation around.
         * @returns {number} A positive value representing the heuristically determined
         * rotational change of the hand between the current frame and that specified in
         * the sinceFrame parameter.
         */
        Hand.prototype.rotationAngle = function(sinceFrame, axis) {
            if (!this.valid || !sinceFrame.valid) return 0.0;
            var sinceHand = sinceFrame.hand(this.id);
            if(!sinceHand.valid) return 0.0;
            var rot = this.rotationMatrix(sinceFrame);
            var cs = (rot[0] + rot[4] + rot[8] - 1.0)*0.5
            var angle = Math.acos(cs);
            angle = isNaN(angle) ? 0.0 : angle;
            if (axis !== undefined) {
                var rotAxis = this.rotationAxis(sinceFrame);
                angle *= vec3.dot(rotAxis, vec3.normalize(vec3.create(), axis));
            }
            return angle;
        }

        /**
         * The axis of rotation derived from the change in orientation of this hand, and
         * any associated fingers and tools, between the current frame and the specified frame.
         *
         * The returned direction vector is normalized.
         *
         * If a corresponding Hand object is not found in sinceFrame, or if either
         * this frame or sinceFrame are invalid Frame objects, then this method returns a zero vector.
         *
         * @method rotationAxis
         * @memberof Leap.Hand.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @returns {number[]} A normalized direction Vector representing the axis of the heuristically determined
         * rotational change of the hand between the current frame and that specified in the sinceFrame parameter.
         */
        Hand.prototype.rotationAxis = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return vec3.create();
            var sinceHand = sinceFrame.hand(this.id);
            if (!sinceHand.valid) return vec3.create();
            return vec3.normalize(vec3.create(), [
                this._rotation[7] - sinceHand._rotation[5],
                this._rotation[2] - sinceHand._rotation[6],
                this._rotation[3] - sinceHand._rotation[1]
            ]);
        }

        /**
         * The transform matrix expressing the rotation derived from the change in
         * orientation of this hand, and any associated fingers and tools, between
         * the current frame and the specified frame.
         *
         * If a corresponding Hand object is not found in sinceFrame, or if either
         * this frame or sinceFrame are invalid Frame objects, then this method returns
         * an identity matrix.
         *
         * @method rotationMatrix
         * @memberof Leap.Hand.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative rotation.
         * @returns {number[]} A transformation Matrix containing the heuristically determined
         * rotational change of the hand between the current frame and that specified in the sinceFrame parameter.
         */
        Hand.prototype.rotationMatrix = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return mat3.create();
            var sinceHand = sinceFrame.hand(this.id);
            if(!sinceHand.valid) return mat3.create();
            var transpose = mat3.transpose(mat3.create(), this._rotation);
            var m = mat3.multiply(mat3.create(), sinceHand._rotation, transpose);
            return m;
        }

        /**
         * The scale factor derived from the hand's motion between the current frame and the specified frame.
         *
         * The scale factor is always positive. A value of 1.0 indicates no scaling took place.
         * Values between 0.0 and 1.0 indicate contraction and values greater than 1.0 indicate expansion.
         *
         * The Leap derives scaling from the relative inward or outward motion of a hand
         * and its associated fingers and tools (independent of translation and rotation).
         *
         * If a corresponding Hand object is not found in sinceFrame, or if either this frame or sinceFrame
         * are invalid Frame objects, then this method returns 1.0.
         *
         * @method scaleFactor
         * @memberof Leap.Hand.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative scaling.
         * @returns {number} A positive value representing the heuristically determined
         * scaling change ratio of the hand between the current frame and that specified in the sinceFrame parameter.
         */
        Hand.prototype.scaleFactor = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return 1.0;
            var sinceHand = sinceFrame.hand(this.id);
            if(!sinceHand.valid) return 1.0;

            return Math.exp(this._scaleFactor - sinceHand._scaleFactor);
        }

        /**
         * The change of position of this hand between the current frame and the specified frame
         *
         * The returned translation vector provides the magnitude and direction of the
         * movement in millimeters.
         *
         * If a corresponding Hand object is not found in sinceFrame, or if either this frame or
         * sinceFrame are invalid Frame objects, then this method returns a zero vector.
         *
         * @method translation
         * @memberof Leap.Hand.prototype
         * @param {Leap.Frame} sinceFrame The starting frame for computing the relative translation.
         * @returns {number[]} A Vector representing the heuristically determined change in hand
         * position between the current frame and that specified in the sinceFrame parameter.
         */
        Hand.prototype.translation = function(sinceFrame) {
            if (!this.valid || !sinceFrame.valid) return vec3.create();
            var sinceHand = sinceFrame.hand(this.id);
            if(!sinceHand.valid) return vec3.create();
            return [
                this._translation[0] - sinceHand._translation[0],
                this._translation[1] - sinceHand._translation[1],
                this._translation[2] - sinceHand._translation[2]
            ];
        }

        /**
         * A string containing a brief, human readable description of the Hand object.
         * @method toString
         * @memberof Leap.Hand.prototype
         * @returns {String} A description of the Hand as a string.
         */
        Hand.prototype.toString = function() {
            return "Hand (" + this.type + ") [ id: "+ this.id + " | palm velocity:"+this.palmVelocity+" | sphere center:"+this.sphereCenter+" ] ";
        }

        /**
         * The pitch angle in radians.
         *
         * Pitch is the angle between the negative z-axis and the projection of
         * the vector onto the y-z plane. In other words, pitch represents rotation
         * around the x-axis.
         * If the vector points upward, the returned angle is between 0 and pi radians
         * (180 degrees); if it points downward, the angle is between 0 and -pi radians.
         *
         * @method pitch
         * @memberof Leap.Hand.prototype
         * @returns {number} The angle of this vector above or below the horizon (x-z plane).
         *
         */
        Hand.prototype.pitch = function() {
            return Math.atan2(this.direction[1], -this.direction[2]);
        }

        /**
         *  The yaw angle in radians.
         *
         * Yaw is the angle between the negative z-axis and the projection of
         * the vector onto the x-z plane. In other words, yaw represents rotation
         * around the y-axis. If the vector points to the right of the negative z-axis,
         * then the returned angle is between 0 and pi radians (180 degrees);
         * if it points to the left, the angle is between 0 and -pi radians.
         *
         * @method yaw
         * @memberof Leap.Hand.prototype
         * @returns {number} The angle of this vector to the right or left of the y-axis.
         *
         */
        Hand.prototype.yaw = function() {
            return Math.atan2(this.direction[0], -this.direction[2]);
        }

        /**
         *  The roll angle in radians.
         *
         * Roll is the angle between the y-axis and the projection of
         * the vector onto the x-y plane. In other words, roll represents rotation
         * around the z-axis. If the vector points to the left of the y-axis,
         * then the returned angle is between 0 and pi radians (180 degrees);
         * if it points to the right, the angle is between 0 and -pi radians.
         *
         * @method roll
         * @memberof Leap.Hand.prototype
         * @returns {number} The angle of this vector to the right or left of the y-axis.
         *
         */
        Hand.prototype.roll = function() {
            return Math.atan2(this.palmNormal[0], -this.palmNormal[1]);
        }

        /**
         * An invalid Hand object.
         *
         * You can use an invalid Hand object in comparisons testing
         * whether a given Hand instance is valid or invalid. (You can also use the
         * Hand valid property.)
         *
         * @static
         * @type {Leap.Hand}
         * @name Invalid
         * @memberof Leap.Hand
         */
        Hand.Invalid = {
            valid: false,
            fingers: [],
            tools: [],
            pointables: [],
            left: false,
            pointable: function() { return Pointable.Invalid },
            finger: function() { return Pointable.Invalid },
            toString: function() { return "invalid frame" },
            dump: function() { return this.toString(); },
            rotationAngle: function() { return 0.0; },
            rotationMatrix: function() { return mat3.create(); },
            rotationAxis: function() { return vec3.create(); },
            scaleFactor: function() { return 1.0; },
            translation: function() { return vec3.create(); }
        };

    },{"./bone":17,"./pointable":31,"gl-matrix":16,"underscore":37}],28:[function(require,module,exports){
        /**
         * Leap is the global namespace of the Leap API.
         * @namespace Leap
         */
        module.exports = {
            Controller: require("./controller"),
            Frame: require("./frame"),
            Gesture: require("./gesture"),
            Hand: require("./hand"),
            Pointable: require("./pointable"),
            Finger: require("./finger"),
            InteractionBox: require("./interaction_box"),
            CircularBuffer: require("./circular_buffer"),
            UI: require("./ui"),
            JSONProtocol: require("./protocol").JSONProtocol,
            glMatrix: require("gl-matrix"),
            mat3: require("gl-matrix").mat3,
            vec3: require("gl-matrix").vec3,
            loopController: undefined,
            version: require('./version.js'),

            /**
             * Expose utility libraries for convenience
             * Use carefully - they may be subject to upgrade or removal in different versions of LeapJS.
             *
             */
            _: require('underscore'),
            EventEmitter: require('events').EventEmitter,

            /**
             * The Leap.loop() function passes a frame of Leap data to your
             * callback function and then calls window.requestAnimationFrame() after
             * executing your callback function.
             *
             * Leap.loop() sets up the Leap controller and WebSocket connection for you.
             * You do not need to create your own controller when using this method.
             *
             * Your callback function is called on an interval determined by the client
             * browser. Typically, this is on an interval of 60 frames/second. The most
             * recent frame of Leap data is passed to your callback function. If the Leap
             * is producing frames at a slower rate than the browser frame rate, the same
             * frame of Leap data can be passed to your function in successive animation
             * updates.
             *
             * As an alternative, you can create your own Controller object and use a
             * {@link Controller#onFrame onFrame} callback to process the data at
             * the frame rate of the Leap device. See {@link Controller} for an
             * example.
             *
             * @method Leap.loop
             * @param {function} callback A function called when the browser is ready to
             * draw to the screen. The most recent {@link Frame} object is passed to
             * your callback function.
             *
             * ```javascript
             *    Leap.loop( function( frame ) {
   *        // ... your code here
   *    })
             * ```
             */
            loop: function(opts, callback) {
                if (opts && callback === undefined &&  ( ({}).toString.call(opts) === '[object Function]' ) ) {
                    callback = opts;
                    opts = {};
                }

                if (this.loopController) {
                    if (opts){
                        this.loopController.setupFrameEvents(opts);
                    }
                }else{
                    this.loopController = new this.Controller(opts);
                }

                this.loopController.loop(callback);
                return this.loopController;
            },

            /*
   * Convenience method for Leap.Controller.plugin
   */
            plugin: function(name, options){
                this.Controller.plugin(name, options)
            }
        }

    },{"./circular_buffer":18,"./controller":22,"./finger":24,"./frame":25,"./gesture":26,"./hand":27,"./interaction_box":29,"./pointable":31,"./protocol":32,"./ui":33,"./version.js":36,"events":1,"gl-matrix":16,"underscore":37}],29:[function(require,module,exports){
        var glMatrix = require("gl-matrix")
            , vec3 = glMatrix.vec3;

        /**
         * Constructs a InteractionBox object.
         *
         * @class InteractionBox
         * @memberof Leap
         * @classdesc
         * The InteractionBox class represents a box-shaped region completely within
         * the field of view of the Leap Motion controller.
         *
         * The interaction box is an axis-aligned rectangular prism and provides
         * normalized coordinates for hands, fingers, and tools within this box.
         * The InteractionBox class can make it easier to map positions in the
         * Leap Motion coordinate system to 2D or 3D coordinate systems used
         * for application drawing.
         *
         * ![Interaction Box](images/Leap_InteractionBox.png)
         *
         * The InteractionBox region is defined by a center and dimensions along the x, y, and z axes.
         */
        var InteractionBox = module.exports = function(data) {
            /**
             * Indicates whether this is a valid InteractionBox object.
             *
             * @member valid
             * @type {Boolean}
             * @memberof Leap.InteractionBox.prototype
             */
            this.valid = true;
            /**
             * The center of the InteractionBox in device coordinates (millimeters).
             * This point is equidistant from all sides of the box.
             *
             * @member center
             * @type {number[]}
             * @memberof Leap.InteractionBox.prototype
             */
            this.center = data.center;

            this.size = data.size;
            /**
             * The width of the InteractionBox in millimeters, measured along the x-axis.
             *
             * @member width
             * @type {number}
             * @memberof Leap.InteractionBox.prototype
             */
            this.width = data.size[0];
            /**
             * The height of the InteractionBox in millimeters, measured along the y-axis.
             *
             * @member height
             * @type {number}
             * @memberof Leap.InteractionBox.prototype
             */
            this.height = data.size[1];
            /**
             * The depth of the InteractionBox in millimeters, measured along the z-axis.
             *
             * @member depth
             * @type {number}
             * @memberof Leap.InteractionBox.prototype
             */
            this.depth = data.size[2];
        }

        /**
         * Converts a position defined by normalized InteractionBox coordinates
         * into device coordinates in millimeters.
         *
         * This function performs the inverse of normalizePoint().
         *
         * @method denormalizePoint
         * @memberof Leap.InteractionBox.prototype
         * @param {number[]} normalizedPosition The input position in InteractionBox coordinates.
         * @returns {number[]} The corresponding denormalized position in device coordinates.
         */
        InteractionBox.prototype.denormalizePoint = function(normalizedPosition) {
            return vec3.fromValues(
                (normalizedPosition[0] - 0.5) * this.size[0] + this.center[0],
                (normalizedPosition[1] - 0.5) * this.size[1] + this.center[1],
                (normalizedPosition[2] - 0.5) * this.size[2] + this.center[2]
            );
        }

        /**
         * Normalizes the coordinates of a point using the interaction box.
         *
         * Coordinates from the Leap Motion frame of reference (millimeters) are
         * converted to a range of [0..1] such that the minimum value of the
         * InteractionBox maps to 0 and the maximum value of the InteractionBox maps to 1.
         *
         * @method normalizePoint
         * @memberof Leap.InteractionBox.prototype
         * @param {number[]} position The input position in device coordinates.
         * @param {Boolean} clamp Whether or not to limit the output value to the range [0,1]
         * when the input position is outside the InteractionBox. Defaults to true.
         * @returns {number[]} The normalized position.
         */
        InteractionBox.prototype.normalizePoint = function(position, clamp) {
            var vec = vec3.fromValues(
                ((position[0] - this.center[0]) / this.size[0]) + 0.5,
                ((position[1] - this.center[1]) / this.size[1]) + 0.5,
                ((position[2] - this.center[2]) / this.size[2]) + 0.5
            );

            if (clamp) {
                vec[0] = Math.min(Math.max(vec[0], 0), 1);
                vec[1] = Math.min(Math.max(vec[1], 0), 1);
                vec[2] = Math.min(Math.max(vec[2], 0), 1);
            }
            return vec;
        }

        /**
         * Writes a brief, human readable description of the InteractionBox object.
         *
         * @method toString
         * @memberof Leap.InteractionBox.prototype
         * @returns {String} A description of the InteractionBox object as a string.
         */
        InteractionBox.prototype.toString = function() {
            return "InteractionBox [ width:" + this.width + " | height:" + this.height + " | depth:" + this.depth + " ]";
        }

        /**
         * An invalid InteractionBox object.
         *
         * You can use this InteractionBox instance in comparisons testing
         * whether a given InteractionBox instance is valid or invalid. (You can also use the
         * InteractionBox.valid property.)
         *
         * @static
         * @type {Leap.InteractionBox}
         * @name Invalid
         * @memberof Leap.InteractionBox
         */
        InteractionBox.Invalid = { valid: false };

    },{"gl-matrix":16}],30:[function(require,module,exports){
        var Pipeline = module.exports = function (controller) {
            this.steps = [];
            this.controller = controller;
        }

        Pipeline.prototype.addStep = function (step) {
            this.steps.push(step);
        }

        Pipeline.prototype.run = function (frame) {
            var stepsLength = this.steps.length;
            for (var i = 0; i != stepsLength; i++) {
                if (!frame) break;
                frame = this.steps[i](frame);
            }
            return frame;
        }

        Pipeline.prototype.removeStep = function(step){
            var index = this.steps.indexOf(step);
            if (index === -1) throw "Step not found in pipeline";
            this.steps.splice(index, 1);
        }

        /*
 * Wraps a plugin callback method in method which can be run inside the pipeline.
 * This wrapper method loops the callback over objects within the frame as is appropriate,
 * calling the callback for each in turn.
 *
 * @method createStepFunction
 * @memberOf Leap.Controller.prototype
 * @param {Controller} The controller on which the callback is called.
 * @param {String} type What frame object the callback is run for and receives.
 *       Can be one of 'frame', 'finger', 'hand', 'pointable', 'tool'
 * @param {function} callback The method which will be run inside the pipeline loop.  Receives one argument, such as a hand.
 * @private
 */
        Pipeline.prototype.addWrappedStep = function (type, callback) {
            var controller = this.controller,
                step = function (frame) {
                    var dependencies, i, len;
                    dependencies = (type == 'frame') ? [frame] : (frame[type + 's'] || []);

                    for (i = 0, len = dependencies.length; i < len; i++) {
                        callback.call(controller, dependencies[i]);
                    }

                    return frame;
                };

            this.addStep(step);
            return step;
        };
    },{}],31:[function(require,module,exports){
        var glMatrix = require("gl-matrix")
            , vec3 = glMatrix.vec3;

        /**
         * Constructs a Pointable object.
         *
         * An uninitialized pointable is considered invalid.
         * Get valid Pointable objects from a Frame or a Hand object.
         *
         * @class Pointable
         * @memberof Leap
         * @classdesc
         * The Pointable class reports the physical characteristics of a detected
         * finger or tool.
         *
         * Both fingers and tools are classified as Pointable objects. Use the
         * Pointable.tool property to determine whether a Pointable object represents a
         * tool or finger. The Leap classifies a detected entity as a tool when it is
         * thinner, straighter, and longer than a typical finger.
         *
         * Note that Pointable objects can be invalid, which means that they do not
         * contain valid tracking data and do not correspond to a physical entity.
         * Invalid Pointable objects can be the result of asking for a Pointable object
         * using an ID from an earlier frame when no Pointable objects with that ID
         * exist in the current frame. A Pointable object created from the Pointable
         * constructor is also invalid. Test for validity with the Pointable.valid
         * property.
         */
        var Pointable = module.exports = function(data) {
            /**
             * Indicates whether this is a valid Pointable object.
             *
             * @member valid
             * @type {Boolean}
             * @memberof Leap.Pointable.prototype
             */
            this.valid = true;
            /**
             * A unique ID assigned to this Pointable object, whose value remains the
             * same across consecutive frames while the tracked finger or tool remains
             * visible. If tracking is lost (for example, when a finger is occluded by
             * another finger or when it is withdrawn from the Leap field of view), the
             * Leap may assign a new ID when it detects the entity in a future frame.
             *
             * Use the ID value with the pointable() functions defined for the
             * {@link Frame} and {@link Frame.Hand} classes to find this
             * Pointable object in future frames.
             *
             * @member id
             * @type {String}
             * @memberof Leap.Pointable.prototype
             */
            this.id = data.id;
            this.handId = data.handId;
            /**
             * The estimated length of the finger or tool in millimeters.
             *
             * The reported length is the visible length of the finger or tool from the
             * hand to tip. If the length isn't known, then a value of 0 is returned.
             *
             * @member length
             * @type {number}
             * @memberof Leap.Pointable.prototype
             */
            this.length = data.length;
            /**
             * Whether or not the Pointable is believed to be a tool.
             * Tools are generally longer, thinner, and straighter than fingers.
             *
             * If tool is false, then this Pointable must be a finger.
             *
             * @member tool
             * @type {Boolean}
             * @memberof Leap.Pointable.prototype
             */
            this.tool = data.tool;
            /**
             * The estimated width of the tool in millimeters.
             *
             * The reported width is the average width of the visible portion of the
             * tool from the hand to the tip. If the width isn't known,
             * then a value of 0 is returned.
             *
             * Pointable objects representing fingers do not have a width property.
             *
             * @member width
             * @type {number}
             * @memberof Leap.Pointable.prototype
             */
            this.width = data.width;
            /**
             * The direction in which this finger or tool is pointing.
             *
             * The direction is expressed as a unit vector pointing in the same
             * direction as the tip.
             *
             * ![Finger](images/Leap_Finger_Model.png)
             * @member direction
             * @type {number[]}
             * @memberof Leap.Pointable.prototype
             */
            this.direction = data.direction;
            /**
             * The tip position in millimeters from the Leap origin.
             * Stabilized
             *
             * @member stabilizedTipPosition
             * @type {number[]}
             * @memberof Leap.Pointable.prototype
             */
            this.stabilizedTipPosition = data.stabilizedTipPosition;
            /**
             * The tip position in millimeters from the Leap origin.
             *
             * @member tipPosition
             * @type {number[]}
             * @memberof Leap.Pointable.prototype
             */
            this.tipPosition = data.tipPosition;
            /**
             * The rate of change of the tip position in millimeters/second.
             *
             * @member tipVelocity
             * @type {number[]}
             * @memberof Leap.Pointable.prototype
             */
            this.tipVelocity = data.tipVelocity;
            /**
             * The current touch zone of this Pointable object.
             *
             * The Leap Motion software computes the touch zone based on a floating touch
             * plane that adapts to the user's finger movement and hand posture. The Leap
             * Motion software interprets purposeful movements toward this plane as potential touch
             * points. When a Pointable moves close to the adaptive touch plane, it enters the
             * "hovering" zone. When a Pointable reaches or passes through the plane, it enters
             * the "touching" zone.
             *
             * The possible states include:
             *
             * * "none" -- The Pointable is outside the hovering zone.
             * * "hovering" -- The Pointable is close to, but not touching the touch plane.
             * * "touching" -- The Pointable has penetrated the touch plane.
             *
             * The touchDistance value provides a normalized indication of the distance to
             * the touch plane when the Pointable is in the hovering or touching zones.
             *
             * @member touchZone
             * @type {String}
             * @memberof Leap.Pointable.prototype
             */
            this.touchZone = data.touchZone;
            /**
             * A value proportional to the distance between this Pointable object and the
             * adaptive touch plane.
             *
             * ![Touch Distance](images/Leap_Touch_Plane.png)
             *
             * The touch distance is a value in the range [-1, 1]. The value 1.0 indicates the
             * Pointable is at the far edge of the hovering zone. The value 0 indicates the
             * Pointable is just entering the touching zone. A value of -1.0 indicates the
             * Pointable is firmly within the touching zone. Values in between are
             * proportional to the distance from the plane. Thus, the touchDistance of 0.5
             * indicates that the Pointable is halfway into the hovering zone.
             *
             * You can use the touchDistance value to modulate visual feedback given to the
             * user as their fingers close in on a touch target, such as a button.
             *
             * @member touchDistance
             * @type {number}
             * @memberof Leap.Pointable.prototype
             */
            this.touchDistance = data.touchDistance;

            /**
             * How long the pointable has been visible in seconds.
             *
             * @member timeVisible
             * @type {number}
             * @memberof Leap.Pointable.prototype
             */
            this.timeVisible = data.timeVisible;
        }

        /**
         * A string containing a brief, human readable description of the Pointable
         * object.
         *
         * @method toString
         * @memberof Leap.Pointable.prototype
         * @returns {String} A description of the Pointable object as a string.
         */
        Pointable.prototype.toString = function() {
            return "Pointable [ id:" + this.id + " " + this.length + "mmx | width:" + this.width + "mm | direction:" + this.direction + ' ]';
        }

        /**
         * Returns the hand which the pointable is attached to.
         */
        Pointable.prototype.hand = function(){
            return this.frame.hand(this.handId);
        }

        /**
         * An invalid Pointable object.
         *
         * You can use this Pointable instance in comparisons testing
         * whether a given Pointable instance is valid or invalid. (You can also use the
         * Pointable.valid property.)

         * @static
         * @type {Leap.Pointable}
         * @name Invalid
         * @memberof Leap.Pointable
         */
        Pointable.Invalid = { valid: false };

    },{"gl-matrix":16}],32:[function(require,module,exports){
        var Frame = require('./frame')
            , Hand = require('./hand')
            , Pointable = require('./pointable')
            , Finger = require('./finger')
            , _ = require('underscore')
            , EventEmitter = require('events').EventEmitter;

        var Event = function(data) {
            this.type = data.type;
            this.state = data.state;
        };

        exports.chooseProtocol = function(header) {
            var protocol;
            switch(header.version) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    protocol = JSONProtocol(header);
                    protocol.sendBackground = function(connection, state) {
                        connection.send(protocol.encode({background: state}));
                    }
                    protocol.sendFocused = function(connection, state) {
                        connection.send(protocol.encode({focused: state}));
                    }
                    protocol.sendOptimizeHMD = function(connection, state) {
                        connection.send(protocol.encode({optimizeHMD: state}));
                    }
                    break;
                default:
                    throw "unrecognized version";
            }
            return protocol;
        }

        var JSONProtocol = exports.JSONProtocol = function(header) {

            var protocol = function(frameData) {

                if (frameData.event) {

                    return new Event(frameData.event);

                } else {

                    protocol.emit('beforeFrameCreated', frameData);

                    var frame = new Frame(frameData);

                    protocol.emit('afterFrameCreated', frame, frameData);

                    return frame;

                }

            };

            protocol.encode = function(message) {
                return JSON.stringify(message);
            };
            protocol.version = header.version;
            protocol.serviceVersion = header.serviceVersion;
            protocol.versionLong = 'Version ' + header.version;
            protocol.type = 'protocol';

            _.extend(protocol, EventEmitter.prototype);

            return protocol;
        };



    },{"./finger":24,"./frame":25,"./hand":27,"./pointable":31,"events":1,"underscore":37}],33:[function(require,module,exports){
        exports.UI = {
            Region: require("./ui/region"),
            Cursor: require("./ui/cursor")
        };
    },{"./ui/cursor":34,"./ui/region":35}],34:[function(require,module,exports){
        var Cursor = module.exports = function() {
            return function(frame) {
                var pointable = frame.pointables.sort(function(a, b) { return a.z - b.z })[0]
                if (pointable && pointable.valid) {
                    frame.cursorPosition = pointable.tipPosition
                }
                return frame
            }
        }

    },{}],35:[function(require,module,exports){
        var EventEmitter = require('events').EventEmitter
            , _ = require('underscore')

        var Region = module.exports = function(start, end) {
            this.start = new Vector(start)
            this.end = new Vector(end)
            this.enteredFrame = null
        }

        Region.prototype.hasPointables = function(frame) {
            for (var i = 0; i != frame.pointables.length; i++) {
                var position = frame.pointables[i].tipPosition
                if (position.x >= this.start.x && position.x <= this.end.x && position.y >= this.start.y && position.y <= this.end.y && position.z >= this.start.z && position.z <= this.end.z) {
                    return true
                }
            }
            return false
        }

        Region.prototype.listener = function(opts) {
            var region = this
            if (opts && opts.nearThreshold) this.setupNearRegion(opts.nearThreshold)
            return function(frame) {
                return region.updatePosition(frame)
            }
        }

        Region.prototype.clipper = function() {
            var region = this
            return function(frame) {
                region.updatePosition(frame)
                return region.enteredFrame ? frame : null
            }
        }

        Region.prototype.setupNearRegion = function(distance) {
            var nearRegion = this.nearRegion = new Region(
                [this.start.x - distance, this.start.y - distance, this.start.z - distance],
                [this.end.x + distance, this.end.y + distance, this.end.z + distance]
            )
            var region = this
            nearRegion.on("enter", function(frame) {
                region.emit("near", frame)
            })
            nearRegion.on("exit", function(frame) {
                region.emit("far", frame)
            })
            region.on('exit', function(frame) {
                region.emit("near", frame)
            })
        }

        Region.prototype.updatePosition = function(frame) {
            if (this.nearRegion) this.nearRegion.updatePosition(frame)
            if (this.hasPointables(frame) && this.enteredFrame == null) {
                this.enteredFrame = frame
                this.emit("enter", this.enteredFrame)
            } else if (!this.hasPointables(frame) && this.enteredFrame != null) {
                this.enteredFrame = null
                this.emit("exit", this.enteredFrame)
            }
            return frame
        }

        Region.prototype.normalize = function(position) {
            return new Vector([
                (position.x - this.start.x) / (this.end.x - this.start.x),
                (position.y - this.start.y) / (this.end.y - this.start.y),
                (position.z - this.start.z) / (this.end.z - this.start.z)
            ])
        }

        Region.prototype.mapToXY = function(position, width, height) {
            var normalized = this.normalize(position)
            var x = normalized.x, y = normalized.y
            if (x > 1) x = 1
            else if (x < -1) x = -1
            if (y > 1) y = 1
            else if (y < -1) y = -1
            return [
                (x + 1) / 2 * width,
                (1 - y) / 2 * height,
                normalized.z
            ]
        }

        _.extend(Region.prototype, EventEmitter.prototype)
    },{"events":1,"underscore":37}],36:[function(require,module,exports){
// This file is automatically updated from package.json by grunt.
        module.exports = {
            full: '0.6.4',
            major: 0,
            minor: 6,
            dot: 4
        }
    },{}],37:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

        (function() {

            // Baseline setup
            // --------------

            // Establish the root object, `window` in the browser, or `global` on the server.
            var root = this;

            // Save the previous value of the `_` variable.
            var previousUnderscore = root._;

            // Establish the object that gets returned to break out of a loop iteration.
            var breaker = {};

            // Save bytes in the minified (but not gzipped) version:
            var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

            // Create quick reference variables for speed access to core prototypes.
            var push             = ArrayProto.push,
                slice            = ArrayProto.slice,
                concat           = ArrayProto.concat,
                toString         = ObjProto.toString,
                hasOwnProperty   = ObjProto.hasOwnProperty;

            // All **ECMAScript 5** native function implementations that we hope to use
            // are declared here.
            var
                nativeForEach      = ArrayProto.forEach,
                nativeMap          = ArrayProto.map,
                nativeReduce       = ArrayProto.reduce,
                nativeReduceRight  = ArrayProto.reduceRight,
                nativeFilter       = ArrayProto.filter,
                nativeEvery        = ArrayProto.every,
                nativeSome         = ArrayProto.some,
                nativeIndexOf      = ArrayProto.indexOf,
                nativeLastIndexOf  = ArrayProto.lastIndexOf,
                nativeIsArray      = Array.isArray,
                nativeKeys         = Object.keys,
                nativeBind         = FuncProto.bind;

            // Create a safe reference to the Underscore object for use below.
            var _ = function(obj) {
                if (obj instanceof _) return obj;
                if (!(this instanceof _)) return new _(obj);
                this._wrapped = obj;
            };

            // Export the Underscore object for **Node.js**, with
            // backwards-compatibility for the old `require()` API. If we're in
            // the browser, add `_` as a global object via a string identifier,
            // for Closure Compiler "advanced" mode.
            if (typeof exports !== 'undefined') {
                if (typeof module !== 'undefined' && module.exports) {
                    exports = module.exports = _;
                }
                exports._ = _;
            } else {
                root._ = _;
            }

            // Current version.
            _.VERSION = '1.4.4';

            // Collection Functions
            // --------------------

            // The cornerstone, an `each` implementation, aka `forEach`.
            // Handles objects with the built-in `forEach`, arrays, and raw objects.
            // Delegates to **ECMAScript 5**'s native `forEach` if available.
            var each = _.each = _.forEach = function(obj, iterator, context) {
                if (obj == null) return;
                if (nativeForEach && obj.forEach === nativeForEach) {
                    obj.forEach(iterator, context);
                } else if (obj.length === +obj.length) {
                    for (var i = 0, l = obj.length; i < l; i++) {
                        if (iterator.call(context, obj[i], i, obj) === breaker) return;
                    }
                } else {
                    for (var key in obj) {
                        if (_.has(obj, key)) {
                            if (iterator.call(context, obj[key], key, obj) === breaker) return;
                        }
                    }
                }
            };

            // Return the results of applying the iterator to each element.
            // Delegates to **ECMAScript 5**'s native `map` if available.
            _.map = _.collect = function(obj, iterator, context) {
                var results = [];
                if (obj == null) return results;
                if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
                each(obj, function(value, index, list) {
                    results[results.length] = iterator.call(context, value, index, list);
                });
                return results;
            };

            var reduceError = 'Reduce of empty array with no initial value';

            // **Reduce** builds up a single result from a list of values, aka `inject`,
            // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
            _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
                var initial = arguments.length > 2;
                if (obj == null) obj = [];
                if (nativeReduce && obj.reduce === nativeReduce) {
                    if (context) iterator = _.bind(iterator, context);
                    return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
                }
                each(obj, function(value, index, list) {
                    if (!initial) {
                        memo = value;
                        initial = true;
                    } else {
                        memo = iterator.call(context, memo, value, index, list);
                    }
                });
                if (!initial) throw new TypeError(reduceError);
                return memo;
            };

            // The right-associative version of reduce, also known as `foldr`.
            // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
            _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
                var initial = arguments.length > 2;
                if (obj == null) obj = [];
                if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
                    if (context) iterator = _.bind(iterator, context);
                    return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
                }
                var length = obj.length;
                if (length !== +length) {
                    var keys = _.keys(obj);
                    length = keys.length;
                }
                each(obj, function(value, index, list) {
                    index = keys ? keys[--length] : --length;
                    if (!initial) {
                        memo = obj[index];
                        initial = true;
                    } else {
                        memo = iterator.call(context, memo, obj[index], index, list);
                    }
                });
                if (!initial) throw new TypeError(reduceError);
                return memo;
            };

            // Return the first value which passes a truth test. Aliased as `detect`.
            _.find = _.detect = function(obj, iterator, context) {
                var result;
                any(obj, function(value, index, list) {
                    if (iterator.call(context, value, index, list)) {
                        result = value;
                        return true;
                    }
                });
                return result;
            };

            // Return all the elements that pass a truth test.
            // Delegates to **ECMAScript 5**'s native `filter` if available.
            // Aliased as `select`.
            _.filter = _.select = function(obj, iterator, context) {
                var results = [];
                if (obj == null) return results;
                if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
                each(obj, function(value, index, list) {
                    if (iterator.call(context, value, index, list)) results[results.length] = value;
                });
                return results;
            };

            // Return all the elements for which a truth test fails.
            _.reject = function(obj, iterator, context) {
                return _.filter(obj, function(value, index, list) {
                    return !iterator.call(context, value, index, list);
                }, context);
            };

            // Determine whether all of the elements match a truth test.
            // Delegates to **ECMAScript 5**'s native `every` if available.
            // Aliased as `all`.
            _.every = _.all = function(obj, iterator, context) {
                iterator || (iterator = _.identity);
                var result = true;
                if (obj == null) return result;
                if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
                each(obj, function(value, index, list) {
                    if (!(result = result && iterator.call(context, value, index, list))) return breaker;
                });
                return !!result;
            };

            // Determine if at least one element in the object matches a truth test.
            // Delegates to **ECMAScript 5**'s native `some` if available.
            // Aliased as `any`.
            var any = _.some = _.any = function(obj, iterator, context) {
                iterator || (iterator = _.identity);
                var result = false;
                if (obj == null) return result;
                if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
                each(obj, function(value, index, list) {
                    if (result || (result = iterator.call(context, value, index, list))) return breaker;
                });
                return !!result;
            };

            // Determine if the array or object contains a given value (using `===`).
            // Aliased as `include`.
            _.contains = _.include = function(obj, target) {
                if (obj == null) return false;
                if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
                return any(obj, function(value) {
                    return value === target;
                });
            };

            // Invoke a method (with arguments) on every item in a collection.
            _.invoke = function(obj, method) {
                var args = slice.call(arguments, 2);
                var isFunc = _.isFunction(method);
                return _.map(obj, function(value) {
                    return (isFunc ? method : value[method]).apply(value, args);
                });
            };

            // Convenience version of a common use case of `map`: fetching a property.
            _.pluck = function(obj, key) {
                return _.map(obj, function(value){ return value[key]; });
            };

            // Convenience version of a common use case of `filter`: selecting only objects
            // containing specific `key:value` pairs.
            _.where = function(obj, attrs, first) {
                if (_.isEmpty(attrs)) return first ? null : [];
                return _[first ? 'find' : 'filter'](obj, function(value) {
                    for (var key in attrs) {
                        if (attrs[key] !== value[key]) return false;
                    }
                    return true;
                });
            };

            // Convenience version of a common use case of `find`: getting the first object
            // containing specific `key:value` pairs.
            _.findWhere = function(obj, attrs) {
                return _.where(obj, attrs, true);
            };

            // Return the maximum element or (element-based computation).
            // Can't optimize arrays of integers longer than 65,535 elements.
            // See: https://bugs.webkit.org/show_bug.cgi?id=80797
            _.max = function(obj, iterator, context) {
                if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
                    return Math.max.apply(Math, obj);
                }
                if (!iterator && _.isEmpty(obj)) return -Infinity;
                var result = {computed : -Infinity, value: -Infinity};
                each(obj, function(value, index, list) {
                    var computed = iterator ? iterator.call(context, value, index, list) : value;
                    computed >= result.computed && (result = {value : value, computed : computed});
                });
                return result.value;
            };

            // Return the minimum element (or element-based computation).
            _.min = function(obj, iterator, context) {
                if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
                    return Math.min.apply(Math, obj);
                }
                if (!iterator && _.isEmpty(obj)) return Infinity;
                var result = {computed : Infinity, value: Infinity};
                each(obj, function(value, index, list) {
                    var computed = iterator ? iterator.call(context, value, index, list) : value;
                    computed < result.computed && (result = {value : value, computed : computed});
                });
                return result.value;
            };

            // Shuffle an array.
            _.shuffle = function(obj) {
                var rand;
                var index = 0;
                var shuffled = [];
                each(obj, function(value) {
                    rand = _.random(index++);
                    shuffled[index - 1] = shuffled[rand];
                    shuffled[rand] = value;
                });
                return shuffled;
            };

            // An internal function to generate lookup iterators.
            var lookupIterator = function(value) {
                return _.isFunction(value) ? value : function(obj){ return obj[value]; };
            };

            // Sort the object's values by a criterion produced by an iterator.
            _.sortBy = function(obj, value, context) {
                var iterator = lookupIterator(value);
                return _.pluck(_.map(obj, function(value, index, list) {
                    return {
                        value : value,
                        index : index,
                        criteria : iterator.call(context, value, index, list)
                    };
                }).sort(function(left, right) {
                    var a = left.criteria;
                    var b = right.criteria;
                    if (a !== b) {
                        if (a > b || a === void 0) return 1;
                        if (a < b || b === void 0) return -1;
                    }
                    return left.index < right.index ? -1 : 1;
                }), 'value');
            };

            // An internal function used for aggregate "group by" operations.
            var group = function(obj, value, context, behavior) {
                var result = {};
                var iterator = lookupIterator(value || _.identity);
                each(obj, function(value, index) {
                    var key = iterator.call(context, value, index, obj);
                    behavior(result, key, value);
                });
                return result;
            };

            // Groups the object's values by a criterion. Pass either a string attribute
            // to group by, or a function that returns the criterion.
            _.groupBy = function(obj, value, context) {
                return group(obj, value, context, function(result, key, value) {
                    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
                });
            };

            // Counts instances of an object that group by a certain criterion. Pass
            // either a string attribute to count by, or a function that returns the
            // criterion.
            _.countBy = function(obj, value, context) {
                return group(obj, value, context, function(result, key) {
                    if (!_.has(result, key)) result[key] = 0;
                    result[key]++;
                });
            };

            // Use a comparator function to figure out the smallest index at which
            // an object should be inserted so as to maintain order. Uses binary search.
            _.sortedIndex = function(array, obj, iterator, context) {
                iterator = iterator == null ? _.identity : lookupIterator(iterator);
                var value = iterator.call(context, obj);
                var low = 0, high = array.length;
                while (low < high) {
                    var mid = (low + high) >>> 1;
                    iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
                }
                return low;
            };

            // Safely convert anything iterable into a real, live array.
            _.toArray = function(obj) {
                if (!obj) return [];
                if (_.isArray(obj)) return slice.call(obj);
                if (obj.length === +obj.length) return _.map(obj, _.identity);
                return _.values(obj);
            };

            // Return the number of elements in an object.
            _.size = function(obj) {
                if (obj == null) return 0;
                return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
            };

            // Array Functions
            // ---------------

            // Get the first element of an array. Passing **n** will return the first N
            // values in the array. Aliased as `head` and `take`. The **guard** check
            // allows it to work with `_.map`.
            _.first = _.head = _.take = function(array, n, guard) {
                if (array == null) return void 0;
                return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
            };

            // Returns everything but the last entry of the array. Especially useful on
            // the arguments object. Passing **n** will return all the values in
            // the array, excluding the last N. The **guard** check allows it to work with
            // `_.map`.
            _.initial = function(array, n, guard) {
                return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
            };

            // Get the last element of an array. Passing **n** will return the last N
            // values in the array. The **guard** check allows it to work with `_.map`.
            _.last = function(array, n, guard) {
                if (array == null) return void 0;
                if ((n != null) && !guard) {
                    return slice.call(array, Math.max(array.length - n, 0));
                } else {
                    return array[array.length - 1];
                }
            };

            // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
            // Especially useful on the arguments object. Passing an **n** will return
            // the rest N values in the array. The **guard**
            // check allows it to work with `_.map`.
            _.rest = _.tail = _.drop = function(array, n, guard) {
                return slice.call(array, (n == null) || guard ? 1 : n);
            };

            // Trim out all falsy values from an array.
            _.compact = function(array) {
                return _.filter(array, _.identity);
            };

            // Internal implementation of a recursive `flatten` function.
            var flatten = function(input, shallow, output) {
                each(input, function(value) {
                    if (_.isArray(value)) {
                        shallow ? push.apply(output, value) : flatten(value, shallow, output);
                    } else {
                        output.push(value);
                    }
                });
                return output;
            };

            // Return a completely flattened version of an array.
            _.flatten = function(array, shallow) {
                return flatten(array, shallow, []);
            };

            // Return a version of the array that does not contain the specified value(s).
            _.without = function(array) {
                return _.difference(array, slice.call(arguments, 1));
            };

            // Produce a duplicate-free version of the array. If the array has already
            // been sorted, you have the option of using a faster algorithm.
            // Aliased as `unique`.
            _.uniq = _.unique = function(array, isSorted, iterator, context) {
                if (_.isFunction(isSorted)) {
                    context = iterator;
                    iterator = isSorted;
                    isSorted = false;
                }
                var initial = iterator ? _.map(array, iterator, context) : array;
                var results = [];
                var seen = [];
                each(initial, function(value, index) {
                    if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
                        seen.push(value);
                        results.push(array[index]);
                    }
                });
                return results;
            };

            // Produce an array that contains the union: each distinct element from all of
            // the passed-in arrays.
            _.union = function() {
                return _.uniq(concat.apply(ArrayProto, arguments));
            };

            // Produce an array that contains every item shared between all the
            // passed-in arrays.
            _.intersection = function(array) {
                var rest = slice.call(arguments, 1);
                return _.filter(_.uniq(array), function(item) {
                    return _.every(rest, function(other) {
                        return _.indexOf(other, item) >= 0;
                    });
                });
            };

            // Take the difference between one array and a number of other arrays.
            // Only the elements present in just the first array will remain.
            _.difference = function(array) {
                var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
                return _.filter(array, function(value){ return !_.contains(rest, value); });
            };

            // Zip together multiple lists into a single array -- elements that share
            // an index go together.
            _.zip = function() {
                var args = slice.call(arguments);
                var length = _.max(_.pluck(args, 'length'));
                var results = new Array(length);
                for (var i = 0; i < length; i++) {
                    results[i] = _.pluck(args, "" + i);
                }
                return results;
            };

            // Converts lists into objects. Pass either a single array of `[key, value]`
            // pairs, or two parallel arrays of the same length -- one of keys, and one of
            // the corresponding values.
            _.object = function(list, values) {
                if (list == null) return {};
                var result = {};
                for (var i = 0, l = list.length; i < l; i++) {
                    if (values) {
                        result[list[i]] = values[i];
                    } else {
                        result[list[i][0]] = list[i][1];
                    }
                }
                return result;
            };

            // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
            // we need this function. Return the position of the first occurrence of an
            // item in an array, or -1 if the item is not included in the array.
            // Delegates to **ECMAScript 5**'s native `indexOf` if available.
            // If the array is large and already in sort order, pass `true`
            // for **isSorted** to use binary search.
            _.indexOf = function(array, item, isSorted) {
                if (array == null) return -1;
                var i = 0, l = array.length;
                if (isSorted) {
                    if (typeof isSorted == 'number') {
                        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
                    } else {
                        i = _.sortedIndex(array, item);
                        return array[i] === item ? i : -1;
                    }
                }
                if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
                for (; i < l; i++) if (array[i] === item) return i;
                return -1;
            };

            // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
            _.lastIndexOf = function(array, item, from) {
                if (array == null) return -1;
                var hasIndex = from != null;
                if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
                    return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
                }
                var i = (hasIndex ? from : array.length);
                while (i--) if (array[i] === item) return i;
                return -1;
            };

            // Generate an integer Array containing an arithmetic progression. A port of
            // the native Python `range()` function. See
            // [the Python documentation](http://docs.python.org/library/functions.html#range).
            _.range = function(start, stop, step) {
                if (arguments.length <= 1) {
                    stop = start || 0;
                    start = 0;
                }
                step = arguments[2] || 1;

                var len = Math.max(Math.ceil((stop - start) / step), 0);
                var idx = 0;
                var range = new Array(len);

                while(idx < len) {
                    range[idx++] = start;
                    start += step;
                }

                return range;
            };

            // Function (ahem) Functions
            // ------------------

            // Create a function bound to a given object (assigning `this`, and arguments,
            // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
            // available.
            _.bind = function(func, context) {
                if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
                var args = slice.call(arguments, 2);
                return function() {
                    return func.apply(context, args.concat(slice.call(arguments)));
                };
            };

            // Partially apply a function by creating a version that has had some of its
            // arguments pre-filled, without changing its dynamic `this` context.
            _.partial = function(func) {
                var args = slice.call(arguments, 1);
                return function() {
                    return func.apply(this, args.concat(slice.call(arguments)));
                };
            };

            // Bind all of an object's methods to that object. Useful for ensuring that
            // all callbacks defined on an object belong to it.
            _.bindAll = function(obj) {
                var funcs = slice.call(arguments, 1);
                if (funcs.length === 0) funcs = _.functions(obj);
                each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
                return obj;
            };

            // Memoize an expensive function by storing its results.
            _.memoize = function(func, hasher) {
                var memo = {};
                hasher || (hasher = _.identity);
                return function() {
                    var key = hasher.apply(this, arguments);
                    return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
                };
            };

            // Delays a function for the given number of milliseconds, and then calls
            // it with the arguments supplied.
            _.delay = function(func, wait) {
                var args = slice.call(arguments, 2);
                return setTimeout(function(){ return func.apply(null, args); }, wait);
            };

            // Defers a function, scheduling it to run after the current call stack has
            // cleared.
            _.defer = function(func) {
                return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
            };

            // Returns a function, that, when invoked, will only be triggered at most once
            // during a given window of time.
            _.throttle = function(func, wait) {
                var context, args, timeout, result;
                var previous = 0;
                var later = function() {
                    previous = new Date;
                    timeout = null;
                    result = func.apply(context, args);
                };
                return function() {
                    var now = new Date;
                    var remaining = wait - (now - previous);
                    context = this;
                    args = arguments;
                    if (remaining <= 0) {
                        clearTimeout(timeout);
                        timeout = null;
                        previous = now;
                        result = func.apply(context, args);
                    } else if (!timeout) {
                        timeout = setTimeout(later, remaining);
                    }
                    return result;
                };
            };

            // Returns a function, that, as long as it continues to be invoked, will not
            // be triggered. The function will be called after it stops being called for
            // N milliseconds. If `immediate` is passed, trigger the function on the
            // leading edge, instead of the trailing.
            _.debounce = function(func, wait, immediate) {
                var timeout, result;
                return function() {
                    var context = this, args = arguments;
                    var later = function() {
                        timeout = null;
                        if (!immediate) result = func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) result = func.apply(context, args);
                    return result;
                };
            };

            // Returns a function that will be executed at most one time, no matter how
            // often you call it. Useful for lazy initialization.
            _.once = function(func) {
                var ran = false, memo;
                return function() {
                    if (ran) return memo;
                    ran = true;
                    memo = func.apply(this, arguments);
                    func = null;
                    return memo;
                };
            };

            // Returns the first function passed as an argument to the second,
            // allowing you to adjust arguments, run code before and after, and
            // conditionally execute the original function.
            _.wrap = function(func, wrapper) {
                return function() {
                    var args = [func];
                    push.apply(args, arguments);
                    return wrapper.apply(this, args);
                };
            };

            // Returns a function that is the composition of a list of functions, each
            // consuming the return value of the function that follows.
            _.compose = function() {
                var funcs = arguments;
                return function() {
                    var args = arguments;
                    for (var i = funcs.length - 1; i >= 0; i--) {
                        args = [funcs[i].apply(this, args)];
                    }
                    return args[0];
                };
            };

            // Returns a function that will only be executed after being called N times.
            _.after = function(times, func) {
                if (times <= 0) return func();
                return function() {
                    if (--times < 1) {
                        return func.apply(this, arguments);
                    }
                };
            };

            // Object Functions
            // ----------------

            // Retrieve the names of an object's properties.
            // Delegates to **ECMAScript 5**'s native `Object.keys`
            _.keys = nativeKeys || function(obj) {
                if (obj !== Object(obj)) throw new TypeError('Invalid object');
                var keys = [];
                for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
                return keys;
            };

            // Retrieve the values of an object's properties.
            _.values = function(obj) {
                var values = [];
                for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
                return values;
            };

            // Convert an object into a list of `[key, value]` pairs.
            _.pairs = function(obj) {
                var pairs = [];
                for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
                return pairs;
            };

            // Invert the keys and values of an object. The values must be serializable.
            _.invert = function(obj) {
                var result = {};
                for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
                return result;
            };

            // Return a sorted list of the function names available on the object.
            // Aliased as `methods`
            _.functions = _.methods = function(obj) {
                var names = [];
                for (var key in obj) {
                    if (_.isFunction(obj[key])) names.push(key);
                }
                return names.sort();
            };

            // Extend a given object with all the properties in passed-in object(s).
            _.extend = function(obj) {
                each(slice.call(arguments, 1), function(source) {
                    if (source) {
                        for (var prop in source) {
                            obj[prop] = source[prop];
                        }
                    }
                });
                return obj;
            };

            // Return a copy of the object only containing the whitelisted properties.
            _.pick = function(obj) {
                var copy = {};
                var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
                each(keys, function(key) {
                    if (key in obj) copy[key] = obj[key];
                });
                return copy;
            };

            // Return a copy of the object without the blacklisted properties.
            _.omit = function(obj) {
                var copy = {};
                var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
                for (var key in obj) {
                    if (!_.contains(keys, key)) copy[key] = obj[key];
                }
                return copy;
            };

            // Fill in a given object with default properties.
            _.defaults = function(obj) {
                each(slice.call(arguments, 1), function(source) {
                    if (source) {
                        for (var prop in source) {
                            if (obj[prop] == null) obj[prop] = source[prop];
                        }
                    }
                });
                return obj;
            };

            // Create a (shallow-cloned) duplicate of an object.
            _.clone = function(obj) {
                if (!_.isObject(obj)) return obj;
                return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
            };

            // Invokes interceptor with the obj, and then returns obj.
            // The primary purpose of this method is to "tap into" a method chain, in
            // order to perform operations on intermediate results within the chain.
            _.tap = function(obj, interceptor) {
                interceptor(obj);
                return obj;
            };

            // Internal recursive comparison function for `isEqual`.
            var eq = function(a, b, aStack, bStack) {
                // Identical objects are equal. `0 === -0`, but they aren't identical.
                // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
                if (a === b) return a !== 0 || 1 / a == 1 / b;
                // A strict comparison is necessary because `null == undefined`.
                if (a == null || b == null) return a === b;
                // Unwrap any wrapped objects.
                if (a instanceof _) a = a._wrapped;
                if (b instanceof _) b = b._wrapped;
                // Compare `[[Class]]` names.
                var className = toString.call(a);
                if (className != toString.call(b)) return false;
                switch (className) {
                    // Strings, numbers, dates, and booleans are compared by value.
                    case '[object String]':
                        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                        // equivalent to `new String("5")`.
                        return a == String(b);
                    case '[object Number]':
                        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
                        // other numeric values.
                        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
                    case '[object Date]':
                    case '[object Boolean]':
                        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                        // millisecond representations. Note that invalid dates with millisecond representations
                        // of `NaN` are not equivalent.
                        return +a == +b;
                    // RegExps are compared by their source patterns and flags.
                    case '[object RegExp]':
                        return a.source == b.source &&
                            a.global == b.global &&
                            a.multiline == b.multiline &&
                            a.ignoreCase == b.ignoreCase;
                }
                if (typeof a != 'object' || typeof b != 'object') return false;
                // Assume equality for cyclic structures. The algorithm for detecting cyclic
                // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
                var length = aStack.length;
                while (length--) {
                    // Linear search. Performance is inversely proportional to the number of
                    // unique nested structures.
                    if (aStack[length] == a) return bStack[length] == b;
                }
                // Add the first object to the stack of traversed objects.
                aStack.push(a);
                bStack.push(b);
                var size = 0, result = true;
                // Recursively compare objects and arrays.
                if (className == '[object Array]') {
                    // Compare array lengths to determine if a deep comparison is necessary.
                    size = a.length;
                    result = size == b.length;
                    if (result) {
                        // Deep compare the contents, ignoring non-numeric properties.
                        while (size--) {
                            if (!(result = eq(a[size], b[size], aStack, bStack))) break;
                        }
                    }
                } else {
                    // Objects with different constructors are not equivalent, but `Object`s
                    // from different frames are.
                    var aCtor = a.constructor, bCtor = b.constructor;
                    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                        _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
                        return false;
                    }
                    // Deep compare objects.
                    for (var key in a) {
                        if (_.has(a, key)) {
                            // Count the expected number of properties.
                            size++;
                            // Deep compare each member.
                            if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
                        }
                    }
                    // Ensure that both objects contain the same number of properties.
                    if (result) {
                        for (key in b) {
                            if (_.has(b, key) && !(size--)) break;
                        }
                        result = !size;
                    }
                }
                // Remove the first object from the stack of traversed objects.
                aStack.pop();
                bStack.pop();
                return result;
            };

            // Perform a deep comparison to check if two objects are equal.
            _.isEqual = function(a, b) {
                return eq(a, b, [], []);
            };

            // Is a given array, string, or object empty?
            // An "empty" object has no enumerable own-properties.
            _.isEmpty = function(obj) {
                if (obj == null) return true;
                if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
                for (var key in obj) if (_.has(obj, key)) return false;
                return true;
            };

            // Is a given value a DOM element?
            _.isElement = function(obj) {
                return !!(obj && obj.nodeType === 1);
            };

            // Is a given value an array?
            // Delegates to ECMA5's native Array.isArray
            _.isArray = nativeIsArray || function(obj) {
                return toString.call(obj) == '[object Array]';
            };

            // Is a given variable an object?
            _.isObject = function(obj) {
                return obj === Object(obj);
            };

            // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
            each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
                _['is' + name] = function(obj) {
                    return toString.call(obj) == '[object ' + name + ']';
                };
            });

            // Define a fallback version of the method in browsers (ahem, IE), where
            // there isn't any inspectable "Arguments" type.
            if (!_.isArguments(arguments)) {
                _.isArguments = function(obj) {
                    return !!(obj && _.has(obj, 'callee'));
                };
            }

            // Optimize `isFunction` if appropriate.
            if (typeof (/./) !== 'function') {
                _.isFunction = function(obj) {
                    return typeof obj === 'function';
                };
            }

            // Is a given object a finite number?
            _.isFinite = function(obj) {
                return isFinite(obj) && !isNaN(parseFloat(obj));
            };

            // Is the given value `NaN`? (NaN is the only number which does not equal itself).
            _.isNaN = function(obj) {
                return _.isNumber(obj) && obj != +obj;
            };

            // Is a given value a boolean?
            _.isBoolean = function(obj) {
                return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
            };

            // Is a given value equal to null?
            _.isNull = function(obj) {
                return obj === null;
            };

            // Is a given variable undefined?
            _.isUndefined = function(obj) {
                return obj === void 0;
            };

            // Shortcut function for checking if an object has a given property directly
            // on itself (in other words, not on a prototype).
            _.has = function(obj, key) {
                return hasOwnProperty.call(obj, key);
            };

            // Utility Functions
            // -----------------

            // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
            // previous owner. Returns a reference to the Underscore object.
            _.noConflict = function() {
                root._ = previousUnderscore;
                return this;
            };

            // Keep the identity function around for default iterators.
            _.identity = function(value) {
                return value;
            };

            // Run a function **n** times.
            _.times = function(n, iterator, context) {
                var accum = Array(n);
                for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
                return accum;
            };

            // Return a random integer between min and max (inclusive).
            _.random = function(min, max) {
                if (max == null) {
                    max = min;
                    min = 0;
                }
                return min + Math.floor(Math.random() * (max - min + 1));
            };

            // List of HTML entities for escaping.
            var entityMap = {
                escape: {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '/': '&#x2F;'
                }
            };
            entityMap.unescape = _.invert(entityMap.escape);

            // Regexes containing the keys and values listed immediately above.
            var entityRegexes = {
                escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
                unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
            };

            // Functions for escaping and unescaping strings to/from HTML interpolation.
            _.each(['escape', 'unescape'], function(method) {
                _[method] = function(string) {
                    if (string == null) return '';
                    return ('' + string).replace(entityRegexes[method], function(match) {
                        return entityMap[method][match];
                    });
                };
            });

            // If the value of the named property is a function then invoke it;
            // otherwise, return it.
            _.result = function(object, property) {
                if (object == null) return null;
                var value = object[property];
                return _.isFunction(value) ? value.call(object) : value;
            };

            // Add your own custom functions to the Underscore object.
            _.mixin = function(obj) {
                each(_.functions(obj), function(name){
                    var func = _[name] = obj[name];
                    _.prototype[name] = function() {
                        var args = [this._wrapped];
                        push.apply(args, arguments);
                        return result.call(this, func.apply(_, args));
                    };
                });
            };

            // Generate a unique integer id (unique within the entire client session).
            // Useful for temporary DOM ids.
            var idCounter = 0;
            _.uniqueId = function(prefix) {
                var id = ++idCounter + '';
                return prefix ? prefix + id : id;
            };

            // By default, Underscore uses ERB-style template delimiters, change the
            // following template settings to use alternative delimiters.
            _.templateSettings = {
                evaluate    : /<%([\s\S]+?)%>/g,
                interpolate : /<%=([\s\S]+?)%>/g,
                escape      : /<%-([\s\S]+?)%>/g
            };

            // When customizing `templateSettings`, if you don't want to define an
            // interpolation, evaluation or escaping regex, we need one that is
            // guaranteed not to match.
            var noMatch = /(.)^/;

            // Certain characters need to be escaped so that they can be put into a
            // string literal.
            var escapes = {
                "'":      "'",
                '\\':     '\\',
                '\r':     'r',
                '\n':     'n',
                '\t':     't',
                '\u2028': 'u2028',
                '\u2029': 'u2029'
            };

            var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

            // JavaScript micro-templating, similar to John Resig's implementation.
            // Underscore templating handles arbitrary delimiters, preserves whitespace,
            // and correctly escapes quotes within interpolated code.
            _.template = function(text, data, settings) {
                var render;
                settings = _.defaults({}, settings, _.templateSettings);

                // Combine delimiters into one regular expression via alternation.
                var matcher = new RegExp([
                    (settings.escape || noMatch).source,
                    (settings.interpolate || noMatch).source,
                    (settings.evaluate || noMatch).source
                ].join('|') + '|$', 'g');

                // Compile the template source, escaping string literals appropriately.
                var index = 0;
                var source = "__p+='";
                text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
                    source += text.slice(index, offset)
                        .replace(escaper, function(match) { return '\\' + escapes[match]; });

                    if (escape) {
                        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
                    }
                    if (interpolate) {
                        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
                    }
                    if (evaluate) {
                        source += "';\n" + evaluate + "\n__p+='";
                    }
                    index = offset + match.length;
                    return match;
                });
                source += "';\n";

                // If a variable is not specified, place data values in local scope.
                if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

                source = "var __t,__p='',__j=Array.prototype.join," +
                    "print=function(){__p+=__j.call(arguments,'');};\n" +
                    source + "return __p;\n";

                try {
                    render = new Function(settings.variable || 'obj', '_', source);
                } catch (e) {
                    e.source = source;
                    throw e;
                }

                if (data) return render(data, _);
                var template = function(data) {
                    return render.call(this, data, _);
                };

                // Provide the compiled function source as a convenience for precompilation.
                template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

                return template;
            };

            // Add a "chain" function, which will delegate to the wrapper.
            _.chain = function(obj) {
                return _(obj).chain();
            };

            // OOP
            // ---------------
            // If Underscore is called as a function, it returns a wrapped object that
            // can be used OO-style. This wrapper holds altered versions of all the
            // underscore functions. Wrapped objects may be chained.

            // Helper function to continue chaining intermediate results.
            var result = function(obj) {
                return this._chain ? _(obj).chain() : obj;
            };

            // Add all of the Underscore functions to the wrapper object.
            _.mixin(_);

            // Add all mutator Array functions to the wrapper.
            each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
                var method = ArrayProto[name];
                _.prototype[name] = function() {
                    var obj = this._wrapped;
                    method.apply(obj, arguments);
                    if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
                    return result.call(this, obj);
                };
            });

            // Add all accessor Array functions to the wrapper.
            each(['concat', 'join', 'slice'], function(name) {
                var method = ArrayProto[name];
                _.prototype[name] = function() {
                    return result.call(this, method.apply(this._wrapped, arguments));
                };
            });

            _.extend(_.prototype, {

                // Start chaining a wrapped Underscore object.
                chain: function() {
                    this._chain = true;
                    return this;
                },

                // Extracts the result from a wrapped and chained object.
                value: function() {
                    return this._wrapped;
                }

            });

        }).call(this);

    },{}],38:[function(require,module,exports){
        (function (global){
/// shim for browser packaging

            module.exports = function() {
                return global.WebSocket || global.MozWebSocket;
            }

        }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{}]},{},[3]);
