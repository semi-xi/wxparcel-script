import program from 'commander'
import { version } from '../package.json'
import './commander/parcel'

program
  .version(version, '-v, --version')
  .option('-q, --quiet', 'do not print any information')
  .on('--help', () => {
    console.log('')
    console.log('  Examples:')
    console.log('')
    console.log('    $ wxparcel-script start --help')
    console.log('')
  })

let params = process.argv
if (!params.slice(2).length) {
  program.outputHelp()
}

program.parse(params)
