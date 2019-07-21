import chalk from 'chalk'
import PrettyError from 'pretty-error'
import OptionManager from './OptionManager'

/**
 * 日志管理器
 */
export default class Logger {
  /**
   * 日志类型
   */
  public logType: Array<'console' | 'file'> | 'console' | 'file'

  /**
   * 是否为安静模式
   */
  public silence: boolean

  /**
   * 是否使用控制台输出
   * @readonly
   */
  get useConsole (): boolean {
    let logType = this.logType
    return logType === 'console' || (Array.isArray(logType) && logType.indexOf('console') !== -1)
  }

  constructor (options: OptionManager) {
    this.logType = options.logType || 'console'
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
  }

  /**
   * 记录错误信息
   * @param reason 信息
   */
  public error (reason: Error | TypeErrorConstructor | string): void {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
        let pe = new PrettyError()
        reason.message = chalk.red(reason.message)

        let message = pe.render(reason)
        this.trace(message)

      } else if (typeof reason === 'string') {
        reason = chalk.red(reason)
        this.trace(reason)
      }
    }
  }

  /**
   * 记录警告信息
   * @param reason 信息
   */
  public warn (reason: Error | TypeErrorConstructor | string): void {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
        let pe = new PrettyError()
        reason.message = chalk.yellow(reason.message)

        let message = pe.render(reason)
        this.trace(message)

      } else if (typeof reason === 'string') {
        reason = chalk.red(reason)
        this.trace(reason)
      }
    }
  }

  /**
   * 记录信息
   * @param message 信息
   */
  public trace (message: string): void {
    if (this.useConsole === true && this.silence !== true) {
      this.log(message)
    }
  }

  /**
   * 输出信息
   * @param ...message 信息
   */
  public log (...message: string[]): void {
    console.log(...message)
  }

  /**
   * 清除控制台
   * @param isSoft 信息
   */
  public clear (isSoft: boolean = true): void {
    // process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }

  /**
   * 销毁对象
   */
  public destory (): void {
    this.logType = undefined
    this.silence = undefined
    this.destory = Function.prototype as any
  }
}
