import { EventEmitter } from 'events'
import { spawn as cpSpawn, SpawnOptions } from 'child_process'
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

export const onexit = (handle: (...args: any[]) => void) => {
  ee.on(EXIT_TOKEN, handle)
}

const processes = []

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

export const kill = (killToken?: Symbol): void => {
  const index = processes.findIndex((item) => item.killToken === killToken)
  if (-1 === index) {
    let process = processes.splice(index, 1).pop()
    process.kill()
  }
}
