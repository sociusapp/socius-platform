# ES Flow Animation Guide (Socius Mobile)

## Goals
- Fast, calm micro-interactions (<= 300ms)
- 60 FPS UI-thread animations (Reanimated entering/exiting)
- Respect reduced motion (`prefers-reduced-motion` on web, Reduce Motion on iOS/Android)
- No layout jumps during loading (skeletons instead of spinners wherever possible)

## Building Blocks
- Motion wrapper: [MotionView.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/components/common/MotionView.js)
  - Use `preset="fadeUp"` for most cards/sections
  - Keep `duration` 220–280ms, `delay` <= 140ms (small stagger)
- Reduced motion hook: [motion.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/utils/motion.js)
- Skeletons respect reduced motion: [Skeleton.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/components/common/Skeleton.js)
- Button micro-interactions: pressed/hover feedback in [Button.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/components/common/Button.js)
- Alert animation respects reduced motion: [CustomAlert.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/components/common/CustomAlert.js)

## Screen-level Recommendations (ES Flow)

### Help Type
- Enter: title `fadeUp (220ms)`, search `fadeUp (220ms, 50ms delay)`, grid `fadeUp (220ms, 80ms delay)`, info note `fadeUp (220ms, 110ms delay)`
- Action bar: keep static (already clear CTA)
- Implemented in: [HelpTypeScreen.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/screens/DailyHelp/UserDailyHelpRequest/HelpTypeScreen.js)

### Review Request
- Enter: title `fadeUp`, request card `fadeUp (50ms delay)`, buttons `fadeUp (90ms delay)`
- Loading: avoid hiding the whole screen; use skeleton blocks (already used elsewhere)
- Implemented in: [ReviewRequestScreen.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/screens/DailyHelp/UserDailyHelpRequest/ReviewRequestScreen.js)

### Cancel Request
- Enter: hero card `fadeUp`, info line `fadeUp (40ms delay)`, reasons list `fadeUp (70ms delay)`, CTAs `fadeUp (110–140ms delay)`
- Micro-interaction: keep press feedback via Button; list options use clear selected indicator
- Implemented in: [CancelRequestScreen.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/screens/DailyHelp/UserDailyHelpRequest/CancelRequestScreen.js)

### Community Balance Nudge
- Enter: hero card, explainer, CTAs with stagger
- Implemented in: [CommunityBalanceNudgeScreen.js](file:///Users/momtajhusen/Desktop/Socius/socius-mobile/src/screens/DailyHelp/UserDailyHelpRequest/CommunityBalanceNudgeScreen.js)

## Reduced Motion Policy
- If reduced motion is enabled:
  - Disable non-essential entrance/exit animations
  - Disable pulsing skeleton opacity animation
  - Keep UI stable and readable (no shaking/looping)

## Suggested A/B Testing Plan
- Variant A: entrance animations ON (default)
- Variant B: entrance animations OFF (still keep skeletons)
- Metrics (client-side):
  - Time-to-first-action (tap on primary CTA)
  - Request completion funnel drop-off (HelpType → Review → Share)
  - Cancellation rate after entering RequestActive
- Performance:
  - Track screen mount → first interaction timestamps
  - Track frame drops (Android: systrace / Perfetto during QA)

