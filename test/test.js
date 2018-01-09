/**
 * Created by yangyang on 2018/1/9.
 */
'use strict';

if (!process) process = { env: {}};

if (typeof require !== 'undefined') {
  global.debug = require('debug')('test');
  global.expect = require('expect.js');
  global.LY = require('../src');
}

LY.init({
  appId: process.env.APPID || '3zE73WUYaUvEQUclCyiPQuqr',
  appKey: process.env.APPKEY || 'VZbSM9RoutQ7X3yHTGOLiyZgR1Fhqmok',
  serverURLs: {
    engine: 'http://localhost:16800',
    auth: 'http://localhost:16801'
  }
});