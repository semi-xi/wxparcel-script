# 快速开始

## 安装

```bash
# 全局安装
$ npm i -g wxparcel-script

# 安装到本地
$ npm i --save-dev wxparcel-script
```

# 运行

- 默认情况不开始监听文件修改
- 默认配置文件为 `wxparcel-script/libs/constants/config.js`
- 可以对其进行修改, 或返回配置

```bash
# 默认为 development 模式
$ wxparcel-script start

# 设置为 production 模式运行
$ wxparcel-script start --config production

# 自定义配置文件运行
$ wxparcel-script start --config /path/to/wxparcel.config.js
```

# CLI 使用说明

```bash
Commands:
  start [options]            开始运行

Options:
  -c, --config <config>      设置配置文件
  -w, --watch                是否检测文件变更
  --publicPath <publicPath>  配置静态资源服务域名
  --sourceMap <sourceMap>    是否生成 sourceMap (开发阶段)
  --env <env>                设置 process.env.NODE_ENV
                             开发环境: dev|develop|development
                             测试环境: test|unitest|prerelease
                             生产环境: prod|product|production
  --bundle <bundle>          是否将文件打包到一起 (请勿使用)
  -h, --help                 打印帮助
```
