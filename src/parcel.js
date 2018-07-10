import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import forEach from 'lodash/forEach'
import capitalize from 'lodash/capitalize'
import OptionManager from './option-manager'
import Parser from './parser'
import Printer from './printer'
import Package from '../package.json'

const JSON_REGEXP = /\.json$/
const JS_REGEXP = /\.js$/
const WXML_REGEXP = /\.wxml$/
const WXSS_REGEXP = /\.wxss$/

export default class Parcel {
  constructor (options = OptionManager) {
    this.running = false
    this.paddingTask = null
    this.parser = new Parser(options)
  }

  _buildAppConf (config) {
    let { outDir } = OptionManager
    let appConfFile = path.join(outDir, './app.json')
    return writeJsonFile(appConfFile, config).then(() => appConfFile)
  }

  _buildProjConf (config) {
    let { outDir } = OptionManager
    let projectConfFile = path.join(outDir, './project.config.json')
    return writeJsonFile(projectConfFile, config).then(() => projectConfFile)
  }

  run () {
    if (this.running === true) {
      Printer.warn(`WXParcel is running, you can enter ${colors.bold('Ctrl + C')} to exit.`)
      return
    }

    this.running = true
    Printer.time()

    let entries = this.findAllEntries()
    let components = entries.map(({ files }) => {
      let file = files.find((file) => JSON_REGEXP.test(file))
      return this.findAllComponents(file)
    })

    components = flatten(components)

    let modules = [].concat(entries, components)
    let files = modules.map((entry) => entry.files)
    files = flatten(files)

    let installation = (flowdata) => {
      let { appConfig, projectConfig } = OptionManager
      let initTasks = [
        this._buildAppConf(appConfig),
        this._buildProjConf(projectConfig)
      ]

      return Promise.all(initTasks).then((files) => {
        let [appFile, projFile] = files
        let confStats = []
        let stats = fs.statSync(appFile)
        confStats.push({ assets: appFile, size: stats.size })

        stats = fs.statSync(projFile)
        confStats.push({ assets: projFile, size: stats.size })

        return this.flush(flowdata).then((stats) => {
          stats = confStats.concat(stats)
          stats.spendTime = Printer.timeEnd()

          this.printStats(stats)
          this.running = false
        })
      })
    }

    return this.parser
      .multiCompile(files, OptionManager)
      .then(installation)
  }

  watch () {
    OptionManager.watch()

    OptionManager.watchAppConfigChanged(({ config }) => {
      this._buildAppConf(config).then((file) => {
        Printer.trace(colors.cyan(`${colors.bold(file)} is updated`))
      })
    })

    OptionManager.watchProjectConfigChanged(({ config }) => {
      this._buildProjConf(config).then((file) => {
        Printer.info(colors.cyan(`${colors.bold(file)} is updated`))
      })
    })

    let ignoreFile = (file) => {
      let { appConfigFile, projectConfigFile } = OptionManager
      if ([appConfigFile, projectConfigFile].indexOf(file) !== -1) {
        return true
      }

      let { assets } = this.parser
      if (!assets.exists(file)) {
        return true
      }

      return false
    }

    let handleFileChange = (file) => {
      if (ignoreFile(file) === true) {
        return
      }

      let { rootDir } = OptionManager
      let relativePath = colors.bold(file.replace(rootDir, ''))
      Printer.info(`Source file ${relativePath} has been changed, compiling...`)

      let compile = () => {
        this.running = true

        Printer.time()

        let { chunk } = this.parser.assets.get(file)
        this.parser
          .transform(file)
          .then((metadata) => {
            metadata.destination = chunk.destination
            metadata.rule = chunk.rule

            let dependencies = metadata.dependencies || []
            if (!Array.isArray(dependencies) || dependencies.length === 0) {
              return [metadata]
            }

            let files = dependencies.map((item) => item.dependency)
            return this.parser.multiCompile(files).then((assets) => [metadata, ...assets])
          })
          .then((assets) => this.flush(assets))
          .then((stats) => {
            stats.spendTime = Printer.timeEnd()

            this.printStats(stats)
            this.running = false

            this.excutePaddingTask()
          })
      }

      if (this.running === true) {
        this.paddingTask = compile.bind(this)
        return
      }

      compile()
    }

    let handleFileUnlink = (file) => {
      if (ignoreFile(file) === true) {

      }

      // todo...
    }

    let watcher = chokidar.watch(OptionManager.srcDir)
    watcher.on('change', handleFileChange)
    watcher.on('unlink', handleFileUnlink)

    let handleProcessSigint = process.exit.bind(process)
    let handleProcessExit = function () {
      watcher && watcher.close()

      process.removeListener('exit', handleProcessExit)
      process.removeListener('SIGINT', handleProcessSigint)

      handleProcessExit = undefined
      handleProcessSigint = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)
  }

