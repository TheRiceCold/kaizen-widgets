import Media from './media'
import Indicators from './indicators'
import Notifications from './notifications'

import options from 'options'

const Top = Widget.Window({
  anchor: ['top'],
  name: `top-popups`,
  className: 'popups',
  exclusivity: 'ignore',
  child: Widget.Box({
    vertical: true,
    children: [ Media, Notifications() ],
    css: `padding: 2px; margin-top: ${options.theme.spacing * 3.5}px;`,
  }),
})

const Bottom = Widget.Window({
  anchor: ['bottom'],
  className: 'popups',
  name: `bottom-popups`,
  child: Widget.Box({
    vertical: true,
    css: `padding: 2px;`,
    children: [ Indicators, /* TODO: Dock */ ],
  }),
})

export default [ Top, Bottom ]
