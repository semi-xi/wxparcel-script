import Config, { JSRule } from './common.config'

JSRule.loaders.push({
  use: require.resolve('../loaders/envify-wxparcel-loader'),
  options: {
    env: {
      NODE_ENV: 'prerelease'
    }
  }
})

JSRule.loaders.push({
  use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
  options: {}
})

export default Config
