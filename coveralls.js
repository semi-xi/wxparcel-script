import map from 'lodash/map'
import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import Coveralls from 'coveralls/lib/handleInput'

let folder = path.join(__dirname, './coverage/')
let files = fs.readdirSync(folder)
let contents = map(files, (filename) => {
  let file = path.join(folder, filename, './lcov.info')
  return fs.existsSync(file) ? fs.readFileSync(file) : ''
})

Coveralls(contents.join('\n'), (error) => {
  if (error) {
    throw error
  }

  console.log(colors.green('✨ Coveralls has been successfully completed.'))
})
