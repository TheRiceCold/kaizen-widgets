import Soup from 'gi://Soup?version=3.0'
import initMessages from 'data/chatgptMessages'
import { fileExists, expandTilde } from 'lib/utils'

const { GLib } = imports.gi

function expandTilde(path) {
  if (path.startsWith('~'))
    return GLib.get_home_dir() + path.slice(1)
  else
    return path
}

// We're using many models to not be restricted to 3 messages per minute.
// The whole chat will be sent every request anyway.
Utils.exec(`mkdir -p ${GLib.get_user_cache_dir()}/ags/user/ai`)
const KEY_FILE_LOCATION = `${GLib.get_user_cache_dir()}/ags/user/ai/openai_key.txt`
const APIDOM_FILE_LOCATION = `${GLib.get_user_cache_dir()}/ags/user/openai_api_dom.txt`

function replaceapidom(URL) {
  if (fileExists(expandTilde(APIDOM_FILE_LOCATION))) {
    let contents = Utils.readFile(expandTilde(APIDOM_FILE_LOCATION)).trim()
    var URL = URL.toString().replace('api.openai.com', contents)
  }
  return URL
}

const CHAT_MODELS = ['gpt-3.5-turbo-1106', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613']
const ONE_CYCLE_COUNT = 3

class ChatGPTMessage extends Service {
  static {
    Service.register(this,
      { delta: ['string'] },
      {
        content: ['string'],
        thinking: ['boolean'],
        done: ['boolean'],
      })
  }

  _role = ''
  _content = ''
  _thinking = false
  _done = false

  constructor(role, content, thinking = false, done = false) {
    super()
    this._role = role
    this._content = content
    this._thinking = thinking
    this._done = done
  }

  get done() { return this._done }
  set done(isDone) { this._done = isDone; this.notify('done') }

  get role() { return this._role }
  set role(role) { this._role = role; this.emit('changed') }

  get content() { return this._content }
  set content(content) {
    this._content = content
    this.notify('content')
    this.emit('changed')
  }

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
    else
      this.content += delta
    this.emit('delta', delta)
  }
}

class ChatGPTService extends Service {
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

  url = GLib.Uri.parse(replaceapidom('https://api.openai.com/v1/chat/completions'), GLib.UriFlags.NONE)

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
  set temperature(val) { this._temperature = val }

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
        if (!stream) return
        const [bytes] = stream.read_line_finish(res)
        const line = this._decoder.decode(bytes)
        if (line && line != '') {
          let data = line.substr(6)
          if (data == '[DONE]') return
          try {
            const result = JSON.parse(data)
            if (result.choices[0].finish_reason === 'stop') {
              aiResponse.done = true
              return
            }
            aiResponse.addDelta(result.choices[0].delta.content)
          }
          catch {
            aiResponse.addDelta(line + '\n')
          }
        }
        this.readResponse(stream, aiResponse)
      })
  }

  addMessage(role, message) {
    this._messages.push(new ChatGPTMessage(role, message))
    this.emit('newMsg', this._messages.length - 1)
  }

  send(msg) {
    this._messages.push(new ChatGPTMessage('user', msg))
    this.emit('newMsg', this._messages.length - 1)
    const aiResponse = new ChatGPTMessage('assistant', 'thinking...', true, false)
    this._messages.push(aiResponse)
    this.emit('newMsg', this._messages.length - 1)

    const body = {
      stream: true,
      temperature: this._temperature,
      model: CHAT_MODELS[this._modelIndex],
      messages: this._messages.map(msg => ({ role: msg.role, content: msg.content })),
    }

    const session = new Soup.Session()
    const message = new Soup.Message({ method: 'POST', uri: this.url })
    message.request_headers.append('Authorization', `Bearer ${this._key}`)
    message.set_request_body_from_bytes('application/json', new GLib.Bytes(JSON.stringify(body)))

    session.send_async(message, GLib.DEFAULT_PRIORITY, null, (_, result) => {
      const stream = session.send_finish(result)
      this.readResponse(new imports.gi.Gio.DataInputStream({
        close_base_stream: true,
        base_stream: stream
      }), aiResponse)
    })

    if (this._cycleModels) {
      this._requestCount++
      if (this._cycleModels)
        this._modelIndex = (this._requestCount - (this._requestCount % ONE_CYCLE_COUNT)) % CHAT_MODELS.length
    }
  }
}

export default new ChatGPTService()
