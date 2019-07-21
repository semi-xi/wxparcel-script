import fs from 'fs-extra'
import * as path from 'path'
import { promisify } from 'util'
import commandExists from 'command-exists'
import { log } from './utils'
import { spawn } from './process'
import * as Typings from '../typings'

const cwdPath = process.cwd()

/**
 * 安装依赖
 */
export const installDependencies = async (modules: string[] | string, execPath: string = cwdPath, options: Typings.PMInstallOptions = {}): Promise<any> => {
  let { installPeers = true, saveDev = true, packageManager } = options
  if (typeof modules === 'string') {
    modules = [modules]
  }

  if (!packageManager) {
    packageManager = await determinePackageManager()
  }

  log(`Determine use ${packageManager.toUpperCase()} to install`)

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

  let linkedModules = await fetchNpmLinks(execPath)

  try {
    log(`${packageManager} ${args.join(' ')}`)
    await spawn(packageManager, args, { stdio: 'inherit' })

    let promises = linkedModules.map(({ file, real }) => fs.symlink(real, file))
    await Promise.all(promises)

  } catch (error) {
    throw new Error(`Failed to install ${modules.join(', ')}\n${error.message}`)
  }

  if (installPeers === true) {
    await Promise.all(modules.map((name) => installPeerDependencies(name, execPath, options)))
  }
}

/**
 * 安装 peer 依赖
 */
export const installPeerDependencies = async (name: string, execPath: string, options: Typings.PMInstallOptions = {}) => {
  const modulePath = path.resolve(path.join('node_modules', name))
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
export const determinePackageManager = async (rootPath: string = cwdPath): Promise<string> => {
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

export const fetchNpmLinks = async (rootPath: string = cwdPath): Promise<Array<{ file: string, real: string }>> => {
  let links = []

  let nodeModules = path.join(rootPath, './node_modules')
  if (!fs.existsSync(nodeModules)) {
    return []
  }

  let files = await fs.readdir(nodeModules)
  files.forEach((filename) => {
    let file = path.join(nodeModules, filename)
    let real = fs.realpathSync(file)
    real !== file && links.push({ file, real })
  })

  return links
}
