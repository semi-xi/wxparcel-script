import path from 'path'
import colors from 'colors'
import columnify from 'columnify'

/**
 * 打印器
 *
 * @export
 * @class Printer
 */
export class Printer {
  /**
   * Creates an instance of Printer.
   */
  constructor () {
    /**
     * 是否不做任何打印
     *
     * @type {Boolean}
     */
    this.silence = process.argv.findIndex((argv) => argv === '--quiet') !== -1

    /**
     * 信息集合
     *
     * @type {Array}
     */
    this.messages = []

    /**
     * 延迟的信息集合
     *
     * @type {Array}
     */
    this.layzedMessages = []
  }

  /**
   * 添加到消息队列中
   *
   * @param {Sting} message 信息
   * @param {Menu} type 类型 ['append', 'prepend']
   * @return {Printer} 自身
   */
  push (message, type = 'append') {
    if (typeof message !== 'string') {
      return this
    }

    switch (type) {
      case 'append':
        this.messages.push(message)
        break
      case 'prepend':
        this.messages.unshift(message)
        break
    }

    return this
  }

  /**
   * 添加到延迟消息队列中
   *
   * @param {Sting} message 信息
   * @param {Menu} type 类型 ['append', 'prepend']
   * @return {Printer} 自身
   */
  layze (message, type = 'append') {
    if (typeof message !== 'string') {
      return this
    }

    switch (type) {
      case 'append':
        this.layzedMessages.push(message)
        break
      case 'prepend':
        this.layzedMessages.unshift(message)
        break
    }

    return this
  }

  /**
   * 释放所有的信息
   */
  flush () {
    this.messages.forEach(this.trace.bind(this))
    this.layzedMessages.forEach(this.trace.bind(this))

    this.messages.splice(0)
    this.layzedMessages.splice(0)
  }

  /**
   * 输出错误信息
   *
   * @param {String} message 信息
   */
  error (message) {
    return this.trace(colors.red(message))
  }

  /**
   * 输出警告信息
   *
   * @param {String} message 信息
   */
  warn (message) {
    return this.trace(colors.yellow(message))
  }

  /**
   * 输出信息
   *
   * @param {String} message 信息
   */
  info (message) {
    return this.trace(colors.cyan(message))
  }

  /**
   * 打印信息
   *
   * @param {String} message 信息
   */
  trace (message) {
    this.silence !== true && console.log(message)
  }

  /**
   * 计时器
   * @return {Function} 结束方法
   */
  timer () {
    let startTime = Date.now()

    return {
      reset () {
        startTime = Date.now()
      },
      end () {
        return Date.now() - startTime
      }
    }
  }

  /**
   * 格式化文件大小
   *
   * @param {number} bytes 大小
   * @param {number} decimals 保留小数点
   * @return {string} 文件大小格式
   */
  formatBytes (bytes, decimals) {
    // eslint-disable-next-line eqeqeq
    if (bytes == 0) {
      return '0 Bytes'
    }

    let k = 1024
    let dm = decimals + 1 || 3
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  /**
   * 格式化文件状态
   *
   * @param {array} stats 状态
   * @return {String} 状态信息
   */
  formatStats (stats) {
    return columnify(stats, {
      headingTransform (heading) {
        let name = heading.charAt(0).toUpperCase() + heading.slice(1)
        return colors.bold(colors.white(name))
      },
      config: {
        assets: {
          maxWidth: 80,
          align: 'right',
          dataTransform (file) {
            let dirname = path.dirname(file)
            let filename = path.basename(file)
            if (file.length > this.maxWidth) {
              let length = this.maxWidth - filename.length
              if (length > 0) {
                dirname = dirname.substr(0, length - 3) + '..'
              }
            }

            return colors.bold(colors.green(path.join(dirname, filename)))
          }
        },
        size: {
          align: 'right',
          dataTransform: (size) => {
            return this.formatBytes(size)
          }
        }
      }
    })
  }
}

export default new Printer()
