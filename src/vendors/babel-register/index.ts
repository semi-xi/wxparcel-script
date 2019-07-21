import fs from 'fs-extra'
import * as path from 'path'
import GlobalOptionManager from '../../services/option-manager'
import { localRequire } from '../../share/module'

export default async function babelRequire (babelFile: string) {
  let babelrc = path.join(GlobalOptionManager.rootDir, './.babelrc')
  if (fs.existsSync(babelrc)) {
    let babelConfig = fs.readJSONSync(babelrc)
    let register = await localRequire('@babel/register', GlobalOptionManager.rootDir, true)
    register(babelConfig || {})
  }

  const module = require(babelFile)
  return module.default || module
}
