# Sola AIR for VS Code

Language support and a file icon for [Sola AIR](https://sola-air.dev) `.sola` components.

- **File icon.** `.sola` files get the Sola icon in the explorer and in editor tabs, in
  any file icon theme that falls back to language-contributed icons.
- **Syntax highlighting.** `.sola` files are highlighted as HTML with `<script>` and
  `<style>` blocks (this extension uses the Svelte grammar, so the Svelte extension is
  installed with it).

## About the icon

VS Code only uses an extension's icon for a language when the user's file icon theme
does not define one itself. If you use a theme that has no entry for `.sola`, you will
see this icon. Themes such as Material Icon Theme and vscode-icons show their own
generic icon until they add `.sola`.

## Links

- Website: https://sola-air.dev
- Source: https://github.com/Rbm3267/sola-air
- Issues: https://github.com/Rbm3267/sola-air/issues
