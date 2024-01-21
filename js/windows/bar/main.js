import { Widget } from '../../imports.js'

import StartWidget from './StartWidget.js'
import CenterWidget from './CenterWidget.js'
import EndWidget from './EndWidget.js'

export default Widget.Window({
  name: 'bar',
  layer: 'overlay',
  exclusivity: 'ignore',
  anchor: ['top', 'left', 'right'],
  child: Widget.CenterBox({
    className: 'topbar',
    startWidget: StartWidget,
    centerWidget: CenterWidget,
    endWidget: EndWidget,
  }),
})
