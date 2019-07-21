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
import Assets from './libs/Assets'
import Chunk from './libs/Chunk'
import OptionManager from './libs/OptionManager'
import Parser from './libs/Parser'
import Resolver from './resolver'
import Bundler from './libs/bundler'
import Parcel from './libs/Parcel'

// Constants
import * as chunkTypes from './constants/chunk-type'

// Runtime
import * as Runtime from './runtime'

// Utils
import * as utils from './share/utils'
import * as module from './share/module'
import * as pm from './share/pm'
import * as process from './share/process'
import * as sourceMap from './share/source-map'

// Typings
import * as Typings from './typings'

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
  Runtime,

  /**
   * share utils
   */
  utils,
  module,
  pm,
  process,
  sourceMap,

  /**
   * typings
   */
  Typings
}
