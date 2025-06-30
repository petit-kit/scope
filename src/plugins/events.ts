const eventsPlugin = (component: any) => {
  const refs = {
    _eventListeners: {} as Record<
      string,
      Record<string, Array<{ callback: Function; persist: boolean }>>
    >,
    _delegatedEventListeners: {} as Record<
      string,
      Record<string, Array<{ callback: Function }>>
    >,
  };
  const plugin = component.plugins;
  plugin.refs ??= {};
  plugin.refs.event = refs;

  plugin.on = function (
    selector: string,
    event: string,
    callback: Function,
    {
      persist = true,
      passive = true,
    }: { persist?: boolean; passive?: boolean } = {}
  ) {
    const result =
      typeof selector === "string" ? component.$(selector) : selector;

    const elements =
      result instanceof NodeList
        ? result
        : Array.isArray(result)
        ? result
        : [result];
    const boundCallback = callback.bind(component);

    elements.forEach((el) => {
      el.addEventListener(event, boundCallback, { passive });
    });

    refs._eventListeners[selector] ??= {};
    refs._eventListeners[selector][event] ??= [];
    refs._eventListeners[selector][event].push({
      callback: boundCallback,
      persist,
    });
  };

  plugin.off = function (selector: string, event: string, callback: Function) {
    const result = component.$(selector);
    const elements =
      result instanceof NodeList
        ? result
        : Array.isArray(result)
        ? result
        : [result];

    elements.forEach((el) => {
      el.removeEventListener(event, callback);
    });

    refs._eventListeners[selector][event] = refs._eventListeners[selector][
      event
    ].filter((listener) => listener.callback !== callback);
  };

  // @TODO remove remove listener delegate event
  plugin.delegate = function (
    selector: string,
    event: string,
    callback: Function
  ) {
    if (!refs._delegatedEventListeners[event]) {
      component.template.addEventListener(event, (e: Event) => {
        Object.entries(refs._delegatedEventListeners[event] || {}).forEach(
          ([selector]) => {
            const target = e.target as HTMLElement;
            const match = target.closest(selector);

            if (match && component.template.contains(match)) {
              const callbacks = refs._delegatedEventListeners[event][selector];
              callbacks.forEach(({ callback }) => callback(e, component));
            }
          }
        );
      });

      refs._delegatedEventListeners[event] = {};
    }

    refs._delegatedEventListeners[event][selector] ??= [];
    refs._delegatedEventListeners[event][selector].push({
      callback: callback.bind(component),
    });
  };

  plugin.handleEventListeners = function (apply = true) {
    const method = apply ? "addEventListener" : "removeEventListener";
    for (const [selector, events] of Object.entries(refs._eventListeners)) {
      for (const [event, listeners] of Object.entries(events)) {
        for (const { callback, persist } of listeners) {
          if (apply && !persist) continue;
          const element = component.$(selector);
          if (element) {
            (element as HTMLElement)[method](event, callback as EventListener);
          }
        }
      }
    }
  };

  return {
    onUnmount: () => {
      component.plugins.handleEventListeners(false);
    },
  };
};

export default eventsPlugin;
