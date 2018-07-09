import fs from 'fs-extra'
import path from 'path'
import findIndex from 'lodash/findIndex'
import isEmpty from 'lodash/isEmpty'
import waterfall from 'async/waterfall'
import stripComments from 'strip-comments'
import OptionManager from './option-manager'
import { resolve as relativeResolve } from './share/requireRelative'

export const resolveDestination = function (file, options) {
  let { rootDir, srcDir, outDir } = options

  /**
   * windows 下 path 存在多个反斜杠
   * 因此需要 escape 才能进行 search
   * 这里可以直接使用 indexOf 进行查询
   */
  return file.indexOf(srcDir) !== -1
    ? file.replace(srcDir, outDir)
    : file.replace(rootDir, outDir)
}

export const resolveDependencies = function (code, file, relativeTo, options) {
  if (code) {
    code = stripComments(code, { sourceType: 'module' })
  }

  let dependencies = []

  while (true) {
    let match = /require\(['"]([\w\d_\-./]+)['"]\)/.exec(code)
    if (!match) {
      break
    }

    let [all, required] = match
    code = code.replace(all, '')

    let dependency = relativeResolve(required, relativeTo)
    if (findIndex(dependencies, { file, dependency, required }) === -1) {
      let destination = resolveDestination(dependency, options)
      dependencies.push({ file, dependency, destination, required })
    }
  }

  return dependencies
}

export const filterDependencies = function (dependencies) {
  return dependencies.filter(({ dependency, destination }) => {
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
}

export const compile = function (file, rule = {}) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (error, source) => {
      if (error) {
        reject(error)
        return
      }

      let loaders = []
      if (!isEmpty(rule)) {
        loaders = rule.loaders || []
      }

      if (loaders.length === 0) {
        resolve(source.toString())
        return
      }

      let tasks = loaders.map((loader) => {
        return function (source, callback) {
          if (!loader.hasOwnProperty('use')) {
            callback(new Error('Params use is not provided from loader'))
            return
          }

          if (typeof loader.use !== 'string') {
            callback(new Error('Params use is not a stirng'))
            return
          }

          let compile = require(loader.use)
          compile = compile.default || compile

          let options = OptionManager.connect({ file, rule })
          compile(source, options)
            .then((source) => callback(null, source))
            .catch((error) => callback(error))
        }
      })

      tasks.unshift((callback) => callback(null, source))
      waterfall(tasks, (error, source) => error ? reject(error) : resolve(source))
    })
  })
}

export const resolveJs = function (source, file, options) {
  let relativeTo = path.dirname(file)
  let dependencies = resolveDependencies(source, file, relativeTo, options)
  return { file, source, dependencies }
}

export const resolve = function (source, file, options) {
  return new Promise((resolve) => {
    source = source.toString()

    if (/\.js$/.test(file)) {
      let stats = resolveJs(source, file, options)
      resolve(stats)
      return
    }

    resolve({ file, source, dependencies: [] })
  })
}

export default {
  compile,
  resolve
}
