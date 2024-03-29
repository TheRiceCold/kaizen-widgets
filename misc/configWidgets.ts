import { setupCursorHover } from 'misc/cursorhover'

export const ConfigToggle = ({ icon, name, desc = '', initValue, onChange, ...props }) => {
  let value = initValue

  const toggleIcon = Widget.Label({
    label: `${value ? 'check' : ''}`,
    className: `txt-bold ${value ? '' : 'txt-poof'}`,
  })

  const toggleButtonIndicator = Widget.Box({
    hpack: 'start',
    vpack: 'center',
    homogeneous: true,
    children: [ toggleIcon ],
    className: `switch-fg ${value ? 'switch-fg-true' : ''}`,
  })

  const toggleButton = Widget.Box({
    hpack: 'end',
    homogeneous: true,
    children: [ toggleButtonIndicator ],
    className: `switch-bg ${value ? 'switch-bg-true' : ''}`,
  })

  const widgetContent = Widget.Box({
    tooltipText: desc,
    className: 'txt configtoggle-box',
    children: [
      Widget.Label({ label: icon }),
      Widget.Label({ className: 'txt txt-small', label: name }),
      Widget.Box({ hexpand: true }),
      toggleButton,
    ]
  })

  const interactionWrapper = Widget.Button({
    attribute: {
      toggle: (_) => {
        value = !value
        toggleIcon.toggleClassName('switch-fg-toggling-false', false)

        if (!value) {
          toggleIcon.label = ''
          toggleIcon.toggleClassName('txt-poof', true)
        }

        toggleButtonIndicator.toggleClassName('switch-fg-true', value)
        toggleButton.toggleClassName('switch-bg-true', value)

        if (value) Utils.timeout(1, () => {
          toggleIcon.label = 'check'
          toggleIcon.toggleClassName('txt-poof', false)
        })

        onChange(interactionWrapper, value)
      }
    },
    child: widgetContent,
    onClicked: self => self.attribute.toggle(self),
    setup: btn => {
      setupCursorHover(btn),
      btn.connect('pressed', () => {
        toggleIcon.toggleClassName('txt-poof', true)
        toggleIcon.toggleClassName('switch-fg-true', false)
        if (!value) toggleIcon.toggleClassName('switch-fg-toggling-false', true)
      })
    },
    ...props,
  })

  return interactionWrapper
}

export const ConfigSegmentedSelection = ({
  icon,
  name,
  desc = '',
  onChange,
  initIndex = 0,
  options = [
    { name: 'Option 1', value: 0 },
    { name: 'Option 2', value: 1 },
  ],
  ...props
}) => {
  let lastSelected = initIndex
  let value = options[initIndex].value
  const widget = Widget.Box({
    tooltipText: desc,
    className: 'segment-container',
    children: options.map((option, id) => {
      const selectedIcon = Widget.Revealer({
        transitionDuration: 150,
        transition: 'slide_right',
        revealChild: id == initIndex,
        child: Widget.Label({ label: 'check' })
      })

      return Widget.Button({
        setup: setupCursorHover,
        className: `segment-btn ${id == initIndex ? 'segment-btn-enabled' : ''}`,
        child: Widget.Box({
          hpack: 'center',
          className: 'spacing-h-5',
          children: [
            selectedIcon,
            Widget.Label({ label: option.name })
          ]
        }),
        onClicked: self => {
          value = option.value
          const kids = widget.get_children()
          kids[lastSelected].toggleClassName('segment-btn-enabled', false)
          kids[lastSelected].get_children()[0].get_children()[0].revealChild = false
          lastSelected = id
          self.toggleClassName('segment-btn-enabled', true)
          selectedIcon.revealChild = true
          onChange(option.value, option.name)
        }
      })
    }),
    ...props,
  })
  return widget
}

export const ConfigGap = ({ vertical = true, size = 5, ...props }) =>
  Widget.Box({ className: `gap-${vertical ? 'v' : 'h'}-${size}`, ...props })
