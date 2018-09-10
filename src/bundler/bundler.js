import { Assets } from '../assets'
import OptionManager from '../option-manager'

export default class Bundler {
  constructor (chunks, options = OptionManager) {
    this.options = options
    this.assets = new Assets(options)
    this.chunks = Array.isArray(chunks) ? chunks : []
    this.bundler = []
  }

  bundle () {
    return this.chunks
  }
}
