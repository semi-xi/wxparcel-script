import chalk from 'chalk'
import PrettyError from 'pretty-error'
import OptionManager from './option-manager'

export class Logger {
  get useConsole () {
    let logType = this.logType
    return logType === 'console' || (Array.isArray(logType) && logType.indexOf('console') !== -1)
  }

  constructor (options = OptionManager) {
    this.logType = options.logType || 'console'
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
  }

  error (reason) {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
        let pe = new PrettyError()
        reason.message = chalk.red(reason.message)

        let message = pe.render(reason)
        this.trace(message)
      } else {
        reason = chalk.red(reason)
        this.trace(reason)
      }
    }
  }

  warn (reason) {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
        let pe = new PrettyError()
        reason.message = chalk.yellow(reason.message)

        let message = pe.render(reason)
        this.trace(message)
      } else {
        reason = chalk.yellow(reason)
        this.trace(reason)
      }
    }
  }

  trace (message) {
    if (this.useConsole === true && this.silence !== true) {
      this.log(message)
    }
  }

  log (...message) {
    console.log(...message)
  }

  clear (isSoft = true) {
    process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }
}

export default new Logger()
