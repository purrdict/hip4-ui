import { GlobalWindow } from "happy-dom";

const win = new GlobalWindow({ url: "https://localhost" });

// Install all DOM globals from happy-dom's GlobalWindow onto globalThis
const windowProps = Object.getOwnPropertyNames(Object.getPrototypeOf(win))
  .concat(Object.getOwnPropertyNames(win));

// Set the essential globals manually
(globalThis as any).window = win;
(globalThis as any).document = win.document;
(globalThis as any).navigator = win.navigator;
(globalThis as any).location = win.location;
(globalThis as any).history = win.history;
(globalThis as any).HTMLElement = (win as any).HTMLElement;
(globalThis as any).Element = (win as any).Element;
(globalThis as any).Node = (win as any).Node;
(globalThis as any).NodeList = (win as any).NodeList;
(globalThis as any).Event = (win as any).Event;
(globalThis as any).CustomEvent = (win as any).CustomEvent;
(globalThis as any).MouseEvent = (win as any).MouseEvent;
(globalThis as any).KeyboardEvent = (win as any).KeyboardEvent;
(globalThis as any).MutationObserver = (win as any).MutationObserver;
(globalThis as any).getComputedStyle = (styles: any) => win.getComputedStyle(styles);
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as any).cancelAnimationFrame = clearTimeout;
(globalThis as any).ResizeObserver = (win as any).ResizeObserver || class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
