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
- Two apps live here. `mobile/` is **whydrop**; `stolet/` is **Сто лет**, a second,
  much smaller app (how long since you last did something). They share the design
  system by copy, not by package: `src/components/ui.tsx`, `src/theme/tokens.ts`
  and the Tailwind config are the same files in both. Change one and decide
  whether the other needs it too; nothing syncs on its own.
- `mobile/` is the Expo app. `api/` is two Vercel functions, and they exist for
  one reason: the OAuth code exchange needs the app secret, which cannot ship in
  a bundle. Everything else the app asks Instagram for itself, refresh included
  (`refresh_access_token` takes no secret).

## UI rules (mobile/src, stolet/src)
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

## Сто лет (stolet/)
- Three tabs on the **system** tab bar, so iOS 26 gives it real Liquid Glass
  instead of an imitation. Glass goes on the floating navigation layer only,
  never on cards: Apple's own guidance, and glass on glass turns to mush.
  Screens paint no background; one `Glow` layer sits under all of them, because
  on flat black there is nothing for glass to refract.
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
- Objects drifting behind the screens, and the setting that turns them off.
  Glossy inflated 3D shapes on the near-black page, slowly floating back and
  forth under the content: a crown, a pair of glasses, several pale blue stars
  and one star that runs green into blue. They sit far enough back that text
  over them still reads; the earlier idea of blurred colour blobs is replaced
  by these.
