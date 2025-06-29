import { forEach } from "@petit-kit/utils";

import timePlugin from "./plugins/time";
import fetchPlugin from "./plugins/fetch";
import eventPlugin from "./plugins/events";

const castValue = (v: string, t: string) =>
  t === "number"
    ? +v
    : t === "array"
    ? JSON.parse(v)
    : t === "object"
    ? JSON.parse(v)
    : v;

class Component extends HTMLElement {
  private _shadow: ShadowRoot | null = null;
  private _propsDefinitions: any = {};
  private _props: any = {};
  private _styles: HTMLStyleElement | null = null;
  private _stylesSheets: Function[] = [];
  private _plugins: any[] = [];

  template!: HTMLElement;
  props: any = {};
  plugins: any = {};

  constructor({
    shadow = false,
    props = {},
    styles = "",
    stylesSheets = [],
    plugins = [],
  }: {
    shadow?: boolean;
    props?: any;
    styles?: string;
    stylesSheets?: Function[];
    plugins?: any[];
  }) {
    super();

    this._propsDefinitions = props;
    this._props = Object.keys(props).reduce((acc: any, key) => {
      const { ref, type, default: d } = props[key];
      const val = ref?.get?.() ?? this.getAttribute(key);

      if (ref) {
        const unsub = ref.subscribe?.((v: any) =>
          this.set(key, v, false, false, true)
        );
        props[key].ref.unsub = unsub;
      }

      acc[key] = val ? castValue(val, type) : d;
      return acc;
    }, {});
    this.props = this._props;

    this._styles = document.createElement("style");
    this._styles.textContent = styles;

    if (shadow) {
      this._shadow = this.attachShadow({ mode: "open" });
      this.template = document.createElement("main");
      this._shadow.appendChild(this._styles);
      this._shadow.appendChild(this.template);
    } else {
      this.template = this;
      document.head.appendChild(this._styles);
    }

    this._stylesSheets = stylesSheets;
    this._stylesSheets.forEach((sheet) => sheet(this));

    this.plugins = {};
    this._plugins = plugins.map((plugin) => plugin(this));
  }

  static get observedAttributes() {
    return this.observedAttrs;
  }

  $(selector: string, context: HTMLElement = this.template): any {
    const result = context.querySelectorAll(selector);
    console.log(selector, this.template);
    return result.length ? (result.length === 1 ? result[0] : result) : null;
  }

  get(key: string) {
    return this._props[key];
  }

  set(
    key: string,
    value: any,
    noReflect: boolean = false,
    _controlled = true,
    _fromRef = false
  ) {
    const prev = this._props[key];
    this._props[key] = typeof value === "function" ? value(prev) : value;

    prev !== this._props[key] &&
      this._propsDefinitions[key].reflect &&
      !noReflect &&
      this.setAttribute(key, this._props[key]);

    this.onUpdate({ [key]: this._props[key] }, this._props);

    !this._propsDefinitions[key].noRender && this._render();

    if (this._propsDefinitions[key].ref && !_fromRef) {
      this._propsDefinitions[key].ref.set(this._props[key]);
    }
  }

  attributeChangedCallback(name: string, _: string, newValue: string) {
    const formattedValue = castValue(
      newValue,
      this._propsDefinitions[name].type
    );
    if (!this._propsDefinitions[name].ref) {
      this.set(name, formattedValue, true, false);
    }
  }

  _render() {
    const content: any = this.render(this._props);
    if (content) {
      this.template.innerHTML = content;
    }
  }

  _removeStyles() {
    this._styles?.remove();
  }

  update() {
    this._render();
  }

  connectedCallback() {
    this.onPreMount();
    this.onUpdate(this._props, this._props);
    this._plugins.forEach((plugin) => plugin.onMount?.());
    this._render();
    this.onMount();
  }

  disconnectedCallback() {
    this.onUnmount();
    forEach(this.props, (v: any) => v.ref && v.ref.unsub?.());
    this._plugins.forEach((plugin) => plugin.onUnmount?.());
  }

  destroy() {
    this._removeStyles();
    this.remove();
  }

  static observedAttrs: string[] = [];
  render(_props: any) {}
  onPreMount() {}
  onMount() {}
  onUnmount() {}
  onUpdate(_changes: any, _props: any) {}
}

export default Component;
export { timePlugin as time, fetchPlugin as fetch, eventPlugin as event };
