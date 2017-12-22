/**
 * Created by yangyang on 2017/12/21.
 */
'use strict';

var _ = require('underscore');
var userAgent = require('./ua');

var _require = require('./utils'),
  inherits = _require.inherits,
  parseDate = _require.parseDate;

var LY = global.LY || {};

// All internal configuration items
LY._config = {
  serverURLs: {},
  production: null,
};

// configs shared by all LY instances
LY._sharedConfig = {
  userAgent: userAgent,
};

// A self-propagating extend function.
LY._extend = function (protoProps, classProps) {
  var child = inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};

/**
 * 将网络请求的数据序列化
 * @param value
 * @private
 */
LY._encode = function (value) {
  // return JSON.stringify(value)
  return value
};

/**
 * 将网络结果反序列化
 * @private
 */
LY._decode = function (value) {
  // return JSON.parse(value)
  return value
};

/**
 * The inverse function of {@link LY.Object#toFullJSON}.
 * @since 2.0.0
 * @param {Object}
 * return {LY.Object|LY.File|any}
 */
LY.parseJSON = LY._decode;

module.exports = LY;