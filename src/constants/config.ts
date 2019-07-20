/**
 * 默认配置, 自定义配置可以参考这里
 */
import {
  BabelLoader, EnvifyLoader, UglifyJSLoader, SassLoader,
  CleanPlugin, DevServerPlugin,
  chunkTypes
} from '../index'
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

// 插件配置
let plugins: Typings.ParcelPlugin[] = [
  new CleanPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  })
]

// 全局配置
const getRules = () => [...jsRules, ...wxssRules]
const getPlugins = () => [...plugins]

const config = new Proxy({ setRule, addPlugin, delPlugin }, {
  get (config, prop) {
    return prop === 'rules' ? getRules() : prop === 'plugins' ? getPlugins() : config[prop]
  },
  ownKeys (config) {
    return Object.keys(config).concat('rules', 'plugins')
  },
  enumerate (config) {
    return Object.keys(config).concat('rules', 'plugins')
  },
  getOwnPropertyDescriptor (config, prop) {
    let state = { writable: false, enumerable: true, configurable: true }
    let value = prop === 'rules' ? getRules() : prop === 'plugins' ? getPlugins() : config[prop]
    return { ...state, value }
  }
})

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

export default config

// 设置规则
function setRule (name, callback) {
  switch (name) {
    case 'js': {
      let rules = jsRules || {}
      jsRules = callback(rules)
      break
    }

    case 'wxss': {
      let rules = wxssRules || {}
      wxssRules = callback(rules)
      break
    }
  }
}

// 添加插件
function addPlugin (plugin) {
  plugins.push(plugin)
}

// 删除插件
function delPlugin (plugin) {
  let index = plugins.findIndex((item) => item.constructor === plugin.constructor)
  index !== -1 && plugins.splice(index, 1)
}
