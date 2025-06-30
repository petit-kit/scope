const inViewPlugin = (component: any, settings: any) => {
  component._observer = new IntersectionObserver(
    (e) =>
      e.forEach((i) =>
        i.isIntersecting ? component.onInView?.(i) : component.onOutView?.(i)
      ),
    { threshold: settings.inView?.inViewThreshold || 0 }
  ).observe(
    settings.inView?.inViewElement
      ? document.querySelector(settings.inView.inViewElement)
      : component.template
  );

  return {
    onUnmount: () => component._observer.disconnect(),
  };
};

export default inViewPlugin;
