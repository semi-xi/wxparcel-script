# 编写

工作流暂时提供了三种钩子方式, `applyAsync`, `applyBefore`, `applyBeforeTransform`

## 使用

- [使用](./option.md?id=参数-plugins)

## 编写

```javascript
export default class CustomPlugin {
  // 与工作流并行执行
  public async applyAsync (options) {
    // ...
  }

  // 运行之前执行
  public async applyBefore (options) {
    // ...
  }

  // 写入之前执行
  public async applyBeforeTransform (assets, options) {
    // ...
  }
}
```
