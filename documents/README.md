[![GitHub version](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script.svg)](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script)
[![npm version](https://badge.fury.io/js/wxparcel-script.svg)](https://badge.fury.io/js/wxparcel-script)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

[![Build Status](https://travis-ci.org/wxparcel/wxparcel-script.svg?branch=master)](https://travis-ci.org/wxparcel/wxparcel-script)
[![Document](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script/badge.svg?t=0)](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script)
[![Dependency Status](https://dependencyci.com/github/wxparcel/wxparcel-script/badge)](https://dependencyci.com/github/wxparcel/wxparcel-script)


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
