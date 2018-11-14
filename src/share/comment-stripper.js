const SLASH = '/'
const BACK_SLASH = '\\'
const STAR = '*'
const DOUBLE_QUOTE = '"'
const SINGLE_QUOTE = '\''
const NEW_LINE = '\n'
const CARRIAGE_RETURN = '\r'

export default class CommentStripper {
  constructor () {
    this.string = ''
    this.length = 0
    this.position = 0
    this.output = null
  }

  getCurrentCharacter () {
    return this.string.charAt(this.position)
  }

  getPreviousCharacter () {
    return this.string.charAt(this.position - 1)
  }

  getNextCharacter () {
    return this.string.charAt(this.position + 1)
  }

  add () {
    this.output.push(this.getCurrentCharacter())
  }

  next () {
    this.position++
  }

  atEnd () {
    return this.position >= this.length
  }

  isEscaping () {
    if (this.getPreviousCharacter() === BACK_SLASH) {
      let offset = 1
      let escaped = true

      while ((this.position - offset) > 0) {
        escaped = !escaped

        let current = this.position - offset
        if (this.string.charAt(current) !== BACK_SLASH) {
          return escaped
        }

        offset++
      }

      return escaped
    }

    return false
  }

  processSingleQuotedString () {
    if (this.getCurrentCharacter() === SINGLE_QUOTE) {
      this.add()
      this.next()

      while (!this.atEnd()) {
        if (this.getCurrentCharacter() === SINGLE_QUOTE && !this.isEscaping()) {
          return
        }

        this.add()
        this.next()
      }
    }
  }

  processDoubleQuotedString () {
    if (this.getCurrentCharacter() === DOUBLE_QUOTE) {
      this.add()
      this.next()

      while (!this.atEnd()) {
        if (this.getCurrentCharacter() === DOUBLE_QUOTE && !this.isEscaping()) {
          return
        }

        this.add()
        this.next()
      }
    }
  }

  processSingleLineComment () {
    if (this.getCurrentCharacter() === SLASH) {
      if (this.getNextCharacter() === SLASH) {
        this.next()

        while (!this.atEnd()) {
          this.next()

          if (this.getCurrentCharacter() === NEW_LINE || this.getCurrentCharacter() === CARRIAGE_RETURN) {
            return
          }
        }
      }
    }
  }

  processMultiLineComment () {
    if (this.getCurrentCharacter() === SLASH) {
      if (this.getNextCharacter() === STAR) {
        this.next()

        while (!this.atEnd()) {
          this.next()

          if (this.getCurrentCharacter() === STAR) {
            if (this.getNextCharacter() === SLASH) {
              this.next()
              this.next()
              return
            }
          }
        }
      }
    }
  }

  processRegex () {
    if (this.getCurrentCharacter() === SLASH) {
      if (this.getNextCharacter() !== STAR && this.getNextCharacter() !== SLASH) {
        while (!this.atEnd()) {
          this.add()
          this.next()

          if (this.getCurrentCharacter() === SLASH && !this.isEscaping()) {
            return
          }
        }
      }
    }
  }

  process () {
    while (!this.atEnd()) {
      this.processRegex()
      this.processDoubleQuotedString()
      this.processSingleQuotedString()
      this.processSingleLineComment()
      this.processMultiLineComment()

      if (!this.atEnd()) {
        this.add()
        this.next()
      }
    }
  }

  reset () {
    this.string = ''
    this.length = 0
    this.position = 0
    this.output = []
  }

  strip (string) {
    this.reset()
    this.string = string
    this.length = this.string.length
    this.process()

    return this.output.join('')
  }
}
