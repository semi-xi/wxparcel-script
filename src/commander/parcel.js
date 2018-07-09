import fs from 'fs-extra'
import path from 'path'
import program from 'commander'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../option-manager'
import Parcel from '../parcel'

const run = function (options) {
  let { config: configFile } = options

  if (!configFile) {
    throw new TypeError('找不到配置文件配置')
  }

  if (!path.isAbsolute(configFile)) {
    configFile = path.join(OptionManager.rootDir, configFile)
  }

  if (!fs.existsSync(configFile)) {
    throw new Error(`配置文件不存在, 请检查配置文件, ${configFile}`)
  }

  let babelrc = path.join(OptionManager.rootDir, './.babelrc')
  if (fs.existsSync(babelrc)) {
    let babelConfig = fs.readJSONSync(babelrc)
    require('babel-register')(babelConfig || {})
  }

  let parcelOptions = require(configFile)
  parcelOptions = parcelOptions.default || parcelOptions

  OptionManager.resolve(parcelOptions)

  let parcel = new Parcel()
  parcel.run()

  if (options.watch) {
    OptionManager.watching = !!options.watch
    parcel.watch()
  }
}

program
  .command('development')
  .description('构建微信小程序(开发模式)')
  .option('-c, --config <config>', '设置配置文件')
  .option('-w, --watch <watch>', '监听文件变更')
  .action(function (options) {
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
  .description('构建微信小程序(生产模式)')
  .option('-c, --config', '设置配置文件')
  .action(function (options) {
    options = defaultsDeep({}, options, {
      config: path.join(__dirname, '../constants/production.config.js')
    })
  })
