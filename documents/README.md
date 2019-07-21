[![GitHub version](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script.svg)](https://badge.fury.io/gh/wxparcel%2Fwxparcel-script)
[![npm version](https://badge.fury.io/js/wxparcel-script.svg)](https://badge.fury.io/js/wxparcel-script)
[![Build Status](https://travis-ci.org/wxparcel/wxparcel-script.svg?branch=master)](https://travis-ci.org/wxparcel/wxparcel-script)
[![Build status](https://ci.appveyor.com/api/projects/status/s49av8k4l12hqt7n?svg=true)](https://ci.appveyor.com/project/DavidKk/wxparcel-script)

[![Document](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script/badge.svg?t=0)](https://doc.esdoc.org/github.com/wxparcel/wxparcel-script)
[![Coverage Status](https://coveralls.io/repos/github/wxparcel/wxparcel-script/badge.svg?branch=master)](https://coveralls.io/github/wxparcel/wxparcel-script?branch=master)
[![Dependency Status](https://dependencyci.com/github/wxparcel/wxparcel-script/badge)](https://dependencyci.com/github/wxparcel/wxparcel-script)

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)
[![GitHub](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/wxparcel/wxparcel-script/blob/master/LICENSE)
[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg)](https://github.com/996icu/996.ICU/blob/master/LICENSE)


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

## 功能简述

- 支持 编译 `scss` 或 `sass` 文件 (可配置, 默认开启)
- 支持 编译 es6 文件, 主要通过 Babel 进行编译 (可配置, 默认开启)
  - Babel 配置根据根目录下 `.babelrc` 文件来配置, 需要如何修改可以手动添加
  - 支持 `node_modules` 导入
- 支持 打包JS文件 (可配置, 默认开启)
- 支持 生成 SourceMap 文件 (可配置, 默认开启, js 文件仅在 `development`, `test` 模式下开启, wxss 文件则不开启)
- 支持 文件压缩 (可配置, 默认 js 文件只在 `test`, `production` 模式下开启, wxss 文件所有环境下均开启)
- 支持 资源路径替换
  - 支持 alias 路径, 例如: `~/srcDir`(资源路径), `/rootDir`(根目录路径) 与 `./relativeDir`(相对路径)
  - 支持 静态资源保存到非CDN, 例如: `@./a.png`, `@~/a.png`, `@/a.png`
  - 支持 `.js` 文件路径替换, 例如 `require('path/to/static.ext')`
  - 支持 `.wxss` 文件路径替换, 例如 `background-image: url('path/to/static.ext')`
  - 支持 `.wxml` 文件路径替换, 例如 `<image src="path/to/static.ext" />` 路径替换
- 支持 编译环境变量替换 (默认引入)
  - 默认引入 `process.env.NODE_ENV` [`development`, `test`, `production`]
- 支持 本地开发静态服务 (可配置, 默认开发环境自动开启)
  - 若连接手机, 若手机与电脑在同一网络下即可, 不需要走代理
- 支持 自定义 `Plugins`(插件), `Loaders`(加载器) 与 `Resolvers`(解析器)
  - 插件 对应工作流不同时期的钩子进行执行, 例如, 工作流启动时清除旧生成的文件, 启动静态服务等 (可以直接在配置进行注册)
  - 加载器 是读取某些非原生支持的文件时调用的工具, 主要作用是文件转化, 例如, 将 es6 转化成 es5 (可以直接在配置进行注册)
  - 解析器 用于解析文件, 对原生文件进行二次操作, 例如, 将静态资源都替换成 CDN 地址 (自定义解析器需要通过全局 Resolver 进行注册)

## 本地开发调试工具

```
$ cd path/to/wxparcel-script
$ npm link . # 这样就可以全局通用, 若要使用全局作用于项目, 必须把本地项目的依赖删除

# 若要引用到 wxparcel-script 中配置文件或内部类
$ cd path/to/project
$ npm link wxparcel-script # 必须在 `npm link .` 之后执行
```

