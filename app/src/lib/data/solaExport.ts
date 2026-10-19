// Turns a layout of components into a real `.sola` file that imports from
// @sola-air-ui/ui. Shared by the code exporters on /components, /studio and
// /demo, and checked by e2e/sola-export.spec.ts, which compiles the output with
// the real compiler. Before this, each page wrote its own snippet by hand and
// all three emitted code that did not work (JSX tags for mount functions, a
// `config={...}` prop no component takes, custom elements nothing registers).
//
// Only components the package ships are emitted, with only the props each one
// declares. Anything else becomes an HTML comment that says so.

export interface UiManifest {
  /** Component name → import path, e.g. DataCard → '@sola-air-ui/ui/data-card'. */
  subpaths: Readonly<Record<string, string>>;
  /** Component name → props it declares with `export let`. */
  props: Readonly<Record<string, readonly string[]>>;
}

export interface ExportItem {
  component: string;
  props: Record<string, unknown>;
  /** Grid columns the item spans, 1–3. */
  span?: number;
  /** Shown in place of the item when the component is not in the package. */
  label?: string;
}

const OPEN = '<' + 'script>';
const CLOSE = '<' + '/script>';

/** Keep only props the component declares, and drop undefined values. */
export function knownProps(component: string, props: Record<string, unknown>, ui: UiManifest) {
  const declared = new Set(ui.props[component] ?? []);
  return Object.fromEntries(
    Object.entries(props).filter(([k, v]) => declared.has(k) && v !== undefined)
  );
}

