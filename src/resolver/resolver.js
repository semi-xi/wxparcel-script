import OptionManager from '../option-manager'

export class Resolver {
  constructor (options = OptionManager) {
    this.options = options
  }

  resolveDestination (file) {
    let { rootDir, srcDir, outDir } = this.options

    /**
     * windows 下 path 存在多个反斜杠
     * 因此需要 escape 才能进行 search
     * 这里可以直接使用 indexOf 进行查询
     */
    return file.indexOf(srcDir) !== -1
      ? file.replace(srcDir, outDir)
      : file.replace(rootDir, outDir)
  }
}
