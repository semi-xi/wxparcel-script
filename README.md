# WXParcel - 小程序简易构建工具

开发阶段请勿使用

- [开发文档](https://wxparcel.github.io/wxparcel-script/esdoc/)

## 使用

```
# run in default config
$ wxparcel-script start --config development
$ wxparcel-script start --config production

# run in custom config file
$ wxparcel-script start --config /path/to/development.config.js

# run in wathing server
$ wxparcel-script start --config /path/to/config.js --watch
```

## 配置公共服务域名

```
# set public path in static folder
$ wxparcel-script start --config development --publicPath "https://github.com"
```
