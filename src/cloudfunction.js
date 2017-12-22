'use strict';

var _ = require('underscore');

var _require = require('./request'),
    _request = _require._request,
    request = _require.request;

var Promise = require('./promise');

module.exports = function (LY) {
  /**
   * Contains functions for calling and declaring
   * <p><strong><em>
   *   Some functions are only available from Cloud Code.
   * </em></strong></p>
   *
   * @namespace
   * @borrows LY.Captcha.request as requestCaptcha
   */
  LY.Cloud = LY.Cloud || {};

  _.extend(LY.Cloud, /** @lends LY.Cloud */{
    /**
     * Makes a call to a cloud function.
     * @param {String} name The function name.
     * @param {Object} data The parameters to send to the cloud function.
     * @param {AuthOptions} options
     * @return {Promise} A promise that will be resolved with the result
     * of the function.
     */
    run: function run(name, data, options) {
      return request({
        service: 'engine',
        method: 'POST',
        path: '/function/' + name,
        data: LY._encode(data),
        authOptions: options
      }).then(function (resp) {
        return LY._decode(resp).result;
      });
    },
  });
};