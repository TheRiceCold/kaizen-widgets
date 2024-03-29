import { type Props as RevealerProps } from 'types/widgets/label'

import Player from './Player'
import options from 'options'
import { showMedia } from 'lib/variables'

const { transition } = options
const mpris = await Service.import('mpris')

const toggleMedia = () => showMedia.value = (!mpris.getPlayer()) ? false : !showMedia.value

// INFO: toggle media by running `ags -r 'toggleMedia()'`
globalThis['toggleMedia'] = toggleMedia
options.media.action.value = toggleMedia

export default Widget.Revealer({
  child: Player,
  transition: 'slide_down',
  transitionDuration: transition.value,
}).hook(showMedia, (self: RevealerProps) => self.revealChild = showMedia.value)
