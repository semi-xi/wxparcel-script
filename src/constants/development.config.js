import Config, { Plugins, JSRule } from './common.config'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

JSRule.loaders.push({
  use: require.resolve('../loaders/envify-wxparcel-loader'),
  options: {
    env: {
      NODE_ENV: 'development'
    }
  }
})

Plugins.push(new DevServerPlugin())

export default Config
