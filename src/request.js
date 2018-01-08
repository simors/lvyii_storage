'use strict';

const _ = require('underscore');
const md5 = require('md5');
const {
  extend,
} = require('underscore');
const Promise = require('./promise');
const LY = require('./ly');

const {
  getSessionToken,
  ajax,
} = require('./utils');

// 计算 X-LY-Sign 的签名方法
const sign = (key) => {
  const now = new Date().getTime();
  const signature = md5(now + key);
  return signature + ',' + now;
};

const setAppKey = (headers, signKey) => {
  if (signKey) {
    headers['X-LY-Sign'] = sign(LY.applicationKey);
  } else {
    headers['X-LY-Key'] = LY.applicationKey;
  }
};

const setHeaders = (authOptions = {}, signKey) => {
  const headers = {
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
    const sessionToken = getSessionToken(authOptions);
    if (sessionToken) {
      headers['X-LY-Session'] = sessionToken;
    }
    return headers;
  });
};

const createApiUrl = ({
  service = 'engine',
  version = '1',
  path
}) => {
  let apiURL = AV._config.serverURLs[service];
  
  if (!apiURL) throw new Error(`undefined server URL for ${service}`);
  
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
const request = ({ service, version, method, path, query, data = {}, authOptions, signKey = true }) => {
  if (!(LY.applicationId && LY.applicationKey)) {
    throw new Error('Not initialized');
  }
  const url = createApiUrl({ service, path, version });
  return setHeaders(authOptions, signKey).then(
    headers => ajax({ method, url, query, data, headers })
      .catch((error) => {
        let errorJSON = {
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
          errorJSON.error += ` [${error.statusCode||'N/A'} ${method} ${url}]`;
        }
        // Transform the error into an instance of LYError by trying to parse
        // the error string as JSON.
        const err = new Error(errorJSON.error);
        delete errorJSON.error;
        throw _.extend(err, errorJSON);
      })
  );
};

// lagecy request
const _request = (route, className, objectId, method, data = {}, authOptions, query) => {
  let path = '';
  if (route) path += `/${route}`;
  if (className) path += `/${className}`;
  if (objectId) path += `/${objectId}`;
  // for migeration
  if (data && data._fetchWhenSave) throw new Error('_fetchWhenSave should be in the query');
  if (data && data._where) throw new Error('_where should be in the query');
  if (method && (method.toLowerCase() === 'get')) {
    query = extend({}, query, data);
    data = null;
  }
  return request({
    method,
    path,
    query,
    data,
    authOptions,
  });
};

LY.request = request;

module.exports = {
  _request: _request,
  request: request
};