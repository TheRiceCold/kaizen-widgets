import { type BarWidget } from 'windows/bar'
import { type TWorkspace } from 'windows/bar/widgets/workspaces/LabelStack'
import { opt } from 'lib/option'

export default {
  position: opt<'top' | 'bottom'>('top'),
  layout: {
    start: opt<BarWidget[]>([ 'launcher', 'workspaces', ]),
    end: opt<BarWidget[]>([ 'tray', 'control', 'datemenu' ]),
  },
  tray: {
    ignore: opt([ 'KDE Connect Indicator' ]),
  },
  media: {
    length: opt(40),
    visualizer: { width: opt(8), height: opt(24) },
  },
  datemenu: {
    interval: 5000,
    // DOCS: https://docs.gtk.org/glib/method.DateTime.format.html
    format: opt('%a %b %d  %I:%M'),
    action: opt(() => {
      App.toggleWindow('datemenu')
      App.closeWindow('dropmenu')
    }),
  },
  settings: {
    colored: opt(false),
    action: opt(() => {
      App.toggleWindow('dropmenu')
      App.closeWindow('datemenu')
    }),
  },
  launcher: {
    icon: {
      icon: opt(null),
      colored: opt(true),
    },
    action: opt(() => App.toggleWindow('launcher')),
    label: { colored: opt(true), label: opt(''), },
  },
  workspaces: {
    label: opt('Workspace: '),
    items: opt<TWorkspace[]>([
      { label: 'work', gerund: 'working in' },
      { label: 'explore', gerund: 'exploring in', only: [ 'firefox' ] },
      { label: 'listen', gerund: 'listening in', only: [ 'Spotify' ] },
      { label: 'communicate', gerund: 'communicating in', only: [ 'vesktop' ] },
      { label: 'virtual', gerund: 'virtualized |', only: [] },
      { label: 'extra', gerund: '' }
    ]),
    substitutes: {
      foot: 'Terminal (Foot)'
    }
  },
  profilemenu: {
    action: opt(() => App.toggleWindow('profilemenu')),
  },
}
