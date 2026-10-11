# Port notifications

The web game has a circular bottom Port control and a notification settings screen at `#/notifications`. Enabling device alerts requires a deliberate tap and the browser's permission. In-game notices are used while the document is visible. A hidden document may use its service worker to show an allowed device notification. Denied, unsupported and failed device delivery retain the notice in-game.

The test button sends one immediate notice and attempts another after eight seconds. Switch to another app while leaving the page alive to test device delivery. Navigating away from the test screen cancels its pending timer. iPhone may suspend the page, so this timer does not promise background delivery. Actual push after closing the game needs subscription management and a push server; neither is active.

On iPhone, open the site in Safari, add it to the Home Screen, then open that installed web app and request permission there. Browser capability and OS permission are checked at runtime. Tapping a service-worker notification navigates to the corresponding route within the same site/starter scope.

Quest completion and completed Nico jobs produce actionable notices. Mounting an existing save does not replay its past completed jobs. Profile changes clear the previous hero's on-screen notice. Driving mode hides the dock and suppresses new game event notices. No background schedule is created by this feature.

JSDOM and adapter tests exercise routing, permission refusal, duplicate prevention, failure fallback, event subscription and the test timer. These are not a real iPhone push-delivery test.

Official references used for implementation:
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
