# 规则

用于指定编译的文件类型, 例如 `sass` 需要编译成 `css`, 因此就需要配置编译规则

## 配置

```javascript
export default {
  rules: [
    ...
  ]
  ...
}
```

## 参数

###### 参数 Test

- 描述: 规则匹配
- 类型: `RegExp`
- 必填: 是

```javascript
const rule = {
  test: /\.js$/,
  ...
}
```

###### 参数 Exclude

- 描述: 排除
- 类型: `RegExp`|`Array<Regexp>`|`string`|`Array<string>`
- 必填: 否

```javascript
const rule = {
  exclude: /\.babel$/,
  ...
}
```

###### 参数 Extname

- 描述: 后缀名
- 类型: `string`
- 必填: 否

```javascript
const rule = {
  extname: '.js',
  ...
}
```

###### 参数 Type

- 描述: 存储类型
- 类型: `string`
- 可选值: `'static'`|`undefined`
- 必填: 否

```javascript
const rule = {
  type: 'static',
  ...
}
```

###### 参数 Loader

- 描述: 加载器
- 类型: `Array`
- 必填: 是

```javascript
const rule = {
  loader: [
    {
      use: BabelLoader
    },
  ]
}
```

- [Loader配置](./loader.md?id=配置)
