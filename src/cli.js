import program from 'commander'
import Logger from './logger'
import { version } from '../package.json'
import './commander/parcel'

const helpAction = () => {
  Logger.trace('\nExamples:')
  Logger.trace('  $ wxparcel-script start --env development --watch')
  Logger.trace('  $ wxparcel-script start --env production --config wx.config.js')
}

program
  .version(version, '-v, --version')
  .option('-q, --quiet', 'do not print any information')
  .on('--help', helpAction)

let params = process.argv
!params.slice(2).length && program.outputHelp()
program.parse(params)
