/**
 * Created by yangyang on 2018/1/9.
 */
'use strict';

var mobilePhone = '13587369299'
var username = 'yang'
var password = '321456'
var sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImlhdCI6MTUxNTUwNDQyNH0.lDPEuInCrfpSCkZB0R0omGMvXELiq25LyANUVU389jM'

describe('User', function () {
  describe('Login.mobilephone', function () {
    it('should login success', function () {
      LY.User.loginWithMobilePhone(mobilePhone, password).then((result) => {
        var currentUser = LY.User.current()
        expect(currentUser.token).to.be(sessionToken)
      })
    });
    
    it('phone error', function () {
      LY.User.loginWithMobilePhone('12345223', password).then((result) => {
        console.log(result)
      }).catch(e => {
        expect(e.code).to.be(100)
      })
    })
  })
  
  describe('Login.username', function () {
    it('should login success', function () {
      LY.User.loginWithUsername(username, password).then((result) => {
        var currentUser = LY.User.current()
        expect(currentUser.token).to.be(sessionToken)
      })
    });
    
    it('username error', function () {
      LY.User.loginWithUsername('yangyang', password).then((result) => {
        console.log(result)
      }).catch(e => {
        expect(e.code).to.be(100)
      })
    })
  })
  
  describe('Login.sessionToken', function () {
    it('should login success', function () {
      LY.User.become(sessionToken).then((result) => {
        var currentUser = LY.User.current()
        expect(currentUser.username).to.be('yang')
      })
    })
  })
})