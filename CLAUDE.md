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
- Two apps live here. `mobile/` is **whydrop**; `ago/` is **Ago**, a second,
  much smaller app (how long since you last did something). They share the design
  system by copy, not by package: `src/components/ui.tsx`, `src/theme/tokens.ts`
  and the Tailwind config are the same files in both. Change one and decide
  whether the other needs it too; nothing syncs on its own.
- `mobile/` is the Expo app. `api/` is two Vercel functions, and they exist for
  one reason: the OAuth code exchange needs the app secret, which cannot ship in
  a bundle. Everything else the app asks Instagram for itself, refresh included
  (`refresh_access_token` takes no secret).

## UI rules (mobile/src, ago/src)
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
- A coloured tile in a settings row carries a white glyph, so its fill has to be
  dark enough for one: cyan and the other light accents give about 1.4:1 and the
  icon disappears. Indigo `#5468F0` and grey `#636366` are the safe fills, with
  `danger` for destructive rows. Cyan stays where it is text or a mark on a dark
  surface, never a background under white.
- Icons: lucide-react-native, 1.5px stroke (`absoluteStrokeWidth`) in small
  round buttons, even sizes so they sit dead centre. lucide dropped its brand
  icons, so the Instagram mark is our own `InstagramGlyph`.
- **Never draw an icon by hand.** Take the geometry from lucide, even outside
  the app: in Figma, in a web mock-up, anywhere. Hand-drawn ones come out
  subtly wrong and nobody notices until they look broken on a phone. The exact
  paths are in `node_modules/lucide-react-native/dist/esm/icons/<name>.mjs`
  under `__iconData.node`, so there is never a reason to guess them. The only
  exception is a mark lucide does not carry at all, like the Instagram glyph.
- Tab bar: the system iOS tabs (`expo-router/unstable-native-tabs`, SF Symbols)
  with a thick dark material and a dark fade (`TabBarFade`) at the bottom of
  each tab screen, so content under the bar doesn't blend into it.
- Modals are bottom sheets (`Sheet`); long forms are full screen. The result
  of a разбор is its own full screen modal route (`src/app/result.tsx`), so the
  form underneath keeps the numbers that were typed into it.
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

## Words
- The thing the app produces is a **разбор**, never a "диагноз": the old word
  promised a doctor's verdict and declined badly. The button says "Узнать
  причину", the tab says "Разбор".
- Text sizes come from six steps: 13 / 15 / 16 / 17 / 18 / 19, plus the display
  figures set in `style`. Don't introduce 14.5 or 12.5 again.

## The diagnosis (mobile/src/lib/diagnose.ts)
- A short ladder of rules, deliberately not a model: the user needs one cause
  and two actions, not a ranked list. Order matters, first match wins.
- A change inside 5% either way is noise and is reported as such, before any
  other rule gets a chance to blame something.
- Thresholds live in that one file. Change them there, never in a screen.

## Instagram (mobile/src/lib/instagram.ts, api/instagram)
- Unified login, i.e. Facebook Login for Business. Meta closed "Instagram API
  with Instagram Login" to new apps partway through this build, so the host is
  `graph.facebook.com` and the login dialog takes a `config_id` instead of a
  `scope`: the permission set lives in the configuration in Meta's dashboard,
  not in our code. Changing permissions means editing that configuration.
- Business and Creator accounts only. Personal accounts have no insights
  through the API at all, which is why typing the numbers in by hand is a first
  class path and not a fallback.
- There is no Facebook Page in this setup, so `/me/accounts` comes back empty
  and `/me` returns nothing useful. The account arrives through
  `/me/assigned_instagram_accounts`; everything else hangs off that id.
- Reach is asked for with `metric_type=total_value`, never as a sum of the
  daily values: a person who looked twice in the period appears in two days,
  so adding days up inflates the number. total_value is what Instagram shows
  in its own Insights, which is what the user compares against.
- The token from a business configuration is a system user token: it does not
  expire and cannot be refreshed, so `expiresAt` 0 means "never" rather than
  "expired". It lives in SecureStore.
- Until App Review passes, only Instagram accounts added as testers in the app
  (and accepted from inside Instagram) can connect.

## Ago (ago/)
- No tab bar. Ago is one screen, and everything else hangs off its corners the
  way Mononote does it: the profile pill top left, search and a "..." menu top
  right, and a floating row at the bottom with the view switcher on the left,
  the add button in the middle and the archive on the right. The "..." holds
  Архив and Настройки, so the two former tabs became menu items and the list
  got the whole screen back.
- Profiles are the paid thing. One profile is free and unnamed work the app
  never asks about; several of them (личное, работа, дом, each with its own
  list) is what Ago PRO sells, together with the unlimited list, the widget and
  the alternate icon. The profile menu shows the locked rows rather than hiding
  them, so the offer is visible without a single upsell screen in the way.
- Every screen is built on auto-layout, in Figma and in the app: rows, cards and
  the screen itself. Nothing is positioned by hand except a popover, which is
  absolute by nature. That is what keeps the spacing honest.
- The app keeps every mark, not just the last date, and reads the habit off
  them: the median gap over at least three marks. Median, not mean, so one
  skipped year does not rewrite what "usually" means. A hand-set interval always
  wins over the guessed one.
- The one reward the app allows itself is the counter running down to zero when
  you mark something (`components/Counter.tsx`). Nothing else celebrates, and
  nothing nags. No glow behind text: a text shadow under a big figure reads as
  dirt around it, not as light. Colour alone marks what is overdue.
