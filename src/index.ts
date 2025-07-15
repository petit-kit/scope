// Component.ts

import timePlugin from "./plugins/time";
import fetchPlugin from "./plugins/fetch";
import eventsPlugin from "./plugins/events";
import inViewPlugin from "./plugins/inview";

/**
 * Casts a string value to a specified type.
 * @param v - The value to cast.
 * @param t - The type to cast to ("number", "array", "object", "boolean", etc).
 * @returns The casted value.
 */
const castValue = (v: string, t: string) => {
  return t === "number"
    ? +v
    : t === "array"
    ? typeof v === "string"
      ? JSON.parse(v)
      : v
    : t === "object"
    ? typeof v === "string"
      ? v === "undefined"
        ? undefined
        : JSON.parse(v)
      : v
    : t === "boolean"
    ? v === "true" || v === ""
    : v;
};

/**
 * Infers the type of a value as a string.
 * @param val - The value to infer the type of.
 * @returns The inferred type as a string.
 */
const inferType = (val: any): string =>
  Array.isArray(val)
    ? "array"
    : val === null
    ? "null"
    : typeof val === "object"
    ? "object"
    : typeof val;

/**
 * Casts a property definition to a standard format.
 * @param prop - The property definition.
 * @returns The standardized property definition.
 */
const castProp = (prop: any) =>
  prop.get
    ? { ref: prop, type: inferType(prop.get()), default: prop.get() }
    : prop.type != null
    ? prop
    : { default: prop, type: inferType(prop), ref: null };

/**
 * Base class for custom web components with props, styles, plugins, and lifecycle hooks.
 */
class Component extends HTMLElement {
  private _shadow: ShadowRoot | null = null;
  private _propsDefinitions: any = {};
  private _props: any = {};
  private _styles: HTMLStyleElement | null = null;
  private _stylesSheets: Function[] = [];
  private _plugins: any[] = [];
  private _children: Node | Node[] = [];
  private _batchRender: boolean = false;
  private _renderScheduled: boolean = false;
  mounted: boolean = false;

  /**
   * The main template element for the component.
   */
  template!: HTMLElement;

  /**
   * The current props of the component.
   */
  props: any = {};

  /**
   * The plugins attached to the component.
   */
  plugins: any = {};

  /**
   * Creates a new Component instance.
   * @param args - Configuration options for the component.
   */
  constructor(args: {
    shadow?: boolean;
    props?: any;
    styles?: string;
    stylesSheets?: Function[];
    plugins?: any[];
    batchRender?: boolean;
  }) {
    super();
    const {
      shadow = false,
      props = {},
      styles = "",
      stylesSheets = [],
      plugins = [],
      batchRender = true,
    } = args || {};

    this._batchRender = batchRender;

    this._propsDefinitions = props;
    this._props = Object.keys(props).reduce((acc: any, key) => {
      this._propsDefinitions[key] = castProp(props[key]);
      const { ref, type, default: d } = this._propsDefinitions[key];
      const val = ref?.get?.() ?? this.getAttribute(key);

      if (ref) {
        const unsub = ref.subscribe?.((v: any) => {
          this.set(key, v, false, true);
        }, false);
        props[key].ref.unsub = unsub;
      }

      acc[key] = val ? castValue(val, type) : d;
      return acc;
    }, {});
    this.props = this._props;

    if (shadow) {
      this._shadow = this.attachShadow({ mode: "open" });
      this.template = document.createElement("main");
      this._shadow.appendChild(this.template);
    } else {
      this.template = this;
    }

    if (styles) {
      this._styles = document.createElement("style");
      this._styles.textContent = styles;

      if (shadow) {
        this._shadow!.appendChild(this._styles);
      } else {
        document.head.appendChild(this._styles);
      }
    }

    this._stylesSheets = stylesSheets;
    this._stylesSheets.forEach((sheet) => sheet(this));

    this.plugins = {};
    this._plugins = plugins.map((plugin) => plugin(this, args));
  }

  /**
   * Returns the list of observed attributes for the component.
   */
  static get observedAttributes() {
    return this.observedAttrs;
  }

  /**
   * Sets the children nodes for the component.
   * @param children - The children nodes.
   */
  setChildren(children: Node) {
    this._children = children;
    this.mounted && this._scheduleRender();
  }

  /**
   * Queries the component's template for elements matching the selector.
   * @param selector - The CSS selector.
   * @param context - The context element to query within.
   * @returns The matching element(s) or null.
   */
  $(selector: string, context: HTMLElement = this.template): any {
    const result = context.querySelectorAll(selector);
    return result.length ? (result.length === 1 ? result[0] : result) : null;
  }

