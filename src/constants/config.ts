/**
 * 默认配置, 自定义配置可以参考这里
 */
import {
  BabelLoader, EnvifyLoader, UglifyJSLoader, SassLoader,
  CleanPlugin, DevServerPlugin, SpritesmithPlugin,
  chunkTypes
} from '../index'
import ImageLoader from '../loaders/image-wxparcel-loader'
import * as Typings from '../typings'

// 分片类型
const { BUNDLER, SCATTER } = chunkTypes

// JS 规则
let jsRules: Typings.ParcelOptionRule[] = [
  {
    test: /\.js$/,
    extname: '.js',
    loaders: [
      {
        use: BabelLoader
      },
      {
        use: EnvifyLoader,
        options: {
          env: {
            NODE_ENV: process.env.NODE_ENV
          }
        }
      }
    ]
  }
]

// wxss 规则
let wxssRules: Typings.ParcelOptionRule[] = [
  {
    test: /\.scss$/,
    extname: '.wxss',
    loaders: [
      {
        use: SassLoader,
        options: {}
      }
    ]
  }
]

let imageRules: Typings.ParcelOptionRule[] = [
  {
    test: /\.(png|jpe?g)$/,
    loaders: [
      {
        use: ImageLoader,
        options: {}
      }
    ]
  }
]

// 插件配置
let plugins: Typings.ParcelPlugin[] = [
  new CleanPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  }),
  new SpritesmithPlugin()
]

// 开发环境下配置
if (process.env.NODE_ENV === 'development') {
  plugins.push(new DevServerPlugin())
}

// 测试或生产配置
if (process.env.NODE_ENV === 'prerelease' || process.env.NODE_ENV === 'production') {
  jsRules[0].loaders.push({
    use: UglifyJSLoader,
    for: [BUNDLER, SCATTER],
    options: {}
  })
}

class Config {
  /**
   * 获取所有JS规则
   * @readonly
   */
  public get jsRules () {
    return [...jsRules]
  }

  /**
   * 获取所有WXSS规则
   * @readonly
   */
  public get wxssRules () {
    return [...wxssRules]
  }

  /**
   * 获取所有规则
   * @readonly
   */
  public get rules () {
    return [...jsRules, ...wxssRules, ...imageRules]
  }

  /**
   * 获取所有插件
   * @readonly
   */
  public get plugins () {
    return [...plugins]
  }

  /**
   * 设置规则
   * @param name 规则名称
   * @param callback 回调
   */
  public setRule (name: string, callback: (rules: Typings.ParcelOptionRule[]) => Typings.ParcelOptionRule[]): void {
    switch (name) {
      case 'js': {
        let rules = jsRules || []
        jsRules = callback(rules)
        break
      }

      case 'wxss': {
        let rules = wxssRules || []
        wxssRules = callback(rules)
        break
      }
    }
  }

  /**
   * 添加插件
   * @param plugin 插件
   */
  public addPlugin (plugin: Typings.ParcelPlugin): void {
    plugins.push(plugin)
  }

  /**
   * 删除插件
   * @param plugin 插件
   */
  public delPlugin (plugin: { new(): Typings.ParcelPlugin } | Typings.ParcelPlugin): void {
    let index = plugins.findIndex((item) => typeof plugin === 'function' ? item === plugin : item.constructor === plugin.constructor)
    index !== -1 && plugins.splice(index, 1)
  }
}

export default new Config()
