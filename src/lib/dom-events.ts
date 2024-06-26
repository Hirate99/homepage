type EventMap<T extends HTMLElement | Document | Window> = T extends Document
  ? DocumentEventMap
  : T extends Window
    ? WindowEventMap
    : HTMLElementEventMap;

interface IDomEventListener<
  E extends HTMLElement | Document | Window,
  Key extends keyof EventMap<E>,
> {
  el: E;
  event: Key;
  listener: (this: E, ev: EventMap<E>[Key]) => void;
  options?: boolean | AddEventListenerOptions;
}

export function from<
  E extends HTMLElement | Document | Window,
  Key extends keyof EventMap<E>,
>({ el, event, listener, options }: IDomEventListener<E, Key>) {
  el.addEventListener(
    event as string,
    listener as EventListenerOrEventListenerObject,
    options,
  );

  return () => {
    el.removeEventListener(
      event as string,
      listener as EventListenerOrEventListenerObject,
    );
  };
}

export function domEvent<
  E extends HTMLElement | Document | Window,
  Key extends keyof EventMap<E>,
>(
  el: E,
  event: Key,
  listener: (this: E, ev: EventMap<E>[Key]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  return from({
    el,
    event,
    listener,
    options,
  });
}
