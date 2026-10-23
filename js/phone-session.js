/* A new QR may navigate within the same document because its secret is a fragment. */
(function() {
  'use strict';
  const initialHash = location.hash;
  addEventListener('hashchange', function() {
    if (location.hash !== initialHash) location.reload();
  });
  // Back/forward cache must not restore links whose lifetime ended in the meantime.
  addEventListener('pageshow', function(event) { if (event.persisted) location.reload(); });
})();