- A due date written into the title ("Меняла линзы раз в месяц") is taken out of
  it on save: the person already said it, asking them to repeat it with a chip
  is a wasted step.
- No push notifications, deliberately. A "time to change your lenses" push is
  exactly the nagging the app exists to avoid; the widget is the on-brand answer,
  because the person looks at it rather than being interrupted.
- The widget lives in `targets/widget/` and gets dates, not day counts: it
  refreshes on its own timeline, so a precomputed number would freeze at the day
  the app was last opened. `src/lib/widget.ts` writes the top three into the app
  group from `write()`, the one place the list ever changes.
- The backup is text, not a file: `exportBackup` hands the whole list to the
  share sheet and `parseBackup` takes it back from a paste. It needs no native
  module, and until there is a cloud it is the only thing standing between a
  lost phone and years of history.
- It is not a habit tracker and must never nag. It answers a question the person
  already has, which is why there are no goals, no streaks and no guilt.

## Streak and analytics
- The streak is computed from history (`mobile/src/lib/streak.ts`), never
  stored: a stored counter drifts from what the person actually did and a
  cleared history would leave it lying. A week counts if any разбор falls in
  it, and the current week never breaks the streak while it is still running.
- Analytics asks Instagram for each number separately and lets each one fail on
  its own, because the breakdowns are the part of the Graph API most likely to
  come back empty. Who unfollowed is impossible: Instagram gives that list to
  nobody, and the screen says so rather than pretending.

## Later (agreed, not started)
- A weekly reminder. It needs `expo-notifications`, which is a native module and
  a new dev build, so it is not in yet.
- Swipe to delete in the history. It needs `react-native-gesture-handler`, also
  a native module; for now a tap opens the разбор and a long press deletes it,
  with an undo in the toast.
- Light theme and the "auto" setting. The prototype had a theme switcher; the
  app is dark only for now and the setting is not shown rather than shown dead.
- Ago PRO, the paywall. Drawn in Figma ("6 Ago PRO" in the Ago section) and
  agreed, but deliberately not in 1.0.0: it ships no earlier than 1.0.1, so
  nothing in the app may link to it or gate a feature behind it yet. The four
  things it sells are the unlimited list, the widget, the alternate app icon
  and plain support; a one-off price, no subscription.

## Ago's mascot and art
- Ago has a character: a white doodle cat holding a clock, thick black outline,
  on a lime tile. It is the app icon, and the square is the icon: no rounded
  corners in the artwork, because iOS applies its own mask. The logo lives in
  the Figma file; the vector redraw sits next to it in the "Ago / Иконка"
  section.
- The screens carry two illustrated banners in that same hand: a bathroom shelf
  on the пункт screen and a roadside scene on Итоги. They are colourful, with
  flat fills inside a heavy outline, and their top edge is pure black so they
  butt against the page with no seam. The bottom edge is never a hard cut: a
  gradient from transparent to the page black runs over the lower half, so the
  art dissolves into the screen. Fit the art by padding it with black at the
  sides, not by cropping it: the background is black anyway, and cropping eats
  the top of the drawing.
- Generate art from the reference, never from a description of it. Attach the
  mascot (and the scene reference where there is one) to the request, and say
  only what changes. Describing the style in words gives something that merely
  resembles it, and the cat comes back different every time.

## Ago's look (Mononote, not whydrop)
- Ago does not inherit whydrop's look, only its tokens and its icon rules. The
  reference is Mononote: a pure black page and solid, opaque surfaces on it.
  Cards are `#1C1C1E`, fields and chips `#2C2C2E`, round buttons `#343436`,
  radius 22, no stroke. We tried translucent glass here and it was wrong: on a
  flat black page there is nothing behind a surface to refract, so the effect
  only greys the card down and makes it look dirty.
- Glass belongs to the floating navigation layer and nowhere else: the profile
  pill, the action pills, the round nav buttons, the bottom row, and the system
  context menu, which is material because iOS makes it material. It never goes
  on a card, a field or a chip. That is Apple's own rule, and it is also why
  glass looks dirty on content: a card has the flat page behind it and nothing
  to refract, while a floating control has the list sliding under it.
- Settings and most lists are grouped cards of 56pt rows: a plain white lucide
  glyph at 22, the label at 17, the value in grey, a chevron at the right, and
  a hairline (white 10%) between rows inset to the label. No coloured tiles
  here: that is a whydrop pattern, and Mononote's plain glyphs read calmer.
- The menus are the system's, not ours. A dropdown is an iOS context menu and
  is drawn as one: 250 wide, radius 14, rows of 44 with the label left at 17
  and the SF-style symbol on the right, hairline separators across the full
  width with no inset, and the background dimmed behind it. A disabled row is
  the whole row at 40% with a lock on the right, which is how iOS says locked;
  no caption underneath explaining it. Nothing in a menu is ours to invent:
  if iOS does it differently, iOS wins.
- Hints belong to Настройки and nowhere else: 15, `#8E8E93`, under the group
  they explain, one line where it can be. The content screens carry none. A
  line under a list telling you to long-press to delete is the interface
  apologising for itself; if a gesture needs a caption it needs a redesign.
- Lime stays the one colour on the screen: the primary button, the selected
  chip, a count that has run over. Everything else is white or grey.
- The whole set lives in the "Ago" section of the Figma file
  (`OKdtUU26JvHlAdwENH2gwZ`), ten screens, built from the same lucide icon
  components as the app.
