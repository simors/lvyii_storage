'use strict';

var _ = require('underscore');
var md5 = require('md5');

var _require = require('underscore'),
    extend = _require.extend;

var Promise = require('./promise');
var LY = require('./ly');

var _require2 = require('./utils'),
    getSessionToken = _require2.getSessionToken,
    ajax = _require2.ajax;

// 计算 X-LY-Sign 的签名方法
var sign = function sign(key) {
  var now = new Date().getTime();
  var signature = md5(now + key);
  return signature + ',' + now;
};

var setAppKey = function setAppKey(headers, signKey) {
  if (signKey) {
    headers['X-LY-Sign'] = sign(LY.applicationKey);
  } else {
    headers['X-LY-Key'] = LY.applicationKey;
  }
};

var setHeaders = function setHeaders() {
  var authOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var signKey = arguments[1];

  var headers = {
    'X-LY-Id': LY.applicationId,
    'Content-Type': 'application/json;charset=UTF-8'
  };
  setAppKey(headers, signKey);
  if (LY._config.production !== null) {
    headers['X-LY-Prod'] = String(LY._config.production);
  }
  headers[!process.env.CLIENT_PLATFORM ? 'User-Agent' : 'X-LY-UA'] = LY._sharedConfig.userAgent;

  return Promise.resolve().then(function () {
    // Pass the session token
    var sessionToken = getSessionToken(authOptions);
    if (sessionToken) {
      headers['X-LY-Session'] = sessionToken;
    }
    return headers;
  });
};

var createApiUrl = function createApiUrl(_ref) {
  var _ref$service = _ref.service,
      service = _ref$service === undefined ? 'api' : _ref$service,
      _ref$version = _ref.version,
      version = _ref$version === undefined ? '1' : _ref$version,
      path = _ref.path;

  var apiURL = LY._config.serverURLs[service];

  if (!apiURL) throw new Error('undefined server URL for ' + service);

  if (apiURL.charAt(apiURL.length - 1) !== '/') {
    apiURL += '/';
  }
  apiURL += version;
  if (path) {
    apiURL += path;
  }

  return apiURL;
};

/**
 * Low level REST API client. Call REST endpoints with authorization headers.
 * @function LY.request
 * @since 3.0.0
 * @param {Object} options
 * @param {String} options.method HTTP method
 * @param {String} options.path endpoint path, e.g. `/classes/Test/55759577e4b029ae6015ac20`
 * @param {Object} [options.query] query string dict
 * @param {Object} [options.data] HTTP body
 * @param {AuthOptions} [options.authOptions]
 * @param {String} [options.service = 'api']
 * @param {String} [options.version = '1.1']
 */
var request = function request(_ref2) {
  var service = _ref2.service,
      version = _ref2.version,
      method = _ref2.method,
      path = _ref2.path,
      query = _ref2.query,
      _ref2$data = _ref2.data,
      data = _ref2$data === undefined ? {} : _ref2$data,
      authOptions = _ref2.authOptions,
      _ref2$signKey = _ref2.signKey,
      signKey = _ref2$signKey === undefined ? true : _ref2$signKey;

  if (!(LY.applicationId && LY.applicationKey)) {
    throw new Error('Not initialized');
  }
  var url = createApiUrl({ service: service, path: path, version: version });
  return setHeaders(authOptions, signKey).then(function (headers) {
    return ajax({ method: method, url: url, query: query, data: data, headers: headers }).catch(function (error) {
      var errorJSON = {
        code: error.code || -1,
        error: error.message || error.responseText
      };
      if (error.response && error.response.code) {
        errorJSON = error.response;
      } else if (error.responseText) {
        try {
          errorJSON = JSON.parse(error.responseText);
        } catch (e) {
          // If we fail to parse the error text, that's okay.
        }
      }
      errorJSON.rawMessage = errorJSON.rawMessage || errorJSON.error;
      if (!LY._sharedConfig.keepErrorRawMessage) {
        errorJSON.error += ' [' + (error.statusCode || 'N/A') + ' ' + method + ' ' + url + ']';
      }
      // Transform the error into an instance of LYError by trying to parse
      // the error string as JSON.
      var err = new Error(errorJSON.error);
      delete errorJSON.error;
      throw _.extend(err, errorJSON);
    });
  });
};

// lagecy request
var _request = function _request(route, className, objectId, method) {
  var data = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  var authOptions = arguments[5];
  var query = arguments[6];

  var path = '';
  if (route) path += '/' + route;
  if (className) path += '/' + className;
  if (objectId) path += '/' + objectId;
  // for migeration
  if (data && data._fetchWhenSave) throw new Error('_fetchWhenSave should be in the query');
  if (data && data._where) throw new Error('_where should be in the query');
  if (method && method.toLowerCase() === 'get') {
    query = extend({}, query, data);
    data = null;
  }
  return request({
    method: method,
    path: path,
    query: query,
    data: data,
    authOptions: authOptions
  });
};

LY.request = request;

module.exports = {
  _request: _request,
  request: request
};