# whydrop

Diagnoses a drop in Instagram reach: one cause and two things to do. Grew out
of Wishpool's iOS app, which is where the component library and most of the
rules below come from.

## Talking to the user
- Reply in Russian, always using masculine forms for yourself ("сделал", "понял").
- Don't push to `main` on your own: commit to the work branch and ship to `main`
  only when the user says "в прод".

## Deploys
- Vercel Hobby allows 100 deploys a day, and every push to `main` is one.
  Batch changes into a single push instead of pushing fix after fix, and
  remember env vars only reach a deployment that was built after they were
  set, so adding one means a rebuild.
- Files under `api/` whose name starts with `_` are not routed: Vercel treats
  them as helper modules. That is why `_config.js` is shared and why an
  endpoint must never be named that way.

## Layout
- `mobile/` is the Expo app. `api/` is two Vercel functions, and they exist for
  one reason: the OAuth code exchange needs the app secret, which cannot ship in
  a bundle. Everything else the app asks Instagram for itself, refresh included
  (`refresh_access_token` takes no secret).

## UI rules (mobile/src)
- Font: the iOS system font SF Pro, weights 500-800 only. Never Regular (400);
  `font-m500`..`font-m800` are the class names.
- Buttons and controls come in exactly two heights: `H.lg` (52) and `H.sm` (40).
- Spacing comes from a 4 / 8 / 12 / 16 / 24 / 32 scale.
- Colours: lime `#C8FF4A` is the action colour and text on it is near black
  (`onLime`); cyan `#3DF2EE` is the accent (tags, the numbered steps); cards
  (`card` `#1C1C1E`) sit on a near black page (`bg` `#0B0B0C`), inputs and the
  secondary button share `card2`. A fall is `danger`, a rise is `ok`.
- No outlines on blocks (cards, sheets, icon tiles). A field outlines in red
  only while it holds an error.
- Icons: lucide-react-native, 1.5px stroke (`absoluteStrokeWidth`) in small
  round buttons, even sizes so they sit dead centre. lucide dropped its brand
  icons, so the Instagram mark is our own `InstagramGlyph`.
- Tab bar: the system iOS tabs (`expo-router/unstable-native-tabs`, SF Symbols)
  with a thick dark material and a dark fade (`TabBarFade`) at the bottom of
  each tab screen, so content under the bar doesn't blend into it.
- Modals are bottom sheets (`Sheet`); long forms are full screen.
- Toasts: dark pill from the top with a filled round icon.
- Empty states: centred in the free space, the same gap from the tile to the
  text as from the text to the button, the sub close under the title.
- Motion: no bounce on things appearing; springs are fine for presses and for
  the segmented control, which stretches like the iOS tab bar selection.
- Never put `className` on Reanimated views (`Animated.View`): NativeWind
  doesn't style them on device. Animated views get plain `style`; for press
  springs use `Press`.
- No em/en dashes in UI copy, and no "(optional)" on labels.
- Don't gender the user in UI copy: the app is for whoever installs it.

## The diagnosis (mobile/src/lib/diagnose.ts)
- A short ladder of rules, deliberately not a model: the user needs one cause
  and two actions, not a ranked list. Order matters, first match wins.
- A change inside 5% either way is noise and is reported as such, before any
  other rule gets a chance to blame something.
- Thresholds live in that one file. Change them there, never in a screen.

## Instagram (mobile/src/lib/instagram.ts, api/instagram)
- "Instagram API with Instagram Login": Business and Creator accounts only.
  Personal accounts have no insights through the API at all, which is why
  typing the numbers in by hand is a first class path and not a fallback.
- Scopes: `instagram_business_basic` and `instagram_business_manage_insights`.
  Both need Meta App Review before anyone outside the test users can connect.
- Reach is a daily metric, so a period is the sum of its days. Instagram keeps
  daily insights for about 30 days, so a 30 day period cannot reach far enough
  back for its own comparison; the app asks anyway and shows what comes back.
- The long lived token (60 days) lives in SecureStore and is refreshed when it
  is inside a week of running out.

## Later (agreed, not started)
- Light theme and the "auto" setting. The prototype had a theme switcher; the
  app is dark only for now and the setting is not shown rather than shown dead.
- The moving blurred blobs behind the screens, and the setting that turns them
  off.
- App icon and splash are still Wishpool's artwork.