  /**
   * Gets the value of a prop.
   * @param key - The prop key.
   * @returns The prop value.
   */
  get(key: string) {
    return this._props[key];
  }

  /**
   * Checks if a prop exists.
   * @param key - The prop key.
   * @returns True if the prop exists, false otherwise.
   */
  propsExists(key: string) {
    return key in this._props;
  }

  /**
   * Sets multiple props at once.
   * @param updates - An object of prop updates.
   * @param noReflect - If true, does not reflect to attributes.
   */
  setMultiple(updates: { [key: string]: any }, noReflect: boolean = false) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value, noReflect);
    });
  }

  /**
   * Sets a prop value.
   * @param key - The prop key.
   * @param value - The new value.
   * @param noReflect - If true, does not reflect to attributes.
   * @param _fromRef - Internal flag for ref updates.
   * @param noExecution - If true, does not execute if value is a function.
   */
  set(
    key: string,
    value: any,
    noReflect: boolean = false,
    _fromRef = false,
    noExecution = false
  ) {
    if (!(key in this._props)) {
      console.warn(`Property ${key} not found in props`);
      return;
    }

    const prev = this._props[key];
    this._props[key] =
      typeof value === "function" && !noExecution ? value(prev) : value;

    // @todo deepEqual ??
    // if (prev === value) return;

    prev !== this._props[key] &&
      this._propsDefinitions[key].reflect &&
      !noReflect &&
      this.setAttribute(key, this._props[key]);

    this.onUpdate({ [key]: this._props[key] }, this._props);

    if (this._propsDefinitions[key].ref && !_fromRef) {
      this._propsDefinitions[key].ref.set(this._props[key]);
    }

    !this._propsDefinitions[key].noRender &&
      this.mounted &&
      this._scheduleRender();
  }

  /**
   * Called when an observed attribute changes.
   * @param name - The attribute name.
   * @param _ - The old value (unused).
   * @param newValue - The new value.
   */
  attributeChangedCallback(name: string, _: string, newValue: string) {
    if (!this._propsDefinitions[name]) return;

    const formattedValue = castValue(
      newValue,
      this._propsDefinitions[name].type
    );
    if (!this._propsDefinitions[name].ref) {
      this.set(name, formattedValue, true, false);
    }
  }

  /**
   * Schedules a render, batching if enabled.
   * @private
   */
  private _scheduleRender() {
    if (!this._batchRender) {
      this._render();
      return;
    }
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    Promise.resolve().then(() => {
      this._renderScheduled = false;
      this._render();
    });
  }

  /**
   * Renders the component's template.
   * Calls the `render` method and sets the template's innerHTML.
   * @private
   */
  _render() {
    const content: any = this.render(this._props, this._children);
    if (content) {
      this.template.innerHTML = content;
    }
  }

  /**
   * Removes the component's styles from the DOM.
   * @private
   */
  _removeStyles() {
    this._styles?.remove();
  }

  /**
   * Forces the component to update and re-render.
   */
  update() {
    this.mounted && this._scheduleRender();
  }

  /**
   * Lifecycle: Called when the component is added to the DOM.
   */
  connectedCallback() {
    this.onPreMount();
    this._plugins.forEach((plugin) => plugin.onPreMount?.());
    this.onUpdate(this._props, this._props);
    this._plugins.forEach((plugin) => plugin.onMount?.());
    this._render();
    this.mounted = true;
    this.onMount();
  }

  /**
   * Lifecycle: Called when the component is removed from the DOM.
   */
  disconnectedCallback() {
    this.onUnmount();
    this._removeStyles();
    Object.values(this._propsDefinitions).forEach(
      (v: any) => v && v.ref && v.ref.unsub?.()
    );
    this._plugins.forEach((plugin) => plugin.onUnmount?.());
  }

  /**
   * Destroys the component, removing styles and the element itself.
   */
  destroy() {
    this.remove();
  }

  /**
   * List of observed attribute names.
   */
  static observedAttrs: string[] = [];

  /**
   * Override to provide the component's HTML template.
   * @param _props - The current props.
   * @param children - The children nodes.
   * @returns The HTML string for the template.
   */
  render(_props: any, _children: any) {}

  /**
   * Lifecycle: Called before the component is mounted.
   */
  onPreMount() {}

  /**
   * Lifecycle: Called after the component is mounted.
   */
  onMount() {}

  /**
   * Lifecycle: Called when the component is unmounted.
   */
  onUnmount() {}

  /**
   * Called when props are updated.
   * @param _changes - The changed props.
   * @param _props - The current props.
   */
  onUpdate(_changes: any, _props: any) {}
}

export default Component;
export {
  timePlugin as time,
  fetchPlugin as fetch,
  eventsPlugin as events,
  inViewPlugin as inView,
};
