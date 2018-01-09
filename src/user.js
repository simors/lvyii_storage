/**
 * Created by yangyang on 2018/1/9.
 */
const _ = require('underscore');
const LYError = require('./error');
const { _request: LYRequest, request } = require('./request');
const Promise = require('./promise');

module.exports = function (LY) {
  LY.User = {
    // The currently logged-in user.
    _currentUser: null,
  
    // The localStorage key suffix that the current user is stored under.
    _CURRENT_USER_KEY: "currentUser",
    
    /**
     * Persists a user as currentUser to localStorage, and into the singleton.
     * @private
     */
    _saveCurrentUser: function(user) {
      var promise;
      if (JSON.stringify(LY.User._currentUser) !== JSON.stringify(user)) {
        promise = LY.User.logout();
      }
      else {
        promise = Promise.resolve();
      }
      return promise.then(function() {
        user._isCurrentUser = true;
        LY.User._currentUser = user;
        
        return LY.localStorage.setItemAsync(
          LY._getLYPath(LY.User._CURRENT_USER_KEY),
          JSON.stringify(user)
        )
      });
    },
    
    logout: function () {
      LY.User._currentUser = null
      return LY.localStorage.removeItemAsync(
        LY._getLYPath(LY.User._CURRENT_USER_KEY)
      )
    },
  
    /**
     * Retrieves the currently logged in AVUser with a valid session,
     * either from memory or localStorage, if necessary.
     * @return {AV.User} The currently logged in AV.User.
     */
    current: function() {
      if (LY.User._currentUser) {
        return LY.User._currentUser;
      }
      
      var userData = LY.localStorage.getItem(LY._getLYPath(LY.User._CURRENT_USER_KEY));
      if (!userData) {
        return null;
      }
      var json = JSON.parse(userData);
      LY.User._currentUser = json;
      return LY.User._currentUser;
    },
    
    loginWithMobilePhone: function (mobilePhone, password) {
      let loginUser = null
      return LYRequest('users/loginWithMobilePhone', 'auth', 'post', {mobilephone: mobilePhone, password})
        .then((user) => {
          loginUser = user
          LY.User._currentUser = loginUser
          return LY.User._saveCurrentUser(loginUser)
        }).then(() => loginUser)
    },
    
    loginWithUsername: function (username, password) {
      let loginUser = null
      return LYRequest('users/loginWithUsername', 'auth', 'post', {username, password})
        .then((user) => {
          loginUser = user
          LY.User._currentUser = loginUser
          return LY.User._saveCurrentUser(loginUser)
        }).then(() => loginUser)
    },
    
    become: function (sessionToken) {
      let loginUser = null
      return LYRequest('users/me', 'auth', 'post', {sessionToken})
        .then((user) => {
          loginUser = user
          LY.User._currentUser = loginUser
          return LY.User._saveCurrentUser(loginUser)
        }).then(() => loginUser)
    }
  }
}