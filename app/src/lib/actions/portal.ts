// Moves an element to the end of <body> while it is mounted.
//
// Overlays use `position: fixed`, which is relative to the viewport only when no
// ancestor has a transform, filter, backdrop-filter, perspective or paint
// containment. Cards on this site use backdrop-blur, so a dialog or menu rendered
// inside one is positioned and clipped relative to the card instead of the page.
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    }
  };
}
