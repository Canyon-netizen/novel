// ==================== Modal utilities ====================
// Generic ESC handler: closes the topmost open .modal-overlay.
// Protects users mid-input: if focus is in a text field, first ESC blurs it,
// a second ESC closes the modal.

(function () {
  'use strict';

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    const target = e.target;
    const tag = target && target.tagName;
    const editable = target && (
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
      target.isContentEditable
    );
    if (editable && typeof target.blur === 'function') {
      target.blur();
      return;
    }

    const open = document.querySelector('.modal-overlay.show');
    if (!open) return;

    e.preventDefault();
    e.stopPropagation();

    // Prefer data-modal-close attribute, then the standard × buttons,
    // then fall back to dropping the .show class (sufficient when the
    // page also has an overlay click handler that calls the closer).
    const closer = open.querySelector('[data-modal-close], .modal-x, .modal-close');
    if (closer) {
      closer.click();
      return;
    }
    open.classList.remove('show');
  });
})();