  excutePaddingTask () {
    if (typeof this.paddingTask === 'function') {
      this.paddingTask()
      this.paddingTask = undefined
    }
  }

  flush (assets) {
    if (!Array.isArray(assets) || assets.length === 0) {
      throw new TypeError('Assets is not a array or not be provided or be empty')
    }

    let promises = assets.map(({ destination, source }) => {
      return new Promise((resolve, reject) => {
        let queue = [
          fs.ensureFile.bind(fs, destination),
          fs.writeFile.bind(fs, destination, source)
        ]

        waterfall(queue, (error) => {
          if (error) {
            reject(error)
            return
          }

          let stats = fs.statSync(destination)
          resolve({ assets: destination, size: stats.size })
        })
      })
    })

    return Promise.all(promises)
  }

  findAllEntries () {
    let entries = OptionManager.appConfig.pages || []

    entries = entries.map((entry) => {
      entry = path.join(OptionManager.srcDir, entry)

      let folder = path.dirname(entry)
      if (!fs.existsSync(folder)) {
        throw new Error(`查找不到文件夹 ${folder}`)
      }

      let name = path.basename(entry)
      return this.findModule(name, folder)
    })

    return entries
  }

  findAllComponents (file) {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} is not found or not be provided`)
    }

    let relativePath = path.dirname(file)
    let config = fs.readJSONSync(file)
    let components = []

    forEach(config.usingComponents, (component) => {
      let folder = path.dirname(component)
      folder = this.resolveRelativePath(folder, [relativePath, OptionManager.srcDir])
      if (!folder) {
        return
      }

      let name = path.basename(component)
      components.push(this.findModule(name, folder))
    })

    return components
  }

  findModule (name, folder) {
    if (!folder) {
      throw new TypeError('Folder is not provided')
    }

    if (!fs.statSync(folder).isDirectory()) {
      throw new Error(`Folder ${folder} is not found or not a folder`)
    }

    let files = fs.readdirSync(folder)
    let regexp = new RegExp(name)

    files = files.filter((file) => {
      if (!regexp.test(path.basename(file))) {
        return false
      }

      let tester = [JSON_REGEXP, JS_REGEXP, WXML_REGEXP, WXSS_REGEXP]
      let index = tester.findIndex((regexp) => regexp.test(file))
      if (index !== -1) {
        return true
      }

      if (Array.isArray(OptionManager.rules)) {
        let index = OptionManager.rules.findIndex((rule) => rule.test.test(file))
        if (index !== -1) {
          return true
        }
      }
    })

    files = files.map((file) => path.join(folder, file))
    return { name, dir: folder, files }
  }

  resolveRelativePath (file, paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error('Paths is not a array or not be provided')
    }

    for (let i = paths.length; i--;) {
      let dir = paths[i]
      let target = path.join(dir, file)

      if (fs.existsSync(target)) {
        return target
      }
    }

    return false
  }

  printStats (stats, watching = OptionManager.watching) {
    let { rootDir, srcDir } = OptionManager

    let statsFormatter = stats.map(({ assets, size }) => {
      assets = assets.replace(rootDir, '.')
      return { assets, size }
    })

    let warning = map(stats.conflict, (dependency, file) => {
      file = file.replace(rootDir, '')
      dependency = dependency.replace(rootDir, '')
      return `-> ${file} ${colors.gray('reqiured')} ${dependency}`
    })

    Printer.push('')
    Printer.push(`${capitalize(Package.name).replace(/-(\w)/g, (_, $1) => $1.toUpperCase())} Version at ${colors.cyan.bold(Package.version)}`)
    Printer.push(`${colors.gray('Time:')} ${colors.bold(colors.white(stats.spendTime))}ms\n`)
    Printer.push(Printer.formatStats(statsFormatter))
    Printer.push('')

    watching && Printer.push(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
    watching && Printer.push(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
    Printer.push('')

    if (warning.length > 0) {
      Printer.push(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Program'))
      Printer.push(warning.join('\n'))
      Printer.push('')
    }

    Printer.flush()
  }
}

const writeJsonFile = function (file, source) {
  return new Promise((resolve, reject) => {
    source = JSON.stringify(source, null, 2)

    let queue = [
      fs.ensureFile.bind(fs, file),
      fs.writeFile.bind(fs, file, source)
    ]

    waterfall(queue, (error) => error ? reject(error) : resolve())
  })
}
