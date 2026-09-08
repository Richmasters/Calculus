import { PARAM_GROUPS, PARAM_INDEX } from '../params.js';

/**
 * Builds the adjustment panel straight from the schema and keeps it in sync
 * with the live parameter object.
 */
export class ControlPanel {
  constructor(root, { onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.inputs = new Map();
    this.readouts = new Map();
    this.rows = new Map();
    this.build();
  }

  build() {
    this.root.innerHTML = '';
    for (const group of PARAM_GROUPS) {
      const details = document.createElement('details');
      details.className = 'group';
      details.open = group.id === 'abstraction' || group.id === 'brush';

      const summary = document.createElement('summary');
      summary.textContent = group.label;
      details.append(summary);

      const body = document.createElement('div');
      body.className = 'group-body';
      if (group.hint) {
        const hint = document.createElement('p');
        hint.className = 'group-hint';
        hint.textContent = group.hint;
        body.append(hint);
      }

      for (const spec of group.params) body.append(this.buildControl(spec));
      details.append(body);
      this.root.append(details);
    }
  }

  buildControl(spec) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    wrap.dataset.key = spec.key;
    wrap.dataset.search = `${spec.label} ${spec.key} ${spec.hint || ''}`.toLowerCase();

    const label = document.createElement('label');
    label.className = 'control-label';
    const name = document.createElement('span');
    name.textContent = spec.label;
    const value = document.createElement('em');
    label.append(name, value);
    wrap.append(label);
    this.readouts.set(spec.key, value);

    let input;
    if (spec.type === 'toggle') {
      input = document.createElement('input');
      input.type = 'checkbox';
      value.remove();
    } else if (spec.type === 'select') {
      input = document.createElement('select');
      for (const opt of spec.options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        input.append(o);
      }
      value.remove();
    } else if (spec.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      value.remove();
    } else {
      input = document.createElement('input');
      input.type = 'range';
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
    }

    input.id = `ctl-${spec.key}`;
    label.htmlFor = input.id;

    const commit = () => {
      const v =
        spec.type === 'toggle' ? input.checked
          : spec.type === 'select' || spec.type === 'color' ? input.value
            : Number(input.value);
      this.setReadout(spec, v);
      this.onChange(spec.key, v);
    };
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);

    // Double-clicking a slider snaps it back to the preset default.
    if (spec.type !== 'select' && spec.type !== 'color') {
      input.addEventListener('dblclick', () => {
        this.onChange(spec.key, spec.def);
      });
    }

    // Compact widgets sit on the label row; sliders get their own line.
    if (spec.type === 'toggle' || spec.type === 'color') label.append(input);
    else wrap.append(input);
    this.inputs.set(spec.key, input);

    if (spec.hint) {
      const hint = document.createElement('p');
      hint.className = 'control-hint';
      hint.textContent = spec.hint;
      wrap.append(hint);
    }
    this.rows.set(spec.key, wrap);
    return wrap;
  }

  setReadout(spec, v) {
    const el = this.readouts.get(spec.key);
    if (!el || !el.isConnected) return;
    const text =
      spec.step >= 1 ? String(Math.round(v)) : Number(v).toFixed(2).replace(/\.00$/, '');
    el.textContent = spec.unit ? `${text}${spec.unit}` : text;
  }

  /** Push the whole parameter object into the widgets. */
  sync(params) {
    for (const [key, input] of this.inputs) {
      const spec = PARAM_INDEX.get(key);
      const v = params[key];
      if (spec.type === 'toggle') input.checked = Boolean(v);
      else input.value = v;
      this.setReadout(spec, v);
      const row = this.rows.get(key);
      row.classList.toggle('changed', !valuesEqual(v, spec.def));
    }
  }

  filter(text) {
    const q = text.trim().toLowerCase();
    for (const row of this.rows.values()) {
      row.classList.toggle('hidden', Boolean(q) && !row.dataset.search.includes(q));
    }
    for (const details of this.root.querySelectorAll('.group')) {
      const visible = details.querySelectorAll('.control:not(.hidden)').length;
      details.hidden = Boolean(q) && visible === 0;
      if (q && visible > 0) details.open = true;
    }
  }
}

function valuesEqual(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  return a === b;
}
