import Chunk from '../Chunk'
import Assets from '../Assets'
import OptionManager from '../OptionManager'

export default class Bundler {
  /**
   * 配置
   */
  public options: OptionManager

  /**
   * 全局资源管理
   */
  public assets: Assets

  /**
   * 片段集合
   */
  public chunks: Chunk[]

  /**
   * 打包资源集合
   */
  public bundler: Chunk[]

  constructor (chunks: Chunk[], options: OptionManager) {
    this.options = options
    this.assets = new Assets(options)
    this.chunks = Array.isArray(chunks) ? chunks : []
    this.bundler = []
  }

  /**
   * 返回片段信息
   */
  public bundle (): Promise<Chunk[]> {
    return Promise.resolve(this.chunks)
  }
}
