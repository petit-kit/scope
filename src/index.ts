import timePlugin from "./plugins/time";
import fetchPlugin from "./plugins/fetch";
import eventsPlugin from "./plugins/events";
import inViewPlugin from "./plugins/inview";

const castValue = (v: string, t: string) =>
  t === "number"
    ? +v
    : t === "array"
    ? JSON.parse(v)
    : t === "object"
    ? JSON.parse(v)
    : v;

const inferType = (val: any): string =>
  Array.isArray(val)
    ? "array"
    : val === null
    ? "null"
    : typeof val === "object"
    ? "object"
    : typeof val;

const castProp = (prop: any) =>
  prop.get
    ? { ref: prop, type: inferType(prop.get()), default: prop.get() }
    : prop.type != null
    ? prop
    : { default: prop, type: inferType(prop), ref: null };

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

  constructor(args: {
    shadow?: boolean;
    props?: any;
    styles?: string;
    stylesSheets?: Function[];
    plugins?: any[];
  }) {
    super();
    const {
      shadow = false,
      props = {},
      styles = "",
      stylesSheets = [],
      plugins = [],
    } = args;

    this._propsDefinitions = props;
    this._props = Object.keys(props).reduce((acc: any, key) => {
      this._propsDefinitions[key] = castProp(props[key]);
      const { ref, type, default: d } = this._propsDefinitions[key];
      const val = ref?.get?.() ?? this.getAttribute(key);

      if (ref) {
        const unsub = ref.subscribe?.((v: any) => {
          this.set(key, v, false, false, true);
        }, false);
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
    this._plugins = plugins.map((plugin) => plugin(this, args));
  }

  static get observedAttributes() {
    return this.observedAttrs;
  }

  $(selector: string, context: HTMLElement = this.template): any {
    const result = context.querySelectorAll(selector);
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
    Object.values(this.props).forEach((v: any) => v.ref && v.ref.unsub?.());
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
export {
  timePlugin as time,
  fetchPlugin as fetch,
  eventsPlugin as events,
  inViewPlugin as inView,
};
