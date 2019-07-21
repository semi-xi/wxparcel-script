import program from 'commander'
import GlobalLogger from './services/logger'
import Project from './constants/project'
import './commander/parcel'

const helpAction = (): void => {
  GlobalLogger.trace('\nExamples:')
  GlobalLogger.trace('  $ wxparcel-script start --env development --watch')
  GlobalLogger.trace('  $ wxparcel-script start --env production --config wx.config.js')
}

program
  .version(Project.version, '-v, --version')
  .option('-q, --quiet', 'do not print any information')
  .on('--help', helpAction)

let params = process.argv
!params.slice(2).length && program.outputHelp()
program.parse(params)
