# Sola AIR for VS Code

Language support and a file icon for [Sola AIR](https://sola-air.dev) `.sola` components.

- **File icon.** `.sola` files get the Sola icon in the explorer and in editor tabs, in
  any file icon theme that falls back to language-contributed icons.
- **Syntax highlighting.** A grammar written for `.sola`: HTML markup, `<script>` as
  JavaScript, `<style>` as CSS, `{expressions}` and attribute values like
  `onclick={handler}` as JavaScript, `{#if}` / `{:else}` / `{#each items as item, i (key)}`
  blocks, and the `$state`, `$derived`, `$effect`, `$persist`, `$intent`, `$data`, `$on`
  and `$lastEvent` macros. It no longer needs the Svelte extension.
- **Snippets.** Type `sola` for a new component, or `state`, `derived`, `effect`,
  `persist`, `intent`, `data`, `on`, `lastevent`, `prop`, `if`, `ifelse`, `each`,
  `import-ui`.
- **Editing.** Brackets and quotes close automatically, `<!-- -->` comments toggle, and
  `<!-- #region -->` folds.

## About the icon

VS Code only uses an extension's icon for a language when the user's file icon theme
does not define one itself. If you use a theme that has no entry for `.sola`, you will
see this icon. Themes such as Material Icon Theme and vscode-icons show their own
generic icon until they add `.sola`.

## Links

- Website: https://sola-air.dev
- Source: https://github.com/Rbm3267/sola-air
- Issues: https://github.com/Rbm3267/sola-air/issues
