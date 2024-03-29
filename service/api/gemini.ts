import Soup from 'gi://Soup?version=3.0'
import { initMessages } from 'data/gemini'
import { fileExists, expandTilde } from 'lib/utils'

const { GLib } = imports.gi

Utils.exec(`mkdir -p ${GLib.get_user_cache_dir()}/ags/user/ai`)

const KEY_FILE_LOCATION = `${GLib.get_user_cache_dir()}/ags/user/ai/google_key.txt`
const APIDOM_FILE_LOCATION = `${GLib.get_user_cache_dir()}/ags/user/ai/google_api_dom.txt`

function replaceapidom(URL) {
  if (fileExists(expandTilde(APIDOM_FILE_LOCATION))) {
    var contents = Utils.readFile(expandTilde(APIDOM_FILE_LOCATION)).trim()
    var URL = URL.toString().replace('generativelanguage.googleapis.com', contents)
  }
  return URL
}

const CHAT_MODELS = ['gemini-pro']
const ONE_CYCLE_COUNT = 3

class GeminiMessage extends Service {
  static {
    Service.register(this,
      { delta: ['string'] },
      {
        content: ['string'],
        thinking: ['boolean'],
        done: ['boolean'],
      }
    )
  }

  _role = ''
  _parts = [{ text: '' }]
  _thinking = false
  _done = false
  _rawData = ''

  constructor(role, content, thinking = false, done = false) {
    super()
    this._role = role
    this._parts = [{ text: content }]
    this._thinking = thinking
    this._done = done
  }

  get rawData() { return this._rawData }
  set rawData(value) { this._rawData = value }

  get done() { return this._done }
  set done(isDone) { this._done = isDone; this.notify('done') }

  get role() { return this._role }
  set role(role) { this._role = role; this.emit('changed') }

  get content() {
    return this._parts.map(part => part.text).join()
  }
  set content(content) {
    this._parts = [{ text: content }]
    this.notify('content')
    this.emit('changed')
  }

  get parts() { return this._parts }

  get label() { return this._parserState.parsed + this._parserState.stack.join('') }

  get thinking() { return this._thinking }
  set thinking(thinking) {
    this._thinking = thinking
    this.notify('thinking')
    this.emit('changed')
  }

  addDelta(delta) {
    if (this.thinking) {
      this.thinking = false
      this.content = delta
    }
    else this.content += delta
    this.emit('delta', delta)
  }

  parseSection() {
    if(this._thinking) {
      this._thinking = false
      this._parts[0].text= ''
    }
    const parsedData = JSON.parse(this._rawData)
    const delta = parsedData.candidates[0].content.parts[0].text
    this._parts[0].text += delta
    this.notify('content')
    this._rawData = ''
  }
}

class GeminiService extends Service {
  static {
    Service.register(this, {
      initialized: [],
      clear: [],
      newMsg: ['int'],
      hasKey: ['boolean'],
    })
  }

  _assistantPrompt = true
  _messages = []
  _cycleModels = true
  _requestCount = 0
  _temperature = 0.9
  _modelIndex = 0
  _key = ''
  _decoder = new TextDecoder()

  constructor() {
    super()

    if (fileExists(expandTilde(KEY_FILE_LOCATION)))
      this._key = Utils.readFile(expandTilde(KEY_FILE_LOCATION)).trim()
    else
      this.emit('hasKey', false)

    this._messages = this._assistantPrompt ? [...initMessages] : []
    this.emit('initialized')
  }

  get modelName() { return CHAT_MODELS[this._modelIndex] }

  get keyPath() { return KEY_FILE_LOCATION }
  get key() { return this._key }
  set key(keyValue) {
    this._key = keyValue
    Utils.writeFile(this._key, expandTilde(KEY_FILE_LOCATION))
      .then(this.emit('hasKey', true))
      .catch(err => print(err))
  }

  get cycleModels() { return this._cycleModels }
  set cycleModels(value) {
    this._cycleModels = value
    if (!value)
      this._modelIndex = 0
    else
      this._modelIndex = (this._requestCount - (this._requestCount % ONE_CYCLE_COUNT)) % CHAT_MODELS.length
  }

  get temperature() { return this._temperature }
  set temperature(value) { this._temperature = value }

  get messages() { return this._messages }
  get lastMessage() { return this._messages[this._messages.length - 1] }

  clear() {
    this._messages = this._assistantPrompt ? [...initMessages] : []
    this.emit('clear')
  }

  get assistantPrompt() { return this._assistantPrompt }
  set assistantPrompt(value) {
    this._assistantPrompt = value
    this._messages = value ? [...initMessages] : []
  }

  readResponse(stream, aiResponse) {
    stream.read_line_async(0, null,
      (stream, res) => {
        try {
          const [bytes] = stream.read_line_finish(res);
          const line = this._decoder.decode(bytes);
          if (line == '[{') { // beginning of response
            aiResponse._rawData += '{'
            this.thinking = false
          }
          else if (line == ',\u000d' || line == ']') // end of stream pulse
            aiResponse.parseSection()
          else // Normal content
            aiResponse._rawData += line

          this.readResponse(stream, aiResponse)
        } catch {
          aiResponse.done = true
          return
        }
      })
  }

  addMessage(role, message) {
    this._messages.push(new GeminiMessage(role, message))
    this.emit('newMsg', this._messages.length - 1)
  }

  send(msg) {
    this._messages.push(new GeminiMessage('user', msg))
    this.emit('newMsg', this._messages.length - 1)
    const aiResponse = new GeminiMessage('model', 'thinking...', true, false)

    const body = {
      contents: this._messages.map(msg => ({ role: msg.role, parts: msg.parts })),
      generationConfig: { temperature: this._temperature }
    }

    const session = new Soup.Session()
    const message = new Soup.Message({
      method: 'POST',
      uri: GLib.Uri.parse(
        replaceapidom(`https://generativelanguage.googleapis.com/v1/models/${this.modelName}:streamGenerateContent?key=${this._key}`),
        GLib.UriFlags.NONE
      ),
    })

    message.request_headers.append('Content-Type', `application/json`)
    message.set_request_body_from_bytes('application/json', new GLib.Bytes(JSON.stringify(body)))

    session.send_async(message, GLib.DEFAULT_PRIORITY, null, (_, result) => {
      const stream = session.send_finish(result)
      this.readResponse(new imports.gi.Gio.DataInputStream({
        close_base_stream: true,
        base_stream: stream
      }), aiResponse)
    })

    this._messages.push(aiResponse)
    this.emit('newMsg', this._messages.length - 1)

    if (this._cycleModels) {
      this._requestCount++
      if (this._cycleModels)
        this._modelIndex = (this._requestCount - (this._requestCount % ONE_CYCLE_COUNT)) % CHAT_MODELS.length
    }
  }
}

export default new GeminiService()
