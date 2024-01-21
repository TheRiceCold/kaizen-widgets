import { App } from '../../../imports.js'
import PanelButton from './PanelButton.js'

import { FontIcon } from '../../../misc/main.js'
import { options, icons } from '../../../constants/main.js'

const distro = imports.gi.GLib.get_os_info('ID')

export default PanelButton({
  window: 'overview',
  className: 'overview',
  onClicked: () => App.toggleWindow('overview'),
  content: FontIcon({
    binds: [[
      'icon', options.bar.icon, 
      'value', v => v === 'distro-icon' ? icons.distro[distro] : v 
    ]],
  }),
})
