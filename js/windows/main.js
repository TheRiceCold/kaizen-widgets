import Bar from './bar/main.js'
import Osk from './osk/main.js'
// import Dock from './dock/main.js'
import Desktop from './desktop/main.js'
// import Calendar from './calendar/main.js'
import Launcher from './launcher/main.js'
import Overview from './overview/main.js'
import PowerMenu from './powermenu/main.js'
import CheatSheet from './cheatsheet/main.js'
import Indicators from './indicators/main.js'
import Quicksettings from './quicksettings/main.js'
import ScreenCorners from './screencorners/main.js'

export default () => [
  Bar,
  Osk,
  // Dock,
  Desktop,
  Launcher,
  Overview,
  // Calendar,
  PowerMenu,
  CheatSheet,
  Indicators,
  Quicksettings,
].concat(ScreenCorners)
