# 加载器

用户加载指定文件, 例如 `sass` 必须编译才能解析它

## 配置

```javascript
export default {
  rules: [
    {
      ...
      loaders: [
        ...
      ]
    }
  ]
  ...
}
```

## 参数

###### 参数 Use

- 描述: 加载器路径
- 类型: `Function`
- 必填: 是

```javascript
const Loader = {
  use: BabelLoader,
  ...
}
```

###### 参数 For

- 描述: 标记 Chunk 类型
- 类型: `string`|`Array`
- 可选值: `'bundle'`|`'bundler'`|`'scatter'`|`'entry'` 

```javascript
const Loader = {
  for: 'bundle',
  ...
}
```

###### 参数 Options

- 描述: 配置
- 类型: `object`

```javascript
const Loader = {
  options: {
    ...
  }
}
```
