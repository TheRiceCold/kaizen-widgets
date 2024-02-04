import AgsWindow from 'resource:///com/github/Aylur/ags/widgets/window.js'
import { options } from '../constants/main.js'

const { GObject } = imports.gi

const keyGrabber = Widget.Window({
  popup: true,
  layer: 'top',
  visible: false,
  name: 'key-grabber',
  keymode: 'on-demand',
  exclusivity: 'ignore',
  attribute: { list: [] },
  css: 'background: transparent;',
  anchor: ['top', 'left', 'right', 'bottom'],
  setup: self => self.on('notify::visible', ({ visible }) => {
    if (!visible)
      self.attribute?.list.forEach(name => App.closeWindow(name))
  }),
  child: Widget.EventBox({ vexpand: true }).on('button-press-event', () => {
    App.closeWindow('key-grabber')
    keyGrabber.attribute?.list.forEach(name => App.closeWindow(name))
  }),
})

// add before any PopupWindow is instantiated
App.addWindow(keyGrabber)

export class PopupWindow extends AgsWindow {
  static { GObject.registerClass(this) }

  constructor({ name, child, transition = 'none', visible = false, ...props }) {
    super({
      ...props,
      name,
      popup: true,
      keymode: 'exclusive',
      layer: 'overlay',
      class_names: ['popup-window', name],
    })

    child.toggleClassName('window-content')
    this.revealer = Widget.Revealer({
      transition,
      child,
      transition_duration: options.transition.value,
      setup: self => self.hook(App, (_, wname, visible) => {
        if (wname === name) this.revealer.reveal_child = visible
      }),
    })

    this.child = Widget.Box({
      css: 'padding: 1px;',
      child: this.revealer,
    })

    this.show_all()
    this.visible = visible

    keyGrabber.bind('visible', this, 'visible')
    keyGrabber.attribute?.list.push(name)
  }

  set transition(dir) { this.revealer.transition = dir }
  get transition() { return this.revealer.transition }
}

export default config => new PopupWindow(config)
