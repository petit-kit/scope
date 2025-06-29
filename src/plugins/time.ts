const timePlugin = (component: any) => {
  const refs = {
    _intervals: {} as Record<string, any>,
    _timeouts: {} as Record<string, any>,
    _rafs: {} as Record<string, any>,
  };
  const plugin = component.plugins;
  plugin.refs ??= {};
  plugin.refs.time = refs;

  plugin.clearInterval = function (id?: any) {
    refs._intervals[id]?.cancel();
    delete refs._intervals[id];
  };

  plugin.clearIntervals = function () {
    Object.values(refs._intervals).forEach((interval: any) =>
      plugin.clearInterval(interval.id)
    );
  };

  plugin.clearTimeout = function (id?: any) {
    refs._timeouts[id]?.cancel();
    delete refs._timeouts[id];
  };

  plugin.clearTimeouts = function () {
    Object.values(refs._timeouts).forEach((timeout: any) => timeout.cancel());
  };

  plugin.clearRaf = function (id?: any) {
    refs._rafs[id]?.cancel();
    delete refs._rafs[id];
  };

  plugin.clearRafs = function () {
    Object.values(refs._rafs).forEach((raf: any) => plugin.clearRaf(raf.id));
  };

  plugin.interval = function (
    callback: Function,
    interval: number,
    name?: string
  ) {
    if (name && refs._intervals[name])
      plugin.clearInterval(refs._intervals[name].id);
    const start = Date.now();
    const id = setInterval(() => {
      const current = Date.now();
      callback(current - start, cancel);
    }, interval);
    const cancel = () => clearInterval(id);
    refs._intervals[name || id] = { name, callback, id, cancel };
    return cancel;
  };

  plugin.timeout = function (
    callback: Function,
    timeout: number,
    name?: string
  ) {
    if (name && refs._timeouts[name])
      plugin.clearTimeout(refs._timeouts[name].id);
    const id = setTimeout(callback, timeout);
    const cancel = () => clearTimeout(id);
    refs._timeouts[name || id] = { name, callback, id, cancel };
    return cancel;
  };

  plugin.raf = function (callback: Function, name?: string) {
    if (name && refs._rafs[name]) plugin.clearRaf(refs._rafs[name].id);
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      plugin.clearRaf(id);
    };
    const action = (time: number) => {
      callback(time, cancel);
      if (!cancelled) id = requestAnimationFrame(action);
    };
    let id = requestAnimationFrame(action);
    refs._rafs[name || id] = { name, callback, id, cancel };
    return cancel;
  };

  return {
    onUnmount: () => {
      plugin.clearIntervals();
      plugin.clearTimeouts();
      plugin.clearRafs();
    },
  };
};

export default timePlugin;