function attribute(name: string, value: unknown): string {
  // A plain string becomes a literal attribute. Anything with a quote or a
  // brace, and every non-string, goes through an expression so it parses.
  if (typeof value === 'string' && !/["{}]/.test(value)) return `${name}="${value}"`;
  return `${name}={${JSON.stringify(value)}}`;
}

function commentText(text: string): string {
  return text.replace(/--/g, '-');
}

/** A `.sola` file that lays the items out in a grid. */
export function toSolaFile(items: ExportItem[], ui: UiManifest): string {
  const used = [...new Set(items.map((i) => i.component).filter((c) => c in ui.subpaths))];
  const imports = used.map((c) => `  import ${c} from '${ui.subpaths[c]}';`).join('\n');

  const body = items
    .map((item) => {
      if (!(item.component in ui.subpaths)) {
        const name = item.label ? `"${item.label}" (${item.component})` : item.component;
        return `  <!-- ${commentText(name)}: a preview on this site, not in @sola-air-ui/ui -->`;
      }
      const attrs = Object.entries(knownProps(item.component, item.props, ui)).map(([k, v]) =>
        attribute(k, v)
      );
      const tag = attrs.length ? `<${item.component} ${attrs.join(' ')} />` : `<${item.component} />`;
      const span = Math.min(Math.max(item.span ?? 1, 1), 3);
      return span > 1 ? `  <div style="grid-column: span ${span};">${tag}</div>` : `  <div>${tag}</div>`;
    })
    .join('\n');

  const script = used.length ? `${OPEN}\n${imports}\n${CLOSE}\n\n` : '';
  return `${script}<div class="grid">\n${body}\n</div>\n\n<style>\n  .grid {\n    display: grid;\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n    gap: 16px;\n  }\n</style>\n`;
}

/** Mounting a compiled `.sola` file from any framework or plain JS. */
export function mountSnippet(file = 'App.sola'): string {
  const name = file.replace(/\.sola$/, '');
  return `// A compiled .sola file's default export is its mount function.
// Call it with an element once the DOM exists (React useEffect, Vue onMounted,
// a Web Component's connectedCallback, or plain JS).
import ${name} from './${file}';

const teardown = ${name}(document.getElementById('app'));

// Later, to unmount and run onDestroy callbacks:
// teardown();`;
}

/** Mounting one published component directly from JS, with its props. */
export function mountComponentSnippet(component: string, props: Record<string, unknown>, ui: UiManifest): string {
  if (!(component in ui.subpaths)) return previewNote(component, ui);
  const known = knownProps(component, props, ui);
  return `import ${component} from '${ui.subpaths[component]}';

// A compiled component's default export is its mount function.
const teardown = ${component}(document.getElementById('app'), ${JSON.stringify(known, null, 2)});`;
}

/** The shape of a card on /studio, as far as export needs it. */
export interface StudioCardLike {
  type: string;
  title: string;
  subtitle?: string;
  cols: number;
  value: string | number;
  delta?: string;
  accentColor?: string;
  config?: Record<string, any>;
}

const GAUGE_COLORS = ['emerald', 'sky', 'violet', 'amber'];
const DIAL_COLORS = ['amber', 'emerald', 'sky'];
const pick = (color: string | undefined, allowed: string[]) =>
  color && allowed.includes(color) ? color : undefined;

/**
 * Map a Studio card to the published component that does the same job. Card
 * types with no published counterpart (sliders, charts, feeds, tables, code,
 * date pickers, status) come out as a labelled comment.
 */
export function studioCardToItem(card: StudioCardLike): ExportItem {
  const base = { span: card.cols, label: card.title };
  switch (card.type) {
    case 'stat':
      return { ...base, component: 'DataCard', props: { title: card.title, value: String(card.value), trend: card.delta ?? '' } };
    case 'progress':
      return {
        ...base,
        component: 'GaugeCard',
        props: {
          title: card.title,
          value: card.delta ?? `${card.value}%`,
          percentage: Number(card.value) || 0,
          subtext: card.subtitle ?? '',
          color: pick(card.accentColor, GAUGE_COLORS)
        }
      };
    case 'radial_dial':
      return {
        ...base,
        component: 'TactileDialCard',
        props: {
          title: card.title,
          metric: card.subtitle ?? '',
          currentValue: Number(card.value) || 0,
          color: pick(card.accentColor, DIAL_COLORS)
        }
      };
    case 'waterfall': {
      const bars: { name: string; val: number }[] = card.config?.bars ?? [];
      const steps = bars.map((b, i) => ({
        name: b.name,
        value: b.val,
        type: i === bars.length - 1 ? 'total' : b.val < 0 ? 'negative' : 'positive'
      }));
      return { ...base, component: 'FlowWaterfall', props: steps.length ? { title: card.title, steps } : { title: card.title } };
    }
    default:
      return { ...base, component: `${card.type} card`, props: {} };
  }
}

/**
 * Site-only previews whose job the package covers with a different component.
 * The props differ, so this is a pointer, not a rename.
 */
export const PACKAGE_EQUIVALENT: Readonly<Record<string, string>> = {
  SolaButton: 'Button',
  SolaBadge: 'Badge',
  SolaAlert: 'Alert',
  SolaModal: 'Modal',
  SolaDialog: 'Modal',
  SolaSelect: 'Select',
  SolaInput: 'TextInput',
  SolaSwitch: 'Toggle',
  SolaTable: 'Table',
  SolaDataTable: 'Table',
  SolaDatePicker: 'DatePicker',
  SolaLineChart: 'Chart',
  SolaChart: 'Chart',
  SolaCommandPalette: 'CommandPalette',
  SolaDrawer: 'CompanionDrawer',
  SolaMarkdown: 'MarkdownViewer',
  SolaHtmlPreview: 'HtmlViewer'
  // Only components that do the same job. A tabs strip is not a Stack and an
  // accordion is not a Card, so those previews get no pointer.
};

/** What to show instead of code for a component the package does not ship. */
export function previewNote(component: string, ui: UiManifest): string {
  const lines = [
    `// ${component} is a preview built for this site.`,
    `// It is not part of @sola-air-ui/ui, so there is no code to install.`
  ];
  const equivalent = PACKAGE_EQUIVALENT[component];
  if (equivalent && equivalent in ui.subpaths) {
    const declared = (ui.props[equivalent] ?? []).join(', ');
    lines.push(
      `//`,
      `// The package ships ${equivalent} for the same job, with its own props${declared ? ` (${declared})` : ''}:`,
      `import ${equivalent} from '${ui.subpaths[equivalent]}';`
    );
  }
  return lines.join('\n');
}
