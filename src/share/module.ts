import * as path from 'path'
import Module from 'module'
import { installDependencies } from './pm'

const cwdPath = process.cwd()
const modules = {}

/**
 * 加载本地依赖
 * @param moduleName 模块名称
 * @param findedPath 起始的查找路径
 * @param triedInstall 尝试安装
 */
export const localRequire = async (moduleName: string, findPath: string = cwdPath, triedInstall: boolean = false): Promise<any> => {
  let resolved = await localResolve(moduleName, findPath, triedInstall)
  return require(resolved)
}

/**
 * 解析本地依赖
 * @param moduleName 模块名称
 * @param findedPath 起始的查找路径
 * @param triedInstall 尝试安装
 */
export const localResolve = async (moduleName: string, findPath: string = cwdPath, triedInstall: boolean = false): Promise<string> => {
  try {
    return require.resolve(moduleName)

  } catch (error) {
    try {
      return resolve(moduleName, findPath)

    } catch (error) {
      if (triedInstall === true) {
        await installDependencies(moduleName, findPath)
        return localResolve(moduleName, findPath)
      }

      throw new Error(`Cannot found module ${moduleName}`)
    }
  }
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
  let root = modules[rootName]

  if (!root) {
    root = new Module(rootName)
    root.filename = rootName
    root.paths = (Module as any)._nodeModulePaths(rootPath)
    modules[rootName] = root
  }

  return root
}
