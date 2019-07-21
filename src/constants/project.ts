import fs from 'fs-extra'
import * as path from 'path'

interface Project {
  name: string
  version: string
}

const project: Project = fs.readJSONSync(path.join(__dirname, '../../package.json'))

export default project
