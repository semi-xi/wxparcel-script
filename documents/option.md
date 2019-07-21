# 自定义配置项

除了默认配置外, 还可以自定义配置文件进行加载

## 修改默认配置

若要对默认配置修改可以引入默认配置

```javascript
import Config from 'wxparcel-script/libs/constants/config'
...
export default Config
```

## 创建自定义配置文件

```bash
# 创建自定义配置文件并指定给脚本运行
$ touch wxparcel.config.js
$ wxparcel-script start --config ./wxparcel.config.js
```

## 编写自定义配置文件

自定义配置文件暂时只支持 `javascript` 与 `babel` 编写

## 参数

###### 参数 Rules

- 描述: 规则集合
- 类型: `Array`
- 默认值: `[]`

```javascript
export default {
  rules: [
    {
      test: /\.js$/,
      loaders: [
        {
          use: BabelLoader
        }
      ]
    }
  ]
  ...
}
```

- [Rule配置](./rule.md?id=配置)
- [Loader配置](./loader.md?id=配置)

###### 参数 Plugins

- 描述: 插件
- 类型: `Array`
- 默认值: `[]`

```javascript
export default {
  plugins: [
    new CustomPlugin()
  ]
  ...
}
```

###### 参数 Src

- 描述: 原文件存放目录, 相对根目录
- 类型: `string`
- 默认值: `'src'`

```javascript
export default {
  src: 'src'
  ...
}
```

###### 参数 Output

- 描述: 输出文件存放目录, 相对根目录
- 类型: `string`
- 默认值: `'app'`

```javascript
export default {
  output: 'app'
  ...
}
```

###### 参数 Static

- 描述: 静态文件存放目录, 相对根目录
- 类型: `string`
- 默认值: `'static'`

```javascript
export default {
  static: 'static'
  ...
}
```

###### 参数 Tmpl

- 描述: 临时文件存放目录, 相对根目录
- 类型: `string`
- 默认值: `'.temporary'`

```javascript
export default {
  tmpl: '.temporary'
  ...
}
```

###### 参数 PublicPath

- 描述: 临时文件存放目录, 相对根目录
- 类型: `string`
- 默认值: `'http://{ip}:{idlePort}'`

```javascript
export default {
  publicPath: 'http://127.0.0.1:3000'
  ...
}
```

###### 参数 PublicPath

- 描述: node_module 存放目录, 相对根目录
  - 因为小程序 node_module 被限制上传, 因此这里需要更换存放文件夹
- 类型: `string`
- 默认值: `'npm'`

```javascript
export default {
  nodeModuleDirectoryName: 'npm'
  ...
}
```

###### 参数 LogType

- 描述: 日志类型
- 类型: `string` | `Array`
- 可选: `'file'`|`'console'`|`['file', 'console']`
- 默认值: `'console'`

```javascript
export default {
  logType: 'console'
  ...
}
```

###### 参数 SourceMap

- 描述: 是否生成 sourceMap (开发阶段, 请无使用)
- 类型: `string` | `boolean`
- 可选: `true` | `'inline'`
- 默认值: `false`

```javascript
export default {
  sourceMap: false
  ...
}
```

###### 参数 Watch

- 描述: 监听文件改动
- 类型: `boolean`
- 默认值: `false`

```javascript
export default {
  watch: false
  ...
}
```

###### 参数 Bundle

- 描述: 是否打包模块
  - 打包的模块根据 `libs(src)/bundler/*` 文件定义
  - 可以通过 `libs(src)/bundler` 中的 `Bundler.register` 注册
- 类型: `boolean`
- 默认值: `false`

```javascript
export default {
  bundle: false
  ...
}
```

###### 参数 Silence

- 描述: 是否为安静模式
- 类型: `boolean`
- 默认值: `false`

```javascript
export default {
  silence: false
  ...
}
```
