import '@testing-library/jest-dom';

// Polyfill window.scrollTo if not implemented in JSDOM
if (!window.scrollTo) {
  window.scrollTo = () => {};
}

// Polyfill Element.prototype.scrollIntoView if not implemented in JSDOM
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
