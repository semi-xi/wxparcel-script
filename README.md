[![GitHub version](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script.svg)](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script)
[![npm version](https://badge.fury.io/js/wxparcel-script.svg)](https://badge.fury.io/js/wxparcel-script)
[![Build Status](https://travis-ci.org/wxparcel/wxparcel-script.svg?branch=master)](https://travis-ci.org/wxparcel/wxparcel-script)
[![Build status](https://ci.appveyor.com/api/projects/status/s49av8k4l12hqt7n?svg=true)](https://ci.appveyor.com/project/DavidKk/wxparcel-script)

[![Document](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script/badge.svg?t=0)](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script)
[![Coverage Status](https://coveralls.io/repos/github/wxparcel/wxparcel-script/badge.svg?branch=master)](https://coveralls.io/github/wxparcel/wxparcel-script?branch=master)
[![Dependency Status](https://dependencyci.com/github/wxparcel/wxparcel-script/badge)](https://dependencyci.com/github/wxparcel/wxparcel-script)

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)
[![GitHub](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/wxparcel/wxparcel-script/blob/master/LICENSE)

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

## 功能

- 支持编译 babel 文件 (自带)
  - babel 配置根据根目录下 .babelrc 文件来配置, 需要如何修改可以手动添加
  - 支持 导入 node_modules
  - 支持 require('path/to/static.custom')
  - 支持 alias 路径 { ~: srcDir, /: rootDir, .: relativeDir }
- 支持编译 scss/sass 文件 (自带)
  - 支持 background-image: url('path/to/static.custom')
- 支持编译 环境变量替换
- 支持 本地开发静态服务
- 支持 可扩展插件(Plugins)与加载器(Loaders)

## 开发

```
cd path/to/wxparcel-script
npm link . # 这样就可以全局通用, 若要使用全局作用于项目, 必须把本地项目的依赖删除
```

