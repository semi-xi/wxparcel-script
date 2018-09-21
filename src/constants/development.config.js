import Config from './common.config'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

Config.setRule('js', (rule) => {
  rule.loaders.push({
    use: require.resolve('../loaders/envify-wxparcel-loader'),
    options: {
      env: {
        NODE_ENV: 'development'
      }
    }
  })

  return rule
})

Config.addPlugin(new DevServerPlugin())

export default Config
