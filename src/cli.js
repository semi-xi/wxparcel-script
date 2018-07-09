import program from 'commander'
import { version } from '../package.json'
import './commander/parcel'

program
  .version(version, '-v, --version')
  .option('--quiet', '不打印任何信息')

  .on('--help', () => {
    console.log('')
    console.log('  Examples:')
    console.log('')
    console.log('    $ wxparcel-script development --help')
    console.log('    $ wxparcel-script production --help')
    console.log('')
  })

let params = process.argv
if (!params.slice(2).length) {
  program.outputHelp()
}

program.parse(params)
