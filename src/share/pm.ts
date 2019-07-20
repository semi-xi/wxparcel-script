import fs from 'fs-extra'
import * as path from 'path'
import { promisify } from 'util'
import Module from 'module'
import commandExists from 'command-exists'
import GlobalOptionManager from '../services/option-manager'
import { spawn } from './process'
import { resolve } from './module'
import * as Typings from '../typings'

/**
 * 安装依赖
 */
export const installDependencies = async (modules: string[] | string, execPath: string, options: Typings.PMInstallOptions = {}): Promise<any> => {
  let { installPeers = true, saveDev = true, packageManager } = options
  if (typeof modules === 'string') {
    modules = [modules]
  }

  if (!packageManager) {
    packageManager = await determinePackageManager()
  }

  let isYarn = packageManager === 'yarn'

  let installCommand = isYarn ? 'add' : 'install'
  let args = [installCommand, ...modules]
  if (saveDev === true) {
    isYarn ? args.push('--dev') : args.push('--save')
  }

  let packageFile = path.join(execPath, 'package.json')
  if (packageManager === 'npm' && !fs.existsSync(packageFile)) {
    await fs.writeFile(packageFile, '{}')
  }

  try {
    await spawn(packageManager, args, { stdio: 'inherit' })
  } catch (err) {
    throw new Error(`Failed to install ${modules.join(', ')}.`)
  }

  if (installPeers === true) {
    await Promise.all(modules.map((name) => installPeerDependencies(name, execPath, options)))
  }
}

/**
 * 安装 peer 依赖
 */
export const installPeerDependencies = async (name: string, execPath: string, options: Typings.PMInstallOptions = {}) => {
  const modulePath = path.dirname(resolve(name, execPath))
  const packageFile = path.join(modulePath, 'package.json')
  const pkg = await fs.readJsonSync(packageFile)
  const peers = pkg.peerDependencies || {}

  const modules = []
  for (let peer in peers) {
    modules.push(`${peer}@${peers[peer]}`)
  }

  if (modules.length > 0) {
    let settings: Typings.PMInstallOptions = Object.assign({}, options, { installPeers: false })
    await installDependencies(modules, execPath, settings)
  }
}

/**
 * 判断是否支持 Yarn
 * @param rootPath 根目录
 */
export const determinePackageManager = async (rootPath: string = GlobalOptionManager.rootDir): Promise<string> => {
  const lockFile = path.join(rootPath, 'yarn.lock')
  if (fs.existsSync(lockFile)) {
    return 'yarn'
  }

  const hasYarn = await detectYarnCommand()
  return hasYarn ? 'yarn' : 'npm'
}

/**
 * 判断是否支持 Yarn 命令
 */
export const detectYarnCommand = async (): Promise<boolean> => {
  const support = await promisify(commandExists.bind(null))('yarn')
  return support ? true : false
}
