/*
  Header пока не содержит состояния, но имеет точку инициализации,
  чтобы страница монтировала компоненты единообразно.
*/

const initializedHeaders = new WeakSet();

export function initHeader(root = document) {
  const header = root.querySelector(".header");
  if (!header || initializedHeaders.has(header)) return;

  initializedHeaders.add(header);
}
