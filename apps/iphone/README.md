# QuestOS for iPhone

This is a native React Native interface to the same typed, Effect-based game application used by the website. It uses native views, native modal sheets, iOS sharing, safe-area insets, and AsyncStorage. It does not wrap the website in a WebView.

Run commands from the repository root:

- `npm run ios:start`: launch Expo for iPhone development.
- `npm run ios:bundle`: validate and export the iOS JavaScript/Hermes bundle without Xcode.

The app configuration only includes iOS and disables iPad support. There are no Android build targets. `eas.json` contains an iOS simulator profile and an App Store production profile. Before signing, select an owned bundle identifier and connect the owner's Apple Developer account. The current identifier, `app.questos.iphone`, is provisional; no claim of ownership or App Store approval is implied.

The native app currently stores saves on the device. Its repositories and routines are injected through the same persistence interface as the website. Native cloud authentication and account linking can be added without changing domain rules. Sharing a save exports the versioned format compatible with the website; Niko's optional memory can be reset independently of game progress.

A successful Metro bundle is a packaging check. It does not replace a signed iPhone build, simulator interaction, device accessibility checks, or App Store review. Apple distribution and optional hosted EAS builds are outside the free web deployment pipeline.
