'use strict';

var version = require('../version');
var comments = [process.env.CLIENT_PLATFORM || 'Node.js'].concat(require('./comments'));

module.exports = 'Lvyii-JS-SDK/' + version + ' (' + comments.join('; ') + ')';