(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var option = {
    cache: false,
    jsonpCallback: "handler",
}

function Ajax(type) {
    // console.log(arguments);

    var tmp = {
        type: arguments[0],
        dataType: arguments[0] == 'jsonp' ? 'jsonp' : 'json'
    };
    return function (url, para, cb, err, env) {
        $.extend(option, tmp, {
            // processData: false, //此处指定对上传数据不做默认的读取字符串的操作
            // contentType: false, //此处指定对上传数据不做默认的读取字符串的操作
            success: function (res) {
                cb && cb(res, para, env);
            },
            error: function (e) {
                alert(JSON.stringify(e));
                err && err(e, env);
            }
        });
        option.url = url;
        option.data = para ? para : '';
        $.ajax(option);
    }
}

var ajax = {
    json: new Ajax('get'),
    jsonp: new Ajax('get', 'jsonp'),
    post: new Ajax('post'),
    postp: new Ajax('post', 'jsonp')
};
module.exports = ajax;

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){

/*!
 * EJS
 * Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , path = require('path')
  , dirname = path.dirname
  , extname = path.extname
  , join = path.join
  , fs = require('fs')
  , read = fs.readFileSync;

/**
 * Filters.
 *
 * @type Object
 */

var filters = exports.filters = require('./filters');

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

exports.clearCache = function(){
  cache = {};
};

/**
 * Translate filtered code into function calls.
 *
 * @param {String} js
 * @return {String}
 * @api private
 */

function filtered(js) {
  return js.substr(1).split('|').reduce(function(js, filter){
    var parts = filter.split(':')
      , name = parts.shift()
      , args = parts.join(':') || '';
    if (args) args = ', ' + args;
    return 'filters.' + name + '(' + js + args + ')';
  });
};

/**
 * Re-throw the given `err` in context to the
 * `str` of ejs, `filename`, and `lineno`.
 *
 * @param {Error} err
 * @param {String} str
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

function rethrow(err, str, filename, lineno){
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}

/**
 * Parse the given `str` of ejs, returning the function body.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

var parse = exports.parse = function(str, options){
  var options = options || {}
    , open = options.open || exports.open || '<%'
    , close = options.close || exports.close || '%>'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , buf = "";

  buf += 'var buf = [];';
  if (false !== options._with) buf += '\nwith (locals || {}) { (function(){ ';
  buf += '\n buf.push(\'';

  var lineno = 1;

  var consumeEOL = false;
  for (var i = 0, len = str.length; i < len; ++i) {
    var stri = str[i];
    if (str.slice(i, open.length + i) == open) {
      i += open.length

      var prefix, postfix, line = (compileDebug ? '__stack.lineno=' : '') + lineno;
      switch (str[i]) {
        case '=':
          prefix = "', escape((" + line + ', ';
          postfix = ")), '";
          ++i;
          break;
        case '-':
          prefix = "', (" + line + ', ';
          postfix = "), '";
          ++i;
          break;
        default:
          prefix = "');" + line + ';';
          postfix = "; buf.push('";
      }

      var end = str.indexOf(close, i);

      if (end < 0){
        throw new Error('Could not find matching close tag "' + close + '".');
      }

      var js = str.substring(i, end)
        , start = i
        , include = null
        , n = 0;

      if ('-' == js[js.length-1]){
        js = js.substring(0, js.length - 2);
        consumeEOL = true;
      }

      if (0 == js.trim().indexOf('include')) {
        var name = js.trim().slice(7).trim();
        if (!filename) throw new Error('filename option is required for includes');
        var path = resolveInclude(name, filename);
        include = read(path, 'utf8');
        include = exports.parse(include, { filename: path, _with: false, open: open, close: close, compileDebug: compileDebug });
        buf += "' + (function(){" + include + "})() + '";
        js = '';
      }

      while (~(n = js.indexOf("\n", n))) n++, lineno++;
      if (js.substr(0, 1) == ':') js = filtered(js);
      if (js) {
        if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';
        buf += prefix;
        buf += js;
        buf += postfix;
      }
      i += end - start + close.length - 1;

    } else if (stri == "\\") {
      buf += "\\\\";
    } else if (stri == "'") {
      buf += "\\'";
    } else if (stri == "\r") {
      // ignore
    } else if (stri == "\n") {
      if (consumeEOL) {
        consumeEOL = false;
      } else {
        buf += "\\n";
        lineno++;
      }
    } else {
      buf += stri;
    }
  }

  if (false !== options._with) buf += "'); })();\n} \nreturn buf.join('');";
  else buf += "');\nreturn buf.join('');";
  return buf;
};

/**
 * Compile the given `str` of ejs into a `Function`.
 *
 * @param {String} str
 * @param {Object} options
 * @return {Function}
 * @api public
 */

var compile = exports.compile = function(str, options){
  options = options || {};
  var escape = options.escape || utils.escape;

  var input = JSON.stringify(str)
    , compileDebug = options.compileDebug !== false
    , client = options.client
    , filename = options.filename
        ? JSON.stringify(options.filename)
        : 'undefined';

  if (compileDebug) {
    // Adds the fancy stack trace meta info
    str = [
      'var __stack = { lineno: 1, input: ' + input + ', filename: ' + filename + ' };',
      rethrow.toString(),
      'try {',
      exports.parse(str, options),
      '} catch (err) {',
      '  rethrow(err, __stack.input, __stack.filename, __stack.lineno);',
      '}'
    ].join("\n");
  } else {
    str = exports.parse(str, options);
  }

  if (options.debug) console.log(str);
  if (client) str = 'escape = escape || ' + escape.toString() + ';\n' + str;

  try {
    var fn = new Function('locals, filters, escape, rethrow', str);
  } catch (err) {
    if ('SyntaxError' == err.name) {
      err.message += options.filename
        ? ' in ' + filename
        : ' while compiling ejs';
    }
    throw err;
  }

  if (client) return fn;

  return function(locals){
    return fn.call(this, locals, filters, escape, rethrow);
  }
};

/**
 * Render the given `str` of ejs.
 *
 * Options:
 *
 *   - `locals`          Local variables object
 *   - `cache`           Compiled functions are cached, requires `filename`
 *   - `filename`        Used by `cache` to key caches
 *   - `scope`           Function execution context
 *   - `debug`           Output generated function body
 *   - `open`            Open tag, defaulting to "<%"
 *   - `close`           Closing tag, defaulting to "%>"
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api public
 */

exports.render = function(str, options){
  var fn
    , options = options || {};

  if (options.cache) {
    if (options.filename) {
      fn = cache[options.filename] || (cache[options.filename] = compile(str, options));
    } else {
      throw new Error('"cache" option requires "filename".');
    }
  } else {
    fn = compile(str, options);
  }

  options.__proto__ = options.locals;
  return fn.call(options.scope, options);
};

/**
 * Render an EJS file at the given `path` and callback `fn(err, str)`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @param {Function} fn
 * @api public
 */

exports.renderFile = function(path, options, fn){
  var key = path + ':string';

  if ('function' == typeof options) {
    fn = options, options = {};
  }

  options.filename = path;

  var str;
  try {
    str = options.cache
      ? cache[key] || (cache[key] = read(path, 'utf8'))
      : read(path, 'utf8');
  } catch (err) {
    fn(err);
    return;
  }
  fn(null, exports.render(str, options));
};

/**
 * Resolve include `name` relative to `filename`.
 *
 * @param {String} name
 * @param {String} filename
 * @return {String}
 * @api private
 */

function resolveInclude(name, filename) {
  var path = join(dirname(filename), name);
  var ext = extname(name);
  if (!ext) path += '.ejs';
  return path;
}

// express support

exports.__express = exports.renderFile;

/**
 * Expose to require().
 */

if (require.extensions) {
  require.extensions['.ejs'] = function (module, filename) {
    filename = filename || module.filename;
    var options = { filename: filename, client: true }
      , template = fs.readFileSync(filename).toString()
      , fn = compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
} else if (require.registerExtension) {
  require.registerExtension('.ejs', function(src) {
    return compile(src, {});
  });
}

},{"./filters":4,"./utils":5,"fs":2,"path":6}],4:[function(require,module,exports){
/*!
 * EJS - Filters
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * First element of the target `obj`.
 */

exports.first = function(obj) {
  return obj[0];
};

/**
 * Last element of the target `obj`.
 */

exports.last = function(obj) {
  return obj[obj.length - 1];
};

/**
 * Capitalize the first letter of the target `str`.
 */

exports.capitalize = function(str){
  str = String(str);
  return str[0].toUpperCase() + str.substr(1, str.length);
};

/**
 * Downcase the target `str`.
 */

exports.downcase = function(str){
  return String(str).toLowerCase();
};

/**
 * Uppercase the target `str`.
 */

exports.upcase = function(str){
  return String(str).toUpperCase();
};

/**
 * Sort the target `obj`.
 */

exports.sort = function(obj){
  return Object.create(obj).sort();
};

/**
 * Sort the target `obj` by the given `prop` ascending.
 */

exports.sort_by = function(obj, prop){
  return Object.create(obj).sort(function(a, b){
    a = a[prop], b = b[prop];
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  });
};

/**
 * Size or length of the target `obj`.
 */

exports.size = exports.length = function(obj) {
  return obj.length;
};

/**
 * Add `a` and `b`.
 */

exports.plus = function(a, b){
  return Number(a) + Number(b);
};

/**
 * Subtract `b` from `a`.
 */

exports.minus = function(a, b){
  return Number(a) - Number(b);
};

/**
 * Multiply `a` by `b`.
 */

exports.times = function(a, b){
  return Number(a) * Number(b);
};

/**
 * Divide `a` by `b`.
 */

exports.divided_by = function(a, b){
  return Number(a) / Number(b);
};

/**
 * Join `obj` with the given `str`.
 */

exports.join = function(obj, str){
  return obj.join(str || ', ');
};

/**
 * Truncate `str` to `len`.
 */

exports.truncate = function(str, len, append){
  str = String(str);
  if (str.length > len) {
    str = str.slice(0, len);
    if (append) str += append;
  }
  return str;
};

/**
 * Truncate `str` to `n` words.
 */

exports.truncate_words = function(str, n){
  var str = String(str)
    , words = str.split(/ +/);
  return words.slice(0, n).join(' ');
};

/**
 * Replace `pattern` with `substitution` in `str`.
 */

exports.replace = function(str, pattern, substitution){
  return String(str).replace(pattern, substitution || '');
};

/**
 * Prepend `val` to `obj`.
 */

exports.prepend = function(obj, val){
  return Array.isArray(obj)
    ? [val].concat(obj)
    : val + obj;
};

/**
 * Append `val` to `obj`.
 */

exports.append = function(obj, val){
  return Array.isArray(obj)
    ? obj.concat(val)
    : obj + val;
};

/**
 * Map the given `prop`.
 */

exports.map = function(arr, prop){
  return arr.map(function(obj){
    return obj[prop];
  });
};

/**
 * Reverse the given `obj`.
 */

exports.reverse = function(obj){
  return Array.isArray(obj)
    ? obj.reverse()
    : String(obj).split('').reverse().join('');
};

/**
 * Get `prop` of the given `obj`.
 */

exports.get = function(obj, prop){
  return obj[prop];
};

/**
 * Packs the given `obj` into json string
 */
exports.json = function(obj){
  return JSON.stringify(obj);
};

},{}],5:[function(require,module,exports){

/*!
 * EJS
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function(html){
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
};
 

},{}],6:[function(require,module,exports){
(function (process){
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":7}],7:[function(require,module,exports){
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

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
/** 大度假问卷通用的js */

window.ejs = require('ejs');
window.ajax = require('../../common/js/ajax.js');

/** 表单序列化 */
$.fn.serializeObject = function()
{
   var o = {};
   var a = this.serializeArray();
   $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
   });
   return o;
};

/** 去空表单序列化 */
$.fn.serializeObjectNull = function()
{
   var o = {};
   var a = this.serializeArray();
   $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           if(this.value){
               o[this.name].push(this.value);
           }
       } else {
           this.value ? o[this.name] = this.value : "";
       }
   });
   return o;
};

(function () {
    var app = {
        
        init: function () {
            FastClick.attach(document.body);
            this.initTimer();
            this.initEvent();
        },
        //开启定时器, 这个定时器是为了bigpipe才设置的
        initTimer: function () {
            var _ = this;

            
        },
        //初始化监听事件
        initEvent: function () {

        }
    }

    app.init();

})();
},{"../../common/js/ajax.js":1,"ejs":3}]},{},[8]);

//# sourceMappingURL=apps.js.map
