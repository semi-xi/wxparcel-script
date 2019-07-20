// Loaders
import BabelLoader from './loaders/babel-wxparcel-loader'
import EnvifyLoader from './loaders/envify-wxparcel-loader'
import SassLoader from './loaders/sass-wxparcel-loader'
import UglifyJSLoader from './loaders/uglifyjs-wxparcel-loader'

// Plugins
import CleanPlugin from './plugins/clean-wxparcel-plugin'
import DevServerPlugin from './plugins/dev-server-wxparcel-plugin'
import SpritesmithPlugin from './plugins/spritesmith-wxparcel-plugin'

// Resolver
import JSResolver from './resolver/js-resolver'
import JSONResolver from './resolver/json-resolver'
import WXMLResolver from './resolver/wxml-resolver'
import WXSResolver from './resolver/wxs-resolver'
import WXSSResolver from './resolver/wxss-resolver'

// Bundler
import JSBundler from './libs/bundler/JSBundler'

// Main
import Assets from './libs/assets'
import Chunk from './libs/chunk'
import OptionManager from './libs/OptionManager'
import Parser from './libs/Parser'
import Resolver from './resolver'
import Bundler from './libs/bundler'
import Parcel from './libs/Parcel'

// Constants
import * as chunkTypes from './constants/chunk-type'

// Runtime
import * as Runtime from './runtime'

// export all classes
export {
  /**
   * loaders
   */
  BabelLoader,
  EnvifyLoader,
  SassLoader,
  UglifyJSLoader,

  /**
   * plugins
   */
  CleanPlugin,
  DevServerPlugin,
  SpritesmithPlugin,

  /**
   * resolvers
   */
  JSResolver,
  JSONResolver,
  WXMLResolver,
  WXSResolver,
  WXSSResolver,

  /**
   * bundlers
   */
  JSBundler,

  /**
   * base classes
   */
  Assets,
  Chunk,
  OptionManager,
  Parser,
  Resolver,
  Bundler,
  Parcel,

  /**
   * constatns
   */
  chunkTypes,

  /**
   * global services
   */
  Runtime
}
