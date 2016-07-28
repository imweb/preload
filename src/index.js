/**
 * 预加载
 * @noWrap
 * @useage
 *      // inline core
 *      Preload.load({
 *          url: '',
 *          data: {
 *
 *          }
 *      });
 *      db组件配合:
 *      Preload.get({
 *          url: '',
 *          data: {
 *
 *          }
 *      }, function(data) {
 *          if (data) {
 *              // 这个cgi有预加载
 *          } else {
 *              // 没有预加载的cgi
 *              $.ajax();
 *          }
 *      })
 */
(function() {
    function getCookie(n) {
        var m = document.cookie.match(new RegExp('(^| )' + n + '=([^;]*)(;|$)'));
        return !m ? '' : decodeURIComponent(m[2]);
    }

    function encryptSkey(str) {
        if (!str) {
            return '';
        }
        var hash = 5381;
        for (var i = 0, len = str.length; i < len; ++i) {
            hash += (hash << 5) + str.charAt(i).charCodeAt(); 
        }
        return hash & 0x7fffffff; 
    }

    function uin() {
        var u = getCookie('uin');
        return u && parseInt(u.substring(1, u.length), 10) || null;
    }

    function query(name) {
        return location.search
            .match(new RegExp('(\\?|&)' + name + '=([^&]*)(&|$)')) 
                ? decodeURIComponent(RegExp.$2) : '';
    }

    function extend(target) {
        for (var i = 1; i < arguments.length; i++) {
            for (var k in arguments[i]) {
                if (arguments[i].hasOwnProperty(k)) {
                    target[k] = arguments[i][k];
                }
            }
        }
        return target;
    }

    function appendQuery(url, data) {
        return !data ? url : url + (url.match(/\?/) ? '&' : '?') + getParam(data);
    }

    function getParam(obj) {
        var str = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = typeof obj[k] !== 'undefined' ? obj[k] : '';
                str.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
            }
        }
        return str.sort().join('&');
    }

    var Preload = {
        uin: uin,
        query: query,
        getCookie: getCookie,

        _dataMap: {},

        /**
         * 预加载
         * @param {Object} options 同$.ajax()参数, 不支持success|error
         * @param {Function(Object)} complete  
         *      complete(null) 无预加载
         *      complete({retcode: 404}) 请求失败
         *      complete(data) 请求成功
         */
        load: function(options, complete) {
            options = extend({
                type: 'GET',
                data: {},
                dataType: 'JSON'
            }, options || {});

            options.data._ = Math.random();
            options.data.bkn = encryptSkey(getCookie('skey'));

            var key = this._key(options);
            var self = this;
            this._dataMap[key] = {
                status: 'fetching',
                used: false,
                response: null,
                completeCallback: complete ? [complete] : []
            };
            options.success = function(response, xhr) {
                self._complete(key, response, xhr);
            };
            options.error = function(xhr) {
                self._complete(key, {
                    networkError: true,
                    retcode: xhr.status || 404,
                    status: xhr.status || 404
                }, xhr);
            };
            this.ajax(options);
        },

        /**
         * 获取预加载的数据, 只能获取到一次
         * @param {Object} options 同$.ajax()参数, 不支持success|error
         * @param {Function(Object)} complete 同load()函数
         */
        get: function(options, complete) {
            options = options || {};
            var key = this._key(options),
                data = this._dataMap[key];
            if (!data || data.used) {
                complete && complete(null);
                return;
            }
            data.used = true;
            data.completeCallback.push(complete);
            if (data.status === 'done') {
                this._complete(key);
            }
        },

        _complete: function(key, response, xhr) {
            var data = this._dataMap[key];
            data.response = response || data.response;
            data.xhr = xhr || data.xhr;
            data.status = 'done';
            var callback = data.completeCallback;
            data.completeCallback = [];
            if (data.used) {
                delete this._dataMap[key];
            }
            callback.forEach(function(cb) {
                cb && cb(data.response, data.xhr || null);
            });
        },

        /**
         * 获取请求标示key
         * @param {Object} options
         * @return {String}
         */
        _key: function(options) {
            options = this._keyOptions(options);
            var url = options.url;
            // '/cgi-bin/'
            if (url.match(/^\/[^\/]/)) {
                url = location.href.match(/^https?:\/\/[^\/]+/)[0] + url;
            }
            url = url.replace(/^https?:/, '');
            return appendQuery(url, options.data || {})
                .replace(/[?&](_\w*|bkn|t)=[^&]*/g, '')
                .replace(/[&?]/, '?');
        },

        /**
         * 提取url中的参数放置data中
         * @param {Object} options 
         * @return {Object} 
         */
        _keyOptions: function(options) {
            var url = options.url.split('?')[0],
                query = options.url.split('?')[1] || '',
                data = options.data || {};
            query.split('&').forEach(function(str) {
                var arr = str.split('=');
                if (arr[0]) {
                    data[decodeURIComponent(arr[0])] = decodeURIComponent(arr[1] || '');
                }
            });
            return {url: url, data: data};
        },

        /**
         * ajax
         * @param {Object} options 同$.ajax()参数
         */
        ajax: function(options) {
            var url = options.url,
                xhr = new XMLHttpRequest();

            xhr.timeout = options.timeout || 30000;

            function success() {
                var data = xhr.responseText || '';
                if (options.dataType === 'JSON') {
                    data = JSON.parse(data);
                }
                options.success && options.success(data, xhr);
            }

            function error() {
                options.error && options.error(xhr);
            }

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        success();
                    } else {
                        error();
                    }
                }
            };

            if (options.type === 'GET') {
                url = appendQuery(url, options.data || {});
                xhr.open('GET', url, true);
            } else {
                xhr.open('POST', url, true);
            }

            if (options.contentType || options.type === 'POST') {
                xhr.setRequestHeader('Content-Type', options.contentType || 'application/x-www-form-urlencoded')
            }

            xhr.send(options.type === 'GET' ? null : getParam(options.data || {}));
        }
    };

    window.Preload = Preload;
})();

