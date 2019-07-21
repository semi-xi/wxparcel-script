# 加载器

## 使用

- [使用](./loader.md?id=配置)

## 编写

```javascript
export default function CustomerLoader (asset, options) {
  ...
  return Promise.resolve({ code, map, dependencies })
}
```

###### 传入值 asset

- 描述: 代码片段信息
  - 包含代码与相应的文件信息和依赖信息
- 类型: `object`

###### 传入值 options

- 描述: 配置信息
  - 配置信息会整到这个参数中
- 类型: `object`

###### 返回 code

- 描述: 代码
- 类型: `string`|`Buffer`
- 必填: 是

###### 返回 map

- 描述: 代码
- 类型: `string`|`object`
- 必填: 非必要

###### 返回 dependencies

- 描述: 代码
- 类型: `string`|`Array<string>`
- 必填: 非必要
