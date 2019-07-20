import Chunk from './Chunk'
import OptionManager from './OptionManager'
import * as Typings from '../typings'

/**
 * 资源管理器
 * @description
 * 用于管理所有 Chunk
 * 通过他能查找,添加,修改,删除文件相对应的 chunk
 */
export default class Assets {
  /**
   * 代码片段集合
   */
  public chunks: Chunk[]

  /**
   * 配置
   */
  public options: OptionManager

  /**
   * 获取大小
   * @readonly
   */
  public get size (): number {
    return this.chunks.length
  }

  constructor (options: OptionManager) {
    this.options = options
    this.chunks = []
  }

  /**
   * 根据文件获取 chunk 的下标
   * @param file 文件名
   * @returns 下标
   */
  public index (file: string): number {
    return this.chunks.findIndex((chunk) => chunk.file === file)
  }

  /**
   * 添加 chunk
   * @param file 文件名
   * @param [state={}] 状态
   */
  public add (file: string, state: Typings.ParcelChunkState = {}): Chunk {
    let chunk = new Chunk(file, state, this.options)
    this.chunks.push(chunk)
    return chunk
  }

  /**
   * 更新 chunk
   * @param file 文件名
   * @param [state={}] 状态
   */
  public update (file: string, state: Partial<Chunk> = {}): void {
    let chunk = this.get(file)
    chunk && chunk.update(state)
  }

  /**
   * 通过文件获取 chunk
   * @param file 文件名
   */
  public get (file: string): Chunk {
    let index = this.index(file)
    return this.chunks[index] || null
  }

  /**
   * 通过文件删除 chunk
   * @param file 文件名
   */
  public del (file: string): void {
    let index = this.index(file)
    index !== -1 && this.chunks.splice(index, 1)
  }

  /**
   * 通过文件判断 chunk 是否已存在
   * @param file 文件名
   * @returns 是否存在
   */
  public exists (file: string): boolean {
    return this.index(file) !== -1
  }

  /**
   * 查找依赖于 file 的 chunks
   * @param file 文件
   * @returns 文件
   */
  public findChunkByDependent (file: string): Chunk[] {
    return this.chunks.filter((chunk) => {
      let index = chunk.dependencies.findIndex((item) => item.dependency === file)
      return index !== -1
    })
  }

  /**
   * 清除所有 chunk
   */
  public clean (): void {
    let chunks = this.chunks.splice(0)
    this.chunks = []

    chunks.forEach((chunk) => chunk.destory())
  }

  /**
   * 销毁对象
   */
  public destory (): void {
    Array.isArray(this.chunks) && this.chunks.splice(0).forEach((item) => item.destory())

    this.chunks = undefined
    this.options = undefined

    this.destory = Function.prototype as any
  }
}
