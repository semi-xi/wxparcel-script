import fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import pick from 'lodash/pick'
import program from 'commander'
import columnify from 'columnify'
import Parcel from '../libs/Parcel'
import GlobalOptionManager from '../services/option-manager'
import GlobalLogger from '../services/logger'
import * as Typings from '../typings'
import Project from '../constants/project'
import babelRequire from '../vendors/babel-register'

// 执行编译流程
const run = async (options: Typings.ParcelCliOptions = {}) => {
  let { config: configFile } = options
  if (!configFile) {
    throw new TypeError('Config file is not provided')
  }

  if (!fs.existsSync(configFile)) {
    throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
  }

  let parcelOptions: any
  switch (path.extname(configFile)) {
    case '.js': {
      if (/\.babel\.js$/.test(configFile)) {
        parcelOptions = await babelRequire(configFile)
        break
      }

      parcelOptions = require(configFile)
      parcelOptions = parcelOptions.default || parcelOptions
      break
    }

    case '.ts': {
      break
    }
  }

  if (options.hasOwnProperty('publicPath')) {
    options.publicPath = options.publicPath
  }

  let proto = Object.getPrototypeOf(parcelOptions)
  let descriptors = Object.entries(Object.getOwnPropertyDescriptors(proto))
  let getters = descriptors.filter(([_key, descriptor]) => typeof descriptor.get === 'function').map(([key]) => key)
  let getterOptions = pick(parcelOptions, getters)

  parcelOptions = Object.assign({}, getterOptions, parcelOptions, options)
  await GlobalOptionManager.resolve(parcelOptions)

  cleanConsole()
  printInfo()

  let parcel = new Parcel(GlobalOptionManager)
  let stats = await parcel.run()
  printStats(stats)

  /**
   * 是否监听文件
   */
  if (options.watch) {
    GlobalOptionManager.watching = true

    let options = {
      change: (file, hasBeenEffect) => GlobalLogger.trace(`\nFile ${chalk.bold(file)} has been changed, ${hasBeenEffect ? 'compile' : 'but it\'s not be required, ignore'}...\n`),
      unlink: (file) => GlobalLogger.trace(`\nFile ${chalk.bold(file)} has been deleted, but it will be only delete from cache.\n`),
      complete: (stats) => printStats(stats)
    }

    parcel.watch(options)
  }
}

// Start Action
const startAction = async (options: Typings.ParcelCliOptions = {}) => {
  try {
    let { config, env } = options

    switch (env) {
      case 'dev':
      case 'develop':
      case 'development': {
        process.env.NODE_ENV = 'development'
        break
      }

      case 'test':
      case 'unitest':
      case 'prerelease': {
        process.env.NODE_ENV = 'test'
        break
      }

      case 'prod':
      case 'product':
      case 'production':
      case 'release': {
        process.env.NODE_ENV = 'production'
        break
      }
    }

    if (!config) {
      config = path.join(__dirname, '../constants/config.js')
    }

    if (!path.isAbsolute(config)) {
      config = path.join(GlobalOptionManager.rootDir, config)
    }

    if (!fs.existsSync(config)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${config}`)
    }

    options.config = config
    options.watch = options.hasOwnProperty('watch')

    await run(options)

  } catch (error) {
    GlobalLogger.error(error)
  }
}

// Help Action
const helpAction = () => {
  GlobalLogger.trace('\nExamples:')
  GlobalLogger.trace(`  $ wxparcel-script start --env development --watch`)
  GlobalLogger.trace('  $ wxparcel-script start --env production --config wx.config.js')
}

const padidngMessage = ' '.padStart(27)

program
  .command('start')
  .description('start the compilation process')
  .option('-c, --config <config>', 'setting configuration file')
  .option('-w, --watch', 'open the listener for file changes')
  .option('--publicPath <publicPath>', 'set public path of static resources')
  .option('--sourceMap <sourceMap>', 'generate sourceMap')
  .option('--env <env>', `setting process.env.NODE_ENV variables` +
  `\n${padidngMessage}${chalk.bold('dev|develop|development')} for development` +
  `\n${padidngMessage}${chalk.bold('test|unitest|prerelease')} for test` +
  `\n${padidngMessage}${chalk.bold('prod|product|production')} for production`
  )
  .option('--bundle <bundle>', 'generate bundlers with generated bundler')
  .on('--help', helpAction)
  .action(startAction)

function cleanConsole () {
  GlobalLogger.clear()
}

function printInfo () {
  const { srcDir, watching, pubPath } = GlobalOptionManager
  GlobalLogger.trace(`Version: ${chalk.cyan.bold(Project.version)}`)
  GlobalLogger.trace(`StaticServ: ${chalk.cyan.bold(pubPath)}`)
  GlobalLogger.trace(`Open your ${chalk.cyan.bold('WeChat Develop Tool')} to serve. Download in ${chalk.white.bold('https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html')}`)
  watching && GlobalLogger.trace(`Watching folder ${chalk.white.bold(srcDir)}, cancel at ${chalk.white.bold('Ctrl + C')}`)
}

function printStats (stats: any = {}) {
  const maxWidth = 80

  const headingTransform = (heading) => {
    let name = heading.charAt(0).toUpperCase() + heading.slice(1)
    return chalk.white.bold(name)
  }

  const assetsDataTransform = (file) => {
    let { outDir, staticDir } = GlobalOptionManager
    file = file.replace(outDir + path.sep, '').replace(staticDir + path.sep, '')

    let dirname = path.dirname(file)
    let filename = path.basename(file)
    if (file.length > maxWidth) {
      let length = maxWidth - filename.length
      if (length > 0) {
        dirname = dirname.substr(0, length - 3) + '..'
      }
    }

    return chalk.green.bold(path.join(dirname, filename))
  }

  const formatBytes = (bytes, decimals = NaN) => {
    // tslint:disable-next-line:triple-equals
    if (bytes == 0) {
      return '0 Bytes'
    }

    let k = 1024
    let dm = decimals + 1 || 3
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const sizeDataTransform = (size) => {
    return formatBytes(size)
  }

  const options = {
    headingTransform: headingTransform,
    config: {
      assets: {
        maxWidth: maxWidth,
        align: 'right',
        dataTransform: assetsDataTransform
      },
      size: {
        align: 'right',
        dataTransform: sizeDataTransform
      }
    }
  }

  const message = columnify(stats, options)

  if (stats.spendTime) {
    GlobalLogger.trace(message)
    GlobalLogger.trace(`\n${chalk.gray('Spend Time:')} ${chalk.white.bold(stats.spendTime)}ms\n`)
  }

  printInfo()
}
