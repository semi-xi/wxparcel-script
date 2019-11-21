import Chunk from './libs/Chunk'
import Assets from './libs/Assets'
import OptionManager from './libs/OptionManager'
import * as Types from './constants/chunk-type'

/**
 * CLI 配置
 */
export interface ParcelCliOptions {
  config?: string
  watch?: boolean
  publicPath?: string
  sourceMap?: boolean | string
  env?: string
  bundle?: boolean | string
}

/**
 * 配置项
 */
export interface ParcelOptions {
  /**
   * 原文件存放目录, 相对根目录
   */
  src?: string

  /**
   * 输出文件存放目录, 相对根目录
   */
  output?: string

  /**
   * 静态文件存放目录, 相对根目录
   */
  static?: string

  /**
   * 临时文件存放目录, 相对根目录
   */
  tmpl?: string

  /**
   * 公共服务路径, 相对根目录
   */
  publicPath?: string

  /**
   * node_module 存放目录, 相对根目录
   * @description 因为小程序 node_module 被限制上传, 因此这里需要更换存放文件夹
   */
  nodeModuleDirectoryName?: string

  /**
   * 日志类型
   */
  logType?: Array<'console' | 'file'> | 'console' | 'file'

  /**
   * 规则集合
   */
  rules?: ParcelOptionRule[]

  /**
   * 是否生成 sourceMap
   */
  sourceMap?: string | boolean

  /**
   * 使用的插件
   */
  plugins?: ParcelPlugin[]

  /**
   * 监听文件改动
   */
  watch?: boolean

  /**
   * 是否打包模块
   *
   * @description
   * 打包的模块根据 `libs(src)/bundler/*` 文件定义
   * 可以通过 `libs(src)/bundler` 中的 `Bundler.register` 注册
   */
  bundle?: boolean

  /**
   * 是否为安静模式
   */
  silence?: boolean
}

/**
 * 检查配置
 */
export interface ParcelWatchOptions {
  /**
   * 监听文件改动
   * @param file 文件
   * @param hasBeenEffect 是否有影响
   */
  change?: (file: string, hasBeenEffect: boolean) => any

  /**
   * 监听文件删除
   * @param file 文件
   * @param hasBeenEffect 是否有影响
   */
  unlink?: (file: string, hasBeenEffect: boolean) => any

  /**
   * 每一次完成回调
   */
  complete?: (stats: Array<{ assets: string[], size: number }>) => any
}

/**
 * 编译规则配置
 */
export interface ParcelOptionRule {
  /**
   * 匹配方式
   */
  test: RegExp

  /**
   * 排除
   */
  exclude?: Array<RegExp | string>

  /**
   * 加载器
   */
  loaders: ParcelOptionRuleLoader[]

  /**
   * 后缀名
   */
  extname?: string

  /**
   * 存储类型
   */
  type?: 'static'
}

/**
 * 加载器配置
 */
export interface ParcelOptionRuleLoader {
  /**
   * 加载器路径
   */
  use: (asset: any, options: ParcelLoaderOptions) => Promise<{ code: string | Buffer, map?: string | object, dependencies?: ParcelChunkDependency[] | string[] }>

  /**
   * 标记 Chunk 类型
   */
  for?: ValueOf<typeof Types>[] | ValueOf<typeof Types>

  /**
   * 配置
   */
  options?: any
}

/**
 * 加载器配置
 */
export interface ParcelLoaderOptions extends NonFunctionProperties<OptionManager> {
  file: string
  rule: ParcelOptionRule
  options: object
}

/**
 * 代码片段状态
 */
export interface ParcelChunkState {
  /**
   * 内容
   */
  content?: Buffer | string

  /**
   * 分片类型
   */
  type?: ValueOf<typeof Types>

  /**
   * 依赖集合
   */
  dependencies?: ParcelChunkDependency[] | string[]

  /**
   * 代码映射表 SourceMap
   */
  sourceMap?: string | { [key: string]: any }

  /**
   * 加载规则
   */
  rule?: ParcelOptionRule

  /**
   * 保存的目的地路径
   */
  destination?: string | string[]
}

/**
 * 微信小程序项目配置
 */
export interface WXProjectConfig {
  /**
   * 小程序根路径
   */
  miniprogramRoot?: string

  /**
   * 小程序插件根路径
   */
  pluginRoot?: string
  [key: string]: any
}

/**
 * 微信小程序页面配置
 */
export interface WXPageConfig {
  pages?: string[]
  usingComponents?: {
    [key: string]: string
  }
  subpackages?: Array<{
    root?: string
    pages?: string[]
  }>
  subPackages?: Array<{
    root?: string
    pages?: string[]
  }>
}

/**
 * 微信小程序插件配置
 */
export interface WXPluginConfig {
  publicComponents?: {
    [key: string]: string
  }
}

/**
 * 加载器
 */
export type ParcelLoader = (asset: Chunk['metadata'], options: ParcelLoaderOptions) => Promise<{ code: string | Buffer, map?: string | object, dependencies?: ParcelChunkDependency[] | string[] }>

/**
 * 插件
 */
export interface ParcelPlugin {
  applyAsync?: (options: NonFunctionProperties<OptionManager>) => Promise<any>
  applyBefore?: (options: OptionManager) => Promise<any>
  applyBeforeTransform?: (assets: Assets, options: NonFunctionProperties<OptionManager>) => Promise<any>,
  applyBeforeFlush?: (assets: Assets, options: NonFunctionProperties<OptionManager>) => Promise<any>
}

export interface ParcelChunkDependency {
  file?: string
  dependency: string
  destination?: string | string[]
  required?: string
  type?: ValueOf<typeof Types>
}

export interface PMInstallOptions {
  installPeers?: boolean
  saveDev?: boolean
  packageManager?: string
}

export type ProcessStdout = (data: Buffer, type?: string) => void
