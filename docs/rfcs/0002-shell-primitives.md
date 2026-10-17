# RFC 0002: shell primitives

Status: implemented · Package: `@sola-air-ui/ui` · Builds on: RFC 0001 (event bus), `mountShell`

## Problem

`mountShell` mounts a component beside a host app. RFC 0001 adds the event bus
that tells that component what happens on the page. The library has no
components made for this job. An app that wants a launcher, a command palette,
a side drawer or a toast stack writes each one by hand.

## Scope

Four generic components. Each one:

- works with no host framework and no bus (props and callbacks only);
- takes colors, spacing and radius from `@sola-air-ui/tokens`, with a fallback value;
- takes any list prop as a plain value or a getter function, as `Modal` does;
- is keyboard operable and exposes the ARIA roles listed below.

The components contain no product names, no routes and no role logic.

| Component | Job | Mount |
| --- | --- | --- |
| `LauncherDock` | A row of icon buttons fixed to one edge of the page. | Always on |
| `CommandPalette` | A searchable list of commands, opened with a hotkey. | Modal |
| `CompanionDrawer` | A side panel that holds any content through its slot. | Beside the page |
| `ToastHost` | A stack of short messages, filled from the bus. | Always on |

## `LauncherDock`

| Prop | Default | Meaning |
| --- | --- | --- |
| `items` | `[]` | `{ id, label, icon?, badge? }`. `icon` is text; without it the first letter of `label` shows. |
| `active` | `null` | `id` of the pressed item. Value or getter. |
| `position` | `'bottom'` | `'bottom'`, `'left'` or `'right'`. |
| `label` | `'Launcher'` | Accessible name of the `nav` element. |
| `onSelect` | `null` | Called with the item. |

Roles: `nav` with a name; each item is a `button` with `aria-pressed`.

## `CommandPalette`

| Prop | Default | Meaning |
| --- | --- | --- |
| `commands` | `[]` | `{ id, label, hint? }`. Value or getter. |
| `isOpen` | `null` | Controls the palette from outside. Value or getter. |
| `hotkey` | `'mod+k'` | Opens the palette. `mod` is Ctrl, or Cmd on macOS. `''` turns it off. |
| `placeholder` | `'Type a command…'` | Search field hint. |
| `label` | `'Command palette'` | Accessible name of the dialog. |
| `onSelect` | `null` | Called with the chosen command. The palette then closes. |
| `onClose` | `null` | Called when the palette closes. |

Search matches `label` and `hint`, ignoring case. Keys: Down and Up move the
selection (it wraps), Enter chooses, Escape closes. Focus moves to the search
field on open and returns to the previous element on close.

Roles: `dialog` with `aria-modal`; `combobox` search field with
`aria-activedescendant`; `listbox` of `option` elements; a polite live region
announces the result count.

## `CompanionDrawer`

| Prop | Default | Meaning |
| --- | --- | --- |
| `title` | `'Companion'` | Heading and accessible name. Value or getter. |
| `isOpen` | `null` | Controls the drawer from outside. Value or getter. |
| `initialOpen` | `false` | Start state when `isOpen` is not set. |
| `side` | `'right'` | `'right'` or `'left'`. |
| `width` | `'380px'` | CSS width. |
| `onClose` | `null` | Called when the drawer closes. |

The drawer does not block the page: there is no backdrop and no focus trap.
Focus moves into the drawer on open and returns on close. Escape closes it while
focus is inside. A closed drawer is hidden from keyboard and screen readers.

Roles: `dialog` with `aria-modal="false"`, named by its heading.

## `ToastHost`

| Prop | Default | Meaning |
| --- | --- | --- |
| `listen` | `'sola:toast'` | Bus event type to show. `''` turns the subscription off. |
| `duration` | `5000` | Milliseconds before a toast leaves. `0` keeps it until dismissed. |
| `max` | `4` | Most toasts shown at once. The oldest leaves first. |
| `onDismiss` | `null` | Called with the toast when it leaves. |

Payload: `{ kind: 'info' | 'success' | 'error', text, duration? }`, as in RFC 0001.
A payload with no `text` is ignored. `duration` in a payload overrides the prop.

Emit with `bus.emit('sola:toast', { kind: 'error', text: 'Save failed' })`.

Roles: a polite live region holds the stack; an `error` toast has
`role="alert"`.

## Out of scope

- Routing and navigation. Wire `onSelect` to the host's router.
- Persisting open state. Wrap the state in `$persist` in the host component.
- Role gates. RFC 0001 keeps them in the app.

## Test plan

`e2e/shell-primitives.spec.ts` mounts each component in a real browser and
checks roles, keyboard paths, focus return, the bus subscription and the
auto-dismiss timer.
