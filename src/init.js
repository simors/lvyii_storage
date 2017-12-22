'use strict';

var LY = require('./ly');

var _require = require('./utils'),
    isNullOrUndefined = _require.isNullOrUndefined;

var _require2 = require('underscore'),
    extend = _require2.extend,
    isObject = _require2.isObject;

var fillServerURLs = function fillServerURLs(url) {
  return {
    push: url,
    stats: url,
    engine: url,
    api: url
  };
};

/**
  * Call this method first to set up your authentication tokens for LY.
  * @function LY.init
  * @param {Object} options
  * @param {String} options.appId application id
  * @param {String} options.appKey application key
  * @param {Boolean} [options.production]
  * @param {String|ServerURLs} [options.serverURLs] URLs for services. if a string was given, it will be applied for all services.
  */
LY.init = function init(options) {
  if (!isObject(options)) {
    return LY.init({
      appId: options,
      appKey: arguments.length <= 1 ? undefined : arguments[1],
    });
  }
  var appId = options.appId,
      appKey = options.appKey,
      serverURLs = options.serverURLs,
      production = options.production

  if (LY.applicationId) throw new Error('SDK is already initialized.');
  if (!appId) throw new TypeError('appId must be a string');
  if (!appKey) throw new TypeError('appKey must be a string');
  LY._config.applicationId = appId;
  LY._config.applicationKey = appKey;
  if (typeof production !== 'undefined') LY._config.production = production;
  LY._setServerURLs(serverURLs);
};

/**
 * Call this method to set production environment variable.
 * @function LY.setProduction
 * @param {Boolean} production True is production environment,and
 *  it's true by default.
 */
LY.setProduction = function (production) {
  if (!isNullOrUndefined(production)) {
    LY._config.production = production ? 1 : 0;
  } else {
    // change to default value
    LY._config.production = null;
  }
};

LY._setServerURLs = function (urls) {
  if (typeof urls !== 'string') {
    extend(LY._config.serverURLs, urls);
  } else {
    LY._config.serverURLs = fillServerURLs(urls);
  }
};

/**
 * set server URLs for services.
 * @function LY.setServerURLs
 * @since 3.0.0
 * @param {String|ServerURLs} urls URLs for services. if a string was given, it will be applied for all services.
 * You can also set them when initializing SDK with `options.serverURLs`
 */
LY.setServerURLs = function (urls) {
  return LY._setServerURLs(urls);
};

LY.keepErrorRawMessage = function (value) {
  LY._sharedConfig.keepErrorRawMessage = value;
};

// backword compatible
LY.initialize = LY.init;

var defineConfig = function defineConfig(property) {
  return Object.defineProperty(LY, property, {
    get: function get() {
      return LY._config[property];
    },
    set: function set(value) {
      LY._config[property] = value;
    }
  });
};

['applicationId', 'applicationKey'].forEach(defineConfig);