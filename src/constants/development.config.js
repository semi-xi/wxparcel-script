import Config, { Plugins } from './common.config'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

Plugins.push(new DevServerPlugin())

export default Config
