import fs from 'fs-extra'
import * as path from 'path'
import GlobalOptionManager from '../../services/option-manager'

export default function (babelFile: string) {
  let babelrc = path.join(GlobalOptionManager.rootDir, './.babelrc')
  if (fs.existsSync(babelrc)) {
    let babelConfig = fs.readJSONSync(babelrc)
    require('@babel/register')(babelConfig || {})
  }

  return require(babelFile)
}
