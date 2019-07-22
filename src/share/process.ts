import { EventEmitter } from 'events'
import { spawn as cpSpawn, SpawnOptions } from 'child_process'
import Queue from '../libs/Queue'
import * as Typings from '../typings'

const EXIT_TOKEN = 'processExit'
let ee = new EventEmitter()

let handleProcessSigint = process.exit.bind(process)
let handleProcessExit = () => {
  ee.emit(EXIT_TOKEN)
  ee.removeAllListeners()

  process.removeListener('exit', handleProcessExit)
  process.removeListener('SIGINT', handleProcessSigint)

  handleProcessExit = undefined
  handleProcessSigint = undefined
  ee = undefined
}

process.on('exit', handleProcessExit)
process.on('SIGINT', handleProcessSigint)

/**
 * 程序退出事件
 */
export const onexit = (handle: (...args: any[]) => void) => {
  ee.on(EXIT_TOKEN, handle)
}

const processes = []

/**
 * spawn promisify
 * @param cli 命令
 * @param params 参数
 * @param options SpawnOptions
 * @param stdout 输出配置
 * @param killToken 关闭 token
 */
export const spawn = (cli: string, params?: Array<string>, options?: SpawnOptions, stdout?: Typings.ProcessStdout, killToken?: Symbol): Promise<any> => {
  return new Promise((resolve, reject) => {
    let cp = cpSpawn(cli, params || [], options || {})

    if (typeof stdout === 'function') {
      cp.stdout.on('data', (data) => stdout(data, 'out'))
      cp.stderr.on('data', (data) => stdout(data, 'err'))
    }

    cp.on('exit', (code) => resolve(code))
    cp.on('SIGINT', () => reject(new Error('Process has been killed')))

    let kill = () => {
      cp && cp.kill('SIGINT')
      cp = undefined
    }

    onexit(kill)

    killToken && processes.push({ token: killToken, kill })
  })
}

/**
 * kill spawn process
 * @param killToken 关闭 token
 */
export const kill = (killToken?: Symbol): void => {
  const index = processes.findIndex((item) => item.killToken === killToken)
  if (-1 === index) {
    let process = processes.splice(index, 1).pop()
    process.kill()
  }
}

const spawnQueue = new Queue()

/**
 * 队列化 spawn
 * @param cli 命令
 * @param params 参数
 * @param options SpawnOptions
 * @param stdout 输出配置
 * @param killToken 关闭 token
 */
export const pipeSpawn: typeof spawn = spawnQueue.pipefy(spawn)
