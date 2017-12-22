/**
 * Created by yangyang on 2017/12/21.
 */
'use strict';

var LY = require('./ly');

LY._ = require('underscore');
LY.version = require('./version');
LY.Promise = require('./promise');
LY.localStorage = require('./localstorage');
LY.Error = require('./error');

require('./init');
require('./cloudfunction')(LY);

module.exports = LY;