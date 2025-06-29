const fetchPlugin = (component: any) => {
  const refs = {
    _fetchAborts: {} as Record<string, AbortController>,
  };
  const plugin = component.plugins;
  plugin.refs ??= {};
  plugin.refs.fetchs = refs;

  plugin.fetch = function (url: string) {
    if (refs._fetchAborts[url]) refs._fetchAborts[url].abort();
    const controller = new AbortController();
    refs._fetchAborts[url] = controller;
    const signal = controller.signal;
    const promise = fetch(url, { signal }).then((res) => res.json());
    promise.finally(() => delete refs._fetchAborts[url]);
    return promise;
  };

  plugin.fetchs = function (urls: string[]) {
    return Promise.all(urls.map((url) => this.fetch(url)));
  };

  plugin.abortFetch = function (url: string) {
    if (refs._fetchAborts[url]) refs._fetchAborts[url].abort();
    delete refs._fetchAborts[url];
  };

  plugin.clearAllFetches = function () {
    Object.values(refs._fetchAborts).forEach((abort: any) => abort.abort());
    refs._fetchAborts = {};
  };

  return {
    onUnmount: () => {
      plugin.clearAllFetches();
    },
  };
};

export default fetchPlugin;
