import * as fs from 'fs-extra'
import * as path from 'path'
import pick from 'lodash/pick'
import cloneDeep from 'lodash/cloneDeep'
import isPlainObject from 'lodash/isPlainObject'
import OptionManager from './OptionManager'
import * as Types from '../constants/chunk-type'
import * as Typings from '../typings'

interface ChunkUpdateProps extends Omit<Partial<Chunk>, 'dependencies'> {
  dependencies?: Typings.ParcelChunkDependency[] | string[]
}

/**
 * 代码片段
 * @description
 * 用于管理代码文件, 包括其状态, 代码块等
 */
export default class Chunk {
  /**
   * 配置管理器
   */
  public options: OptionManager

  /**
   * 是否已经释放
   */
  public flushed: boolean

  /**
   * 文件路径
   */
  public file: string

  /**
   * 分片类型
   */
  public type: ValueOf<typeof Types>

  /**
   * 依赖集合
   */
  public dependencies: Typings.ParcelChunkDependency[]

  /**
   * 代码内容
   */
  public content: Buffer | string

  /**
   * 代码映射表 SourceMap
   */
  public sourceMap: string | { [key: string]: any }

  /**
   * 加载规则
   * 重置 rule 值再赋值
   * 下面 rule 需要默认值来使用
   */
  public rule: Typings.ParcelOptionRule

  /**
   * 代码片段状态
   */
  public state: Typings.ParcelChunkState

  /**
   * 保存的目的地路径
   */
  public destination: string | string[]

  /**
   * 原始数据
   * @readonly
   */
  public get metadata (): Pick<this, 'file' | 'type' | 'dependencies' | 'content' | 'sourceMap' | 'rule' | 'destination'> {
    let metadata = pick(this, ['file', 'type', 'dependencies', 'content', 'sourceMap', 'rule', 'destination'])
    return cloneDeep(metadata)
  }

  constructor (file: string, state: Typings.ParcelChunkState = {}, options: OptionManager) {
    if (!file) {
      throw new TypeError('File is invalid or not be provied')
    }

    if (!fs.existsSync(file)) {
      if (!state.content) {
        throw new Error(`File ${file} is not found`)
      }
    }

    this.options = options
    this.flushed = false
    this.file = file
    this.type = state.type || null
    this.dependencies = []

    if (Array.isArray(state.dependencies) && state.dependencies.length > 0) {
      state.dependencies.forEach((dependency: Typings.ParcelChunkDependency | string) => {
        if (typeof dependency === 'string') {
          this.dependencies.push({ dependency })
        }

        if (typeof dependency === 'object') {
          this.dependencies.push(dependency)
        }
      })
    }

    this.content = typeof state.content === 'string' ? Buffer.from(state.content || '') : state.content

    this.sourceMap = null
    if (options.sourceMap !== false) {
      if (typeof state.sourceMap === 'string') {
        this.sourceMap = JSON.parse(state.sourceMap)

      } else if (typeof state.sourceMap === 'object') {
        this.sourceMap = state.sourceMap
      }
    }

    let { rootDir, srcDir, outDir, npmDir, staticDir } = this.options
    let { rule, destination } = this.state = state

    this.rule = rule = rule || {} as any
    this.destination = destination || ''

    if (destination) {
      if (rule.extname) {
        let dirname = path.dirname(destination)
        let filename = path.basename(destination)
        let extname = path.extname(file)

        filename = filename.replace(extname, rule.extname)
        this.destination = path.join(dirname, filename)
      } else {
        this.destination = destination
      }
    } else {
      /**
       * windows 下 path 存在多个反斜杠
       * 因此需要 escape 才能进行 search
       * 这里可以直接使用 indexOf 进行查询
       */
      let relativePath = file.indexOf(srcDir) !== -1
        ? path.dirname(file).replace(srcDir, '')
        : /[\\/]node_modules[\\/]/.test(file)
          ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), npmDir)
          : path.dirname(file).replace(rootDir, '')

      let filename = path.basename(file)
      if (rule.extname) {
        let extname = path.extname(file)
        filename = filename.replace(extname, rule.extname)
      }

      this.destination = path.join(rule.type === 'static' ? staticDir : outDir, relativePath, filename)
    }
  }

  /**
   * 更新状态
   * @param props 属性
   */
  public update (props: ChunkUpdateProps): void {
    const { sourceMap: useSourceMap } = this.options
    if (props.hasOwnProperty('file') && typeof props.file === 'string') {
      this.file = props.file
    }

    if (props.hasOwnProperty('type') && typeof props.type === 'string') {
      this.type = props.type
    }

    if (props.hasOwnProperty('dependencies') && Array.isArray(props.dependencies)) {
      if (props.dependencies.length > 0) {
        this.dependencies = []

        props.dependencies.forEach((dependency) => {
          if (typeof dependency === 'string') {
            this.dependencies.push({ dependency })
          }

          if (typeof dependency === 'object') {
            this.dependencies.push(dependency)
          }
        })
      }
    }

    if (props.hasOwnProperty('rule') && isPlainObject(props.rule)) {
      this.rule = props.rule
    }

    if (props.hasOwnProperty('destination') && (typeof props.destination === 'string' || Array.isArray(props.destination))) {
      this.destination = props.destination
    }

    if (props.hasOwnProperty('content')) {
      if (typeof props.content === 'string') {
        this.content = Buffer.from(props.content)

      } else if (props.content instanceof Buffer) {
        this.content = props.content
      }
    }

    if (useSourceMap !== false) {
      if (props.hasOwnProperty('sourceMap') && this.options.sourceMap !== false) {
        if (typeof props.sourceMap === 'string') {
          this.sourceMap = JSON.parse(props.sourceMap)
        } else if (typeof props.sourceMap === 'object') {
          this.sourceMap = props.sourceMap
        }
      }
    }

    this.flushed = false
  }

  /**
   * 释放
   * @returns metadata 元数据
   */
  public flush (): this['metadata'] {
    this.flushed = true
    return this.metadata
  }

  /**
   * 销毁对象
   */
  public destory (): void {
    this.file = undefined
    this.dependencies = undefined
    this.state = undefined
    this.rule = undefined
    this.destination = undefined

    this.destory = Function.prototype as any
  }
}
