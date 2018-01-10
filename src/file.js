const _ = require('underscore');
const qiniu = require('./uploader/qiniu');
const LYError = require('./error');
const LYRequest = require('./request')._request;
const Promise = require('./promise');
const debug = require('debug')('leancloud:file');
const parseBase64 = require('./utils/parse-base64');

module.exports = function(LY) {

  const hexOctet = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);

  // port from browserify path module
  // since react-native packager won't shim node modules.
  const extname = (path) => {
    if (!_.isString(path)) return '';
    return path.match(/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/)[4];
  };

  const b64Digit = (number) => {
    if (number < 26) {
      return String.fromCharCode(65 + number);
    }
    if (number < 52) {
      return String.fromCharCode(97 + (number - 26));
    }
    if (number < 62) {
      return String.fromCharCode(48 + (number - 52));
    }
    if (number === 62) {
      return '+';
    }
    if (number === 63) {
      return '/';
    }
    throw new Error('Tried to encode large digit ' + number + ' in base64.');
  };

  var encodeBase64 = function(array) {
    var chunks = [];
    chunks.length = Math.ceil(array.length / 3);
    _.times(chunks.length, function(i) {
      var b1 = array[i * 3];
      var b2 = array[i * 3 + 1] || 0;
      var b3 = array[i * 3 + 2] || 0;

      var has2 = (i * 3 + 1) < array.length;
      var has3 = (i * 3 + 2) < array.length;

      chunks[i] = [
        b64Digit((b1 >> 2) & 0x3F),
        b64Digit(((b1 << 4) & 0x30) | ((b2 >> 4) & 0x0F)),
        has2 ? b64Digit(((b2 << 2) & 0x3C) | ((b3 >> 6) & 0x03)) : "=",
        has3 ? b64Digit(b3 & 0x3F) : "="
      ].join("");
    });
    return chunks.join("");
  };

  /**
   * An LY.File is a local representation of a file that is saved to the LY
   * cloud.
   * @param name {String} The file's name. This will change to a unique value
   *     once the file has finished saving.
   * @param data {Array} The data for the file, as either:
   *     1. an Array of byte value Numbers, or
   *     2. an Object like { base64: "..." } with a base64-encoded String.
   *     3. a Blob(File) selected with a file upload control.
   *     4. a Buffer in Node.js runtime.
   *     5. a Stream in Node.js runtime.
   *
   *        For example:<pre>
   * var fileUploadControl = $("#profilePhotoFileUpload")[0];
   * if (fileUploadControl.files.length > 0) {
   *   var file = fileUploadControl.files[0];
   *   var name = "photo.jpg";
   *   var file = new LY.File(name, file);
   *   file.save().then(function() {
   *     // The file has been saved to LY.
   *   }, function(error) {
   *     // The file either could not be read, or could not be saved to LY.
   *   });
   * }</pre>
   *
   * @class
   * @param [mimeType] {String} Content-Type header to use for the file. If
   *     this is omitted, the content type will be inferred from the name's
   *     extension.
   */
  LY.File = function(name, data, mimeType) {

    this.attributes = {
      name,
      url: '',
      metaData: {},
      // 用来存储转换后要上传的 base64 String
      base64: '',
    };

    if (_.isString(data)) {
      throw new TypeError("Creating an LY.File from a String is not yet supported.");
    }
    if (_.isArray(data)) {
      this.attributes.metaData.size = data.length;
      data = { base64: encodeBase64(data) };
    }

    this._extName = '';
    this._data = data;
    this._uploadHeaders = {};

    if (process.env.CLIENT_PLATFORM === 'ReactNative' || process.env.CLIENT_PLATFORM === 'Weapp') {
      if (data && data.blob) {
        this._extName = extname(data.blob.uri);
      }
    }

    if (typeof Blob !== "undefined" && data instanceof Blob) {
      if (data.size) {
        this.attributes.metaData.size = data.size;
      }
      if (data.name) {
        this._extName = extname(data.name);
      }
    }

    if (!process.env.CLIENT_PLATFORM) {
      if (data instanceof require('stream') && data.path) {
        this._extName = extname(data.path);
      }
      if (Buffer.isBuffer(data)) {
        this.attributes.metaData.size = data.length;
      }
    }

    let owner;
    if (data && data.owner) {
      owner = data.owner;
    }
    // else if (!LY._config.disableCurrentUser) {
    //   try {
    //     owner = LY.User.current();
    //   } catch (error) {
    //     if ('SYNC_API_NOT_AVAILABLE' === error.code) {
    //       console.warn('Get current user failed. It seems this runtime use an async storage system, please create LY.File in the callback of LY.User.currentAsync().');
    //     } else {
    //       throw error;
    //     }
    //   }
    // }

    this.attributes.metaData.owner = owner ? owner.id : 'unknown';

    this.set('mime_type', mimeType);
  };

  /**
   * Creates a fresh LY.File object with exists url for saving to AVOS Cloud.
   * @param {String} name the file name
   * @param {String} url the file url.
   * @param {Object} [metaData] the file metadata object.
   * @param {String} [type] Content-Type header to use for the file. If
   *     this is omitted, the content type will be inferred from the name's
   *     extension.
   * @return {LY.File} the file object
   */
  LY.File.withURL = function(name, url, metaData, type) {
    if (!name || !url){
      throw new Error("Please provide file name and url");
    }
    var file = new LY.File(name, null, type);
    //copy metaData properties to file.
    if (metaData){
      for(var prop in metaData){
        if (!file.attributes.metaData[prop])
          file.attributes.metaData[prop] = metaData[prop];
      }
    }
    file.attributes.url = url;
    //Mark the file is from external source.
    file.attributes.metaData.__source = 'external';
    return file;
  };

  /**
   * Creates a file object with exists objectId.
   * @param {String} objectId The objectId string
   * @return {LY.File} the file object
   */
  LY.File.createWithoutData = function(objectId) {
    var file = new LY.File();
    file.id = objectId;
    return file;
  };

  _.extend(LY.File.prototype, /** @lends LY.File.prototype */ {
    className: '_File',

    _toFullJSON(seenObjects, full = true) {
      var json = _.clone(this.attributes);
      LY._objectEach(json, function(val, key) {
        json[key] = LY._encode(val, seenObjects, undefined, full);
      });
      LY._objectEach(this._operations, function(val, key) {
        json[key] = val;
      });

      if (_.has(this, "id")) {
        json.objectId = this.id;
      }
      _(['createdAt', 'updatedAt']).each((key) => {
        if (_.has(this, key)) {
          const val = this[key];
          json[key] = _.isDate(val) ? val.toJSON() : val;
        }
      });
      if (full) {
        json.__type = "File";
      }
      return json;
    },

    /**
     * Returns a JSON version of the file with meta data.
     * Inverse to {@link LY.parseJSON}
     * @since 2.0.0
     * @return {Object}
     */
    toFullJSON(seenObjects = []) {
      return this._toFullJSON(seenObjects);
    },

    /**
     * Returns a JSON version of the object.
     * @return {Object}
     */
    toJSON: function(key, holder, seenObjects = [this]) {
      return this._toFullJSON(seenObjects, false);
    },

    /**
     * Returns the ACL for this file.
     * @returns {LY.ACL} An instance of LY.ACL.
     */
    getACL: function() {
      return this._acl;
    },

    /**
     * Sets the ACL to be used for this file.
     * @param {LY.ACL} acl An instance of LY.ACL.
     */
    setACL: function(acl) {
      if (!(acl instanceof LY.ACL)) {
        return new LYError(LYError.OTHER_CAUSE, 'ACL must be a LY.ACL.');
      }
      this._acl = acl;
    },

    /**
     * Gets the name of the file. Before save is called, this is the filename
     * given by the user. After save is called, that name gets prefixed with a
     * unique identifier.
     */
    name: function() {
      return this.get('name');
    },

    /**
     * Gets the url of the file. It is only available after you save the file or
     * after you get the file from a LY.Object.
     * @return {String}
     */
    url: function() {
      return this.get('url');
    },

    /**
     * Gets the attributs of the file object.
     * @param {String} The attribute name which want to get.
     * @returns {Any}
     */
    get: function(attrName) {
      switch (attrName) {
        case 'objectId':
          return this.id;
        case 'url':
        case 'name':
        case 'mime_type':
        case 'metaData':
        case 'createdAt':
        case 'updatedAt':
          return this.attributes[attrName];
        default:
          return this.attributes.metaData[attrName];
      }
    },

    /**
     * Set the metaData of the file object.
     * @param {Object} Object is an key value Object for setting metaData.
     * @param {String} attr is an optional metadata key.
     * @param {Object} value is an optional metadata value.
     * @returns {String|Number|Array|Object}
     */
    set: function(...args) {
      const set = (attrName, value) => {
        switch (attrName) {
          case 'name':
          case 'url':
          case 'mime_type':
          case 'base64':
          case 'metaData':
            this.attributes[attrName] = value;
            break;
          default:
            // File 并非一个 AVObject，不能完全自定义其他属性，所以只能都放在 metaData 上面
            this.attributes.metaData[attrName] = value;
            break;
        }
      };

      switch (args.length) {
        case 1:
          // 传入一个 Object
          for (var k in args[0]) {
            set(k, args[0][k]);
          }
          break;
        case 2:
          set(args[0], args[1]);
          break;
      }
    },

    /**
     * Set a header for the upload request.
     * For more infomation, go to https://url.leanapp.cn/avfile-upload-headers
     *
     * @param {String} key header key
     * @param {String} value header value
     * @return {LY.File} this
     */
    setUploadHeader(key, value) {
      this._uploadHeaders[key] = value;
      return this;
    },

    /**
     * <p>Returns the file's metadata JSON object if no arguments is given.Returns the
     * metadata value if a key is given.Set metadata value if key and value are both given.</p>
     * <p><pre>
     *  var metadata = file.metaData(); //Get metadata JSON object.
     *  var size = file.metaData('size');  // Get the size metadata value.
     *  file.metaData('format', 'jpeg'); //set metadata attribute and value.
     *</pre></p>
     * @return {Object} The file's metadata JSON object.
     * @param {String} attr an optional metadata key.
     * @param {Object} value an optional metadata value.
     **/
    metaData: function(attr, value) {
      if (attr && value) {
        this.attributes.metaData[attr] = value;
        return this;
      } else if (attr && !value) {
        return this.attributes.metaData[attr];
      } else {
        return this.attributes.metaData;
      }
    },

    /**
     * 如果文件是图片，获取图片的缩略图URL。可以传入宽度、高度、质量、格式等参数。
     * @return {String} 缩略图URL
     * @param {Number} width 宽度，单位：像素
     * @param {Number} heigth 高度，单位：像素
     * @param {Number} quality 质量，1-100的数字，默认100
     * @param {Number} scaleToFit 是否将图片自适应大小。默认为true。
     * @param {String} fmt 格式，默认为png，也可以为jpeg,gif等格式。
     */

    thumbnailURL: function(width, height, quality, scaleToFit, fmt) {
      const url = this.attributes.url;
      if (!url) {
        throw new Error('Invalid url.');
      }
      if (!width || !height || width <= 0 || height <= 0 ) {
        throw new Error('Invalid width or height value.');
      }
      quality = quality || 100;
      scaleToFit = !scaleToFit ? true : scaleToFit;
      if (quality <= 0 || quality > 100) {
        throw new Error('Invalid quality value.');
      }
      fmt = fmt || 'png';
      const mode = scaleToFit ? 2: 1;
      return url + '?imageView/' + mode + '/w/' + width + '/h/' + height + '/q/' + quality + '/format/' + fmt;
    },

    /**
     * Returns the file's size.
     * @return {Number} The file's size in bytes.
     **/
    size: function() {
      return this.metaData().size;
    },

    /**
     * Returns the file's owner.
     * @return {String} The file's owner id.
     */
    ownerId: function() {
      return this.metaData().owner;
    },

    /**
     * Destroy the file.
     * @param {AuthOptions} options
     * @return {Promise} A promise that is fulfilled when the destroy
     *     completes.
     */
    destroy: function(options) {
      if (!this.id) {
        return Promise.reject(new Error('The file id is not eixsts.'));
      }
      var request = LYRequest("files", null, 'DELETE', null, options);
      return request;
    },

    /**
     * Request Qiniu upload token
     * @param {string} type
     * @return {Promise} Resolved with the response
     * @private
     */
    _fileToken(type, route = 'function/fileTokens') {
      let name = this.attributes.name;

      let extName = extname(name);
      if (!extName && this._extName) {
        name += this._extName;
        extName = this._extName;
      }
      // Create 16-bits uuid as qiniu key.
      const key = hexOctet() + hexOctet() + hexOctet() + hexOctet() + hexOctet() + extName;
      const data = {
        key,
        name,
        ACL: this._acl,
        mime_type: type,
        metaData: this.attributes.metaData,
      };
      this._qiniu_key = key;
      return LYRequest(route, null, 'POST', data);
    },

    /**
     * @callback UploadProgressCallback
     * @param {XMLHttpRequestProgressEvent} event - The progress event with 'loaded' and 'total' attributes
     */
    /**
     * Saves the file to the LY cloud.
     * @param {Object} [options]
     * @param {UploadProgressCallback} [options.onprogress] 文件上传进度，在 Node.js 中无效，回调参数说明详见 {@link UploadProgressCallback}。
     * @return {Promise} Promise that is resolved when the save finishes.
     */
    save(options) {
      if (this.id) {
        throw new Error('File already saved. If you want to manipulate a file, use LY.Query to get it.');
      }
      if (!this._previousSave) {
        if (this._data) {
          let mimeType = this.get('mime_type');
          this._previousSave = this._fileToken(mimeType).then(uploadInfo => {
            if (uploadInfo.mime_type) {
              mimeType = uploadInfo.mime_type;
              this.set('mime_type', mimeType);
            }
            this._token = uploadInfo.result.token;
            return Promise.resolve().then(() => {
              const data = this._data;
              if (data && data.base64) {
                return parseBase64(data.base64, mimeType);
              }
              if (data && data.blob) {
                if (!data.blob.type && mimeType) {
                  data.blob.type = mimeType;
                }
                if (!data.blob.name) {
                  data.blob.name = this.get('name');
                }
                return data.blob;
              }
              if (typeof Blob !== "undefined" && data instanceof Blob) {
                return data;
              }
              if (!process.env.CLIENT_PLATFORM) {
                if (data instanceof require('stream')) {
                  return data;
                }
                if (Buffer.isBuffer(data)) {
                  return data;
                }
              }
              throw new TypeError('malformed file data');
            }).then(data => {
              switch (uploadInfo.provider) {
                case 'qiniu':
                default:
                  return qiniu(uploadInfo, data, this, options);
              }
            }).then((file)=>{
                return file

              },(error) => {
                this._callback(false);
                throw error;
              }
            );
          });
        } else if (this.attributes.url && this.attributes.metaData.__source === 'external') {
          // external link file.
          const data = {
            name: this.attributes.name,
            ACL: this._acl,
            metaData: this.attributes.metaData,
            mime_type: this.mimeType,
            url: this.attributes.url,
          };
          this._previousSave = LYRequest('files', null, 'post', data).then((response) => {
            this.attributes.name = response.name;
            this.attributes.url = response.url;
            this.id = response.objectId;
            if (response.size) {
              this.attributes.metaData.size = response.size;
            }
            return this;
          });
        }
      }
      return this._previousSave;
    },

    _callback(success) {
      LYRequest('fileCallback', null, 'post', {
        token: this._token,
        result: success,
      }).catch(debug);
      delete this._token;
      delete this._data;
    },


  });
};