const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const ENCODING = 'utf8'

class Sets {
  constructor (key, value, envFile = '.env') {
    this.key = key
    this.value = value
    this.envFile = envFile

    this.processedEnvFiles = []
    this.settableFilepaths = new Set()
  }

  run () {
    const envFilepaths = this._envFilepaths()
    for (const envFilepath of envFilepaths) {
      const row = {}
      row.key = this.key
      row.value = this.value
      row.filepath = envFilepath

      const filepath = path.resolve(envFilepath)
      try {
        const src = fs.readFileSync(filepath, { encoding: ENCODING })
        const parsed = dotenv.parse(src)

        let newSrc
        if (Object.prototype.hasOwnProperty.call(parsed, this.key)) {
          newSrc = this._srcReplaced(src)
        } else {
          newSrc = this._srcAppended(src)
        }

        fs.writeFileSync(filepath, newSrc)

        this.settableFilepaths.add(envFilepath)
      } catch (e) {
        if (e.code === 'ENOENT') {
          const error = new Error(`missing ${envFilepath} file (${filepath})`)
          error.code = 'MISSING_ENV_FILE'

          row.error = error
        } else {
          row.error = e
        }
      }

      this.processedEnvFiles.push(row)
    }

    return {
      processedEnvFiles: this.processedEnvFiles,
      settableFilepaths: [...this.settableFilepaths]
    }
  }

  _envFilepaths () {
    if (!Array.isArray(this.envFile)) {
      return [this.envFile]
    }

    return this.envFile
  }

  _srcReplaced (src) {
    // Regular expression to find the key and replace its value
    const regex = new RegExp(`^${this.key}=.*$`, 'm')

    return src.replace(regex, `${this.key}="${this.value}"`)
  }

  _srcAppended (src) {
    let formatted = `${this.key}="${this.value}"`
    if (src.endsWith('\n')) {
      formatted = formatted + '\n'
    } else {
      formatted = '\n' + formatted
    }

    return src + formatted
  }
}

module.exports = Sets
