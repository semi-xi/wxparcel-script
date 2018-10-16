import chalk from 'chalk'
import PrettyError from 'pretty-error'
import OptionManager from './option-manager'

class Logger {
  get useConsole () {
    let logType = this.logType
    return logType === 'console' || (Array.isArray(logType) && logType.indexOf('console') !== -1)
  }

  constructor (options = OptionManager) {
    this.logType = options.logType || 'console'
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
  }

  log (...message) {
    console.log(...message)
  }

  trace (message) {
    if (this.useConsole === true && this.silence !== true) {
      this.log(message)
    }
  }

  error (error) {
    if (this.useConsole) {
      if (error instanceof Error || error instanceof TypeError) {
        let pe = new PrettyError()
        error.message = chalk.red(error.message)

        let message = pe.render(error)
        this.trace(message)
      } else {
        error = chalk.red(error)
        this.trace(error)
      }
    }
  }
}

export default new Logger()
