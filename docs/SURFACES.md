# Interaction surfaces

Use distinct names:
- **Surface:** where the hero interacts: iPhone, web, Telegram, Instagram or WhatsApp.
- **Port:** the in-game home destination.
- **Transaction channel:** a subscription, power-up pack, referral or other commercial exchange.

Niko receives a typed surface hint. It changes relevant guidance, never identity or permissions. Instagram guidance may suggest unfollowing a distracting account; Telegram may suggest muting a channel. Neither implies access to feeds, contacts, private chats or memberships. Help the hero take a useful step and leave the screen; do not optimize for social scrolling.

Native distribution remains iPhone-first. Web and Telegram can also serve Android users. WhatsApp and Instagram are future adapters, not live integrations.

## Telegram launch

The website provides `/telegram/`, sharing the same React interface, JSON routine dispatcher and domain. It loads Telegram's official Mini App bridge for presentation readiness/expansion. It does not send messages or trust `initDataUnsafe`. If opened as an ordinary URL it remains a web app. Saves are local to the browser/WebView; this is not cross-device sync.

To register the actual Mini App, create/select a bot through https://t.me/BotFather and set its Main Mini App or menu button URL to https://questos.mangomint-5316.chatgpt.site/telegram/. No bot token, username or registration is configured yet. A public web route does not itself create a Telegram bot or an installable Telegram listing.

Before authenticated cloud gameplay or purchases, add server verification of Telegram initData, freshness checks, replay protection and ownership mapping. Do not reuse the Sites authenticated-user header as Telegram authentication. The current model gateway's owner-only Sites gate will not automatically authenticate Telegram users. Gameplay JSON execution remains local until a properly authenticated backend dispatcher exists.

Official reference: https://core.telegram.org/bots/webapps
