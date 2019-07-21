import * as path from 'path'
import Module from 'module'
import { installDependencies } from './pm'

const cwdPath = process.cwd()
const modulesPaths = {}
const modules = {}

/**
 * 获取真正的模块名称
 * @param moduleName 模块名
 */
export const resolveTruthModuleName = (moduleName: string): string => {
  let paths = moduleName.split('/')
  if (paths[0].charAt(0) === '@') {
    return paths.splice(0, 2).join('/')
  }

  return paths.splice(0, 1).join('/')
}

/**
 * 加载本地依赖
 * @param moduleName 模块名称
 * @param findedPath 起始的查找路径
 * @param triedInstall 尝试安装
 */
export const localRequire = async (moduleName: string | string[], findPath: string = cwdPath, triedInstall: boolean = false): Promise<any> => {
  if (Array.isArray(moduleName)) {
    let resolves = await localResolve(moduleName, findPath, triedInstall)
    return resolves.map((resolved, index) => {
      let name = moduleName[index]
      let module = modules[name]

      if (!module) {
        module = require(resolved)
        modules[resolved] = module
      }

      return module
    })
  }

  let module = modules[moduleName]
  if (!module) {
    let resolved = await localResolve(moduleName, findPath, triedInstall)
    module = require(resolved)
    modules[resolved] = module
  }

  return module
}

/**
 * 解析本地依赖
 * @param moduleName 模块名称
 * @param findedPath 起始的查找路径
 * @param triedInstall 尝试安装
 */
export const localResolve = async <T extends string | string[]>(moduleNames: T, findPath: string = cwdPath, triedInstall: boolean = false): Promise<T> => {
  let isSingle = !Array.isArray(moduleNames)
  let names = isSingle ? [moduleNames] : [].concat(moduleNames)

  let modules = []
  let invalids = []

  names.forEach((name) => {
    try {
      let path = require.resolve(name)
      modules.push(path)

    } catch (error) {
      try {
        let path = resolve(name, findPath)
        modules.push(path)

      } catch (error) {
        invalids.push(name)
      }
    }
  })

  if (invalids.length > 0) {
    if (triedInstall === true) {
      let dependencies = invalids.map((name) => resolveTruthModuleName(name))
      await installDependencies(dependencies, findPath)

      let installedModules = localResolve(dependencies, findPath)
      modules = modules.concat(installedModules)
      return isSingle ? modules[0] : modules
    }

    throw new Error(`Cannot found modules ${invalids.join(',')}`)
  }

  return isSingle ? modules[0] : modules
}

/**
 * 查找模块路径
 * @param moduleName 模块名称
 * @param findedPath 起始的查找路径
 */
export const resolve = (moduleName: string, findedPath: string = cwdPath): string => {
  let root = resolvePaths(findedPath)
  return (Module as any)._resolveFilename(moduleName, root)
}

/**
 * 模块转换
 * @description 根据 NodeJS 的查找方式往上查找依赖, 直到根目录为止
 * @param findedPath 起始的查找路径
 * @returns 匹配到的路径
 */
export const resolvePaths = (findedPath: string = cwdPath): any => {
  let rootPath = findedPath ? path.resolve(findedPath) : process.cwd()
  let rootName = path.join(rootPath, '@root')
  let root = modulesPaths[rootName]

  if (!root) {
    root = new Module(rootName)
    root.filename = rootName
    root.paths = (Module as any)._nodeModulePaths(rootPath)
    modulesPaths[rootName] = root
  }

  return root
}
