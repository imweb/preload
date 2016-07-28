# preload

预加载数据

## API

### Preload.load(option, callback)

预加载一个cgi

#### Arguments

- `option` `{Object}`
- `option.url` `{String}`  url
- `option.data` `{Object}` data
- `option.type` `{String}` GET|POST
- `callback` `{Function(Object)}` 数据回调

### Preload.get(option, callback)

获取预加载的数据

- `option` `{Object}` 
- `option.url` `{String}`  url
- `option.data` `{Object}` data
- `option.type` `{String}` GET|POST
- `callback` `{Function(Object)}` 数据回调, 当无预加载时callback(null)

option.url和option.data需与Preload.load()时的保持一致

## Usage

```html
<!DOCTYPE html>
<html lang="zh_CN">
<head>
    <script src="preload?__inline"></script><!--ignore-->
    <script src="./preload?__inline"></script><!--ignore-->
</head>
<body>
    <script src="./index"></script>
</body>
</html>
```

```javascript
// preload.js
/**
 * @noWrap
 */
(function() {
    Preload.load({
        url: '/cgi-bin/now/web/room/get_record_room_info',
        data: {
            vid: Preload.query('vid')
        }
    });
})();
```

```javascript
// index.js
// 直接改造db组件,业务代码无需修改
```

```javascript
// db.js
if (window.Preload) {
    Preload.get({
        url: option.url,
        data: option.data
    }, function(data) {
        if (data) {
            setTimeout(function() {
                _complete(data);
            }, 1);
        } else {
            $.ajax(option);
        }
    });
} else {
    $.ajax(option);
}
```

## Note

- 同一个load()只能get()一次，之后get()回调均为null
- 预加载请求失败时回调`callback({ retcode: xhr.status, netError: true })`

