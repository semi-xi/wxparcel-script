import fs from 'fs-extra'
import path from 'path'
import program from 'commander'
import colors from 'colors'
import PrettyError from 'pretty-error'
import OptionManager from '../option-manager'
import Parcel from '../parcel'
import Package from '../../package.json'

/**
 * 执行编译流程
 *
 * @param {Object} [options={}] 配置
 * @param {String} options.config 配置文件
 */
const run = async function (options = {}) {
  let { config: configFile } = options

  if (!configFile) {
    throw new TypeError('Config file is not provided')
  }

  if (!path.isAbsolute(configFile)) {
    configFile = path.join(OptionManager.rootDir, configFile)
  }

  if (!fs.existsSync(configFile)) {
    throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
  }

  let babelrc = path.join(OptionManager.execDir, './.babelrc')
  if (fs.existsSync(babelrc)) {
    let babelConfig = fs.readJSONSync(babelrc)
    require('babel-register')(babelConfig || {})
  }

  let parcelOptions = require(configFile)
  parcelOptions = parcelOptions.default || parcelOptions

  if (options.hasOwnProperty('publicPath')) {
    parcelOptions.publicPath = options.publicPath
  }

  await OptionManager.resolve(parcelOptions)

  let parcel = new Parcel()
  await parcel.run()

  /**
   * 是否监听文件
   */
  if (options.watch) {
    PrettyError.start()

    OptionManager.watching = true
    parcel.watch()
  }
}

program
  .command('start')
  .description('start the compilation process')
  .option('-c, --config <config>', 'setting configuration file')
  .option('-w, --watch', 'open the listener for file changes')
  .option('--publicPath <publicPath>', 'set public path of static resources')
  .on('--help', () => {
    console.log('')
    console.log('  Examples:')
    console.log('')
    console.log('    $ wxparcel-script start --config path/to/config.js --watch')
    console.log('')
  })
  .action(async function (options = {}) {
    try {
      if (options.config) {
        if (path.isAbsolute(options.config)) {
          if (!fs.existsSync(options.config)) {
            throw new Error(`Config file is not found. you can type \`${Package.name} start --help\` to learn more detail.`)
          }
        } else {
          switch (options.config) {
            case 'development':
              process.env.NODE_ENV = 'development'
              options.config = path.join(__dirname, '../constants/development.config.js')
              break

            case 'production':
              process.env.NODE_ENV = 'production'
              options.config = path.join(__dirname, '../constants/production.config.js')
              break
          }
        }
      }

      options.watch = options.hasOwnProperty('watch')
      await run(options)
    } catch (error) {
      let pe = new PrettyError()
      error.message = colors.red(error.message)

      let message = pe.render(error)
      console.log(message)
    }
  })
