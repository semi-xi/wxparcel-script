import fs from 'fs-extra'
import path from 'path'
import program from 'commander'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../option-manager'
import Parcel from '../parcel'

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

  OptionManager.resolve(parcelOptions)

  let parcel = new Parcel()
  await parcel.run()

  /**
   * 是否监听文件
   */
  if (options.watch) {
    OptionManager.watching = true
    parcel.watch()
  }
}

program
  .command('development')
  .description('Compile mini progam in developmenet mode')
  .option('-c, --config <config>', 'Setting config file')
  .option('-w, --watch <watch>', 'Watch file changed')
  .action(function (options) {
    process.env.NODE_ENV = 'development'

    if (options.hasOwnProperty('watch')) {
      options.watch = options.watch === 'true'
    }

    options = defaultsDeep({}, options, {
      config: path.join(__dirname, '../constants/development.config.js'),
      watch: true
    })

    run(options)
  })

program
  .command('production')
  .description('Compile mini program in production mode')
  .option('-c, --config', '设置配置文件')
  .action(function (options) {
    process.env.NODE_ENV = 'production'

    options = defaultsDeep({}, options, {
      config: path.join(__dirname, '../constants/production.config.js')
    })

    run(options)
  })
