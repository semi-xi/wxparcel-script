import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import chokidar from 'chokidar'
import flatten from 'lodash/flatten'
import forEach from 'lodash/forEach'
import OptionManager from './option-manager'
import Assets from './assets'
import Parser from './parser'
import Printer from './printer'

const JSON_REGEXP = /\.json$/
const JS_REGEXP = /\.js$/
const WXML_REGEXP = /\.wxml$/
const WXSS_REGEXP = /\.wxss$/

export default class Parcel {
  constructor () {
    this.running = false
    this.parsing = false
    this.isReady = false

    let appConfFile = path.join(OptionManager.outDir, './app.json')
    let projectConfFile = path.join(OptionManager.outDir, './project.config.json')

    let mkConfigFile = (file, config) => {
      fs.ensureFileSync(file)
      fs.writeFileSync(file, JSON.stringify(config, null, 2))
    }

    mkConfigFile(appConfFile, OptionManager.appConfig)
    mkConfigFile(projectConfFile, OptionManager.projectConfig)

    OptionManager.watchAppConfigChanged(({ config }) => {
      mkConfigFile(appConfFile, config)
      Printer.trace(colors.cyan(`${colors.bold(appConfFile)} is updated`))
    })

    OptionManager.watchProjectConfigChanged(({ config }) => {
      mkConfigFile(projectConfFile, config)
      Printer.info(colors.cyan(`${colors.bold(projectConfFile)} is updated`))
    })
  }

  run () {
    if (this.running === true) {
      Printer.warn(`WXParcel is running, you can enter ${colors.bold('Ctrl + C')} to exit.`)
      return
    }

    this.running = true

    let entries = this.findAllEntries()
    let components = entries.map(({ files }) => {
      let file = files.find((file) => JSON_REGEXP.test(file))
      return this.findAllComponents(file)
    })

    components = flatten(components)

    let modules = [].concat(entries, components)
    let files = modules.map((entry) => entry.files)

    let transform = (files) => {
      return this.transform(files).then((chunks) => {
        if (!Array.isArray(chunks) || chunks.length === 0) {
          return Promise.resolve()
        }

        let promises = []
        chunks.forEach(({ file, source, ...options }) => {
          /**
           * 重复编译的文件将忽略
           */
          if (Assets.exists(file)) {
            return
          }

          Assets.add(file, options)

          /**
           * 这里依赖必须跟随每一个文件,
           * 因此这里必须独立每一个运行不能统一执行
           */
          let { dependencies } = options
          if (Array.isArray(dependencies) && dependencies.length > 0) {
            dependencies = dependencies.filter(({ dependency, destination }) => {
              let extname = path.extname(destination)
              /**
               * 过滤没有后缀的文件
               */
              if (extname !== '' && !/\.js/.test(extname)) {
                return false
              }

              /**
               * 过滤系统依赖
               */
              if (dependency === path.basename(dependency)) {
                return false
              }

              return true
            })

            let files = dependencies.map(({ dependency }) => dependency)
            let promise = transform(files)
            promises.push(promise)

            /**
             * 这里需要更改原依赖文件的路径
             * require('./a.js') => require('dist/path/a.js')
             * require('lodash/get') => require('dist/path/lodash/get')
             */
            promise.then(() => {
              let chunk = Assets.getChunk(file)
              if (!chunk) {
                return
              }

              let directory = path.dirname(chunk.destination)
              let changeRoutes = (source) => {
                let code = source.toString()

                dependencies.forEach(({ destination, required }) => {
                  let relativePath = path.relative(directory, destination)
                  if (relativePath.charAt(0) !== '.') {
                    relativePath = `./${relativePath}`
                  }

                  relativePath = relativePath.replace('node_modules', OptionManager.npmDir)

                  let origin = new RegExp(`require\\(['"]${required}['"]\\)`, 'gm')
                  let target = `require('${relativePath.replace(/\.\w+$/, '').replace(/\\/g, '/')}')`
                  code = code.replace(origin, target)
                })

                return Buffer.from(code)
              }

              chunk.pipe(Parser.transform(changeRoutes))
            })
          }
        })

        if (promises.length > 0) {
          return Promise.all(promises)
        }

        return Promise.resolve()
      })
    }

    transform(flatten(files)).then(() => this.flush())
  }

  watch () {
    let handleFileChange = (path) => {
      if (this.isReady === false || this.parsing === false) {
        // @todo 堆栈
        return
      }
    }

    let handleFileUnlink = (path) => {
      if (this.isReady === false || this.parsing === false) {
        // @todo 堆栈
        return
      }
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

  flush () {
    let { assets } = Assets
    let promises = assets.map(({ chunk }) => new Promise((resolve, reject) => {
      let { destination, stream } = chunk
      fs.ensureFileSync(destination)

      let writableStream = fs.createWriteStream(destination)

      let size = 0
      stream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      stream.on('error', (error) => {
        reject(error)
        stream.end()
      })

      writableStream.on('finish', () => {
        let stats = {
          assets: destination,
          size: size
        }

        resolve(stats)
      })

      writableStream.on('error', (error) => {
        reject(error)
        writableStream.end()
      })

      stream.pipe(writableStream)
    }))

    return Promise.all(promises)
  }

  transform (files) {
    let { rules } = OptionManager
    let promises = files.map((file) => {
      let rulesToFile = rules.filter(({ test: pattern }) => pattern.test(file))
      let rule = rulesToFile[0]
      return Parser.parse(file, rule)
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
      if (-1 !== index) {
        return true
      }

      if (Array.isArray(OptionManager.rules)) {
        let index = OptionManager.rules.findIndex((rule) => rule.test.test(file))
        if (-1 !== index) {
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

    for (let i = paths.length; i --;) {
      let dir = paths[i]
      let target = path.join(dir, file)

      if (fs.existsSync(target)) {
        return target
      }
    }

    return false
  }
}
