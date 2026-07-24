import { SignTarget, SignLanguageSystem } from '../types';

export const ASL_SIGNS: SignTarget[] = [
  {
    id: 'A',
    label: 'Letter A',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Make a firm fist with fingers curled into palm and thumb resting flat along the outer side of index finger.',
    steps: [
      'Step 1: Raise your dominant hand facing forward towards the camera.',
      'Step 2: Curl all four fingers down firmly into a tight fist.',
      'Step 3: Rest your thumb straight against the outer side of your index finger.'
    ],
    keyTips: [
      'Curl all four fingers down tight into your palm.',
      'Place your thumb straight against the side of your index finger.',
      'Keep palm facing forward.'
    ],
    visualHint: '✊ Fist with thumb resting vertically against the side of index finger.',
    handShapeDescription: 'Fist with thumb resting vertically along the outer side of index finger.',
    handShapeIllustrationType: 'fist_thumb_side'
  },
  {
    id: 'B',
    label: 'Letter B',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Hold four fingers straight up together with your thumb tucked smoothly across your lower palm.',
    steps: [
      'Step 1: Open your palm flat with all four fingers extended straight up.',
      'Step 2: Press index, middle, ring, and pinky fingers tightly together.',
      'Step 3: Fold your thumb flat across the lower palm.'
    ],
    keyTips: [
      'Press index, middle, ring, and pinky fingers together.',
      'Fold thumb flat across the lower palm.',
      'Hold hand flat facing the viewer.'
    ],
    visualHint: '🖐️ Flat open hand with thumb crossed over palm.',
    handShapeDescription: 'Open flat palm with four extended fingers together and thumb folded across palm.',
    handShapeIllustrationType: 'open_palm_thumb_in'
  },
  {
    id: 'C',
    label: 'Letter C',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Curve your fingers and thumb smoothly to form a physical arc matching the shape of the letter C.',
    steps: [
      'Step 1: Hold hand up sideways or facing slightly inward.',
      'Step 2: Bend four fingers together into a smooth crescent curve.',
      'Step 3: Align thumb opposite fingertips to complete the C arch.'
    ],
    keyTips: [
      'Keep fingers slightly parted and gently curved.',
      'Oppose thumb to fingertips to make an arch.',
      'View from the side or slightly angled.'
    ],
    visualHint: '🤏 Hand curved like a half-circle C.',
    handShapeDescription: 'Curved fingers and thumb forming a clear arc resembling the letter C.',
    handShapeIllustrationType: 'c_curve'
  },
  {
    id: 'D',
    label: 'Letter D',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Point your index finger straight up while your thumb touches the tips of middle, ring, and pinky fingers.',
    steps: [
      'Step 1: Raise index finger straight toward the sky.',
      'Step 2: Bend middle, ring, and pinky fingers down.',
      'Step 3: Touch thumb pad to the tips of bent fingers forming a circle below index.'
    ],
    keyTips: [
      'Index finger pointing directly up.',
      'Middle, ring, pinky fingers form a circle with thumb.',
      'Looks like a lowercase "d".'
    ],
    visualHint: '☝️ Index pointing up with a rounded loop below.',
    handShapeDescription: 'Extended vertical index finger with thumb touching tips of middle, ring, and pinky fingers.',
    handShapeIllustrationType: 'pointing_loop'
  },
  {
    id: 'E',
    label: 'Letter E',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Medium',
    description: 'Curl all four fingers down into your palm with thumb folded beneath the fingertips.',
    steps: [
      'Step 1: Hold palm facing forward.',
      'Step 2: Bend all four fingers down at the middle knuckle.',
      'Step 3: Tuck thumb underneath the bent fingertips.'
    ],
    keyTips: [
      'Fingertips bend down touching the thumb.',
      'Thumb tucks beneath the bent fingers.',
      'Compact claw-like fist.'
    ],
    visualHint: '✊ Tight bent fingers sitting on top of folded thumb.',
    handShapeDescription: 'Fingers curled inward towards palm with thumb tucked underneath the fingertips.',
    handShapeIllustrationType: 'claw_e'
  },
  {
    id: 'F',
    label: 'Letter F',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Medium',
    description: 'Touch the tip of your index finger to your thumb to form an "OK" circle, with remaining 3 fingers extended.',
    steps: [
      'Step 1: Form a smooth circle by touching index finger tip to thumb tip.',
      'Step 2: Fan out middle, ring, and pinky fingers straight up.',
      'Step 3: Face palm forward to reveal the open circle.'
    ],
    keyTips: [
      'Form a neat circle with index and thumb.',
      'Spread middle, ring, and pinky fingers straight up.',
      'Palm facing front.'
    ],
    visualHint: '👌 OK sign with 3 fingers fan-spread upwards.',
    handShapeDescription: 'Index finger and thumb touching to form a circle with middle, ring, and pinky fingers extended upward.',
    handShapeIllustrationType: 'ok_sign'
  },
  {
    id: 'G',
    label: 'Letter G',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Medium',
    description: 'Extend index finger and thumb horizontally sideways parallel to each other like a pinch.',
    steps: [
      'Step 1: Turn hand sideways so palm faces your body.',
      'Step 2: Point index finger horizontally outward.',
      'Step 3: Extend thumb parallel to index finger with a small gap.'
    ],
    keyTips: [
      'Index finger extended horizontally.',
      'Thumb parallel to index finger leaving a small gap.',
      'Ring, middle, and pinky tucked into palm.'
    ],
    visualHint: '👉 Horizontal pinch with index finger and thumb.',
    handShapeDescription: 'Index finger and thumb extended parallel pointing sideways with other fingers closed.',
    handShapeIllustrationType: 'horizontal_pinch'
  },
  {
    id: 'I',
    label: 'Letter I',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Extend your pinky finger straight up while keeping other fingers tucked into a fist with thumb across.',
    steps: [
      'Step 1: Close hand into a tight fist.',
      'Step 2: Extend pinky finger straight upward.',
      'Step 3: Keep thumb crossed across closed fingers.'
    ],
    keyTips: [
      'Pinky finger pointing straight up.',
      'Fist closed with thumb resting over middle fingers.',
      'Palm facing forward.'
    ],
    visualHint: '🤙 Pinky finger extended high with fist closed.',
    handShapeDescription: 'Closed fist with pinky finger extended straight upward.',
    handShapeIllustrationType: 'pinky_up'
  },
  {
    id: 'L',
    label: 'Letter L',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Extend your index finger straight up and thumb outward to form an "L" shape.',
    steps: [
      'Step 1: Raise index finger straight up 90 degrees.',
      'Step 2: Extend thumb horizontally 90 degrees outward.',
      'Step 3: Fold middle, ring, and pinky fingers firmly into palm.'
    ],
    keyTips: [
      'Index finger pointing 90 degrees up.',
      'Thumb pointing 90 degrees horizontally.',
      'Middle, ring, and pinky curled into palm.'
    ],
    visualHint: '👆 Perfect L-shape with thumb and index finger.',
    handShapeDescription: 'Index finger pointing straight up and thumb extended sideways forming an L angle.',
    handShapeIllustrationType: 'l_shape'
  },
  {
    id: 'O',
    label: 'Letter O',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Touch all four fingertips to the tip of your thumb, creating a full O circle.',
    steps: [
      'Step 1: Curve all fingers down together in an arch.',
      'Step 2: Touch the tips of all four fingers to thumb pad.',
      'Step 3: Keep the central opening circular and visible.'
    ],
    keyTips: [
      'All fingers curved down together.',
      'Touch thumb pad to all fingertips.',
      'Keep hole visible.'
    ],
    visualHint: '⭕ Hand closed into a circle like a telescope eye.',
    handShapeDescription: 'All fingertips touching the thumb tip to form a clear oval/circle.',
    handShapeIllustrationType: 'circle_o'
  },
  {
    id: 'V',
    label: 'Letter V',
    system: 'ASL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Extend index and middle fingers in a V victory shape while tucking ring and pinky with thumb.',
    steps: [
      'Step 1: Extend index and middle fingers straight up.',
      'Step 2: Separate index and middle fingers into a V angle.',
      'Step 3: Fold ring and pinky fingers down pinned by thumb.'
    ],
    keyTips: [
      'Spread index and middle fingers in a V.',
      'Fold ring and pinky fingers down.',
      'Thumb holds ring finger down.'
    ],
    visualHint: '✌️ Peace or V sign extended high.',
    handShapeDescription: 'Index and middle fingers extended upward in a V shape with other fingers folded.',
    handShapeIllustrationType: 'v_shape'
  },
  {
    id: 'HELLO',
    label: 'Sign "Hello"',
    system: 'ASL',
    category: 'Phrases',
    difficulty: 'Easy',
    description: 'Place open hand near temple/forehead with palm out, moving outward in a friendly wave/salute gesture.',
    steps: [
      'Step 1: Raise open flat hand near temple with palm facing forward.',
      'Step 2: Move hand outward away from head in a graceful salute.',
      'Step 3: Smile and maintain eye contact with camera.'
    ],
    keyTips: [
      'Flat open hand near side of forehead.',
      'Move hand outward slightly in a salute motion.',
      'Smile and look friendly!'
    ],
    visualHint: '👋 Open palm salute moving away from head.',
    handShapeDescription: 'Open flat hand placed near side of forehead moving smoothly outward in a salute motion.',
    handShapeIllustrationType: 'open_palm'
  },
  {
    id: 'THANK_YOU',
    label: 'Sign "Thank You"',
    system: 'ASL',
    category: 'Phrases',
    difficulty: 'Easy',
    description: 'Touch fingertips of open hand to chin or lips, then bring hand outward toward the recipient.',
    steps: [
      'Step 1: Touch fingertips of open palm to your chin.',
      'Step 2: Extend hand forward and slightly down toward camera.',
      'Step 3: Keep palm facing upward as hand moves outward.'
    ],
    keyTips: [
      'Start with open palm fingertips touching chin/lips.',
      'Move hand outward and slightly down toward partner.',
      'Palm faces upward/forward as hand extends.'
    ],
    visualHint: '🙏 Fingertips at chin reaching outward in gratitude.',
    handShapeDescription: 'Flat hand starting with fingertips touching chin/lips, extending forward toward viewer.',
    handShapeIllustrationType: 'chin_touch_out'
  },
  {
    id: 'I_LOVE_YOU',
    label: 'Sign "I Love You"',
    system: 'ASL',
    category: 'Phrases',
    difficulty: 'Easy',
    description: 'Extend thumb, index finger, and pinky finger simultaneously while keeping middle and ring fingers down.',
    steps: [
      'Step 1: Raise thumb, index finger, and pinky finger high.',
      'Step 2: Curl middle finger and ring finger into palm.',
      'Step 3: Face palm forward to combine I, L, and Y!'
    ],
    keyTips: [
      'Combines letters I, L, and Y!',
      'Thumb, index, and pinky out.',
      'Middle and ring fingers folded down.'
    ],
    visualHint: '🤟 Rock/Love sign with thumb extended out.',
    handShapeDescription: 'Thumb, index finger, and pinky finger extended outward with middle and ring fingers tucked into palm.',
    handShapeIllustrationType: 'i_love_you'
  }
];

export const BSL_SIGNS: SignTarget[] = [
  {
    id: 'BSL_A',
    label: 'Letter A (BSL)',
    system: 'BSL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Touch the tip of your non-dominant hand thumb with the tip of your dominant index finger.',
    steps: [
      'Step 1: Lay non-dominant hand flat facing up with fingers & thumb spread.',
      'Step 2: Point dominant index finger downwards.',
      'Step 3: Touch index tip directly onto the non-dominant thumb tip.'
    ],
    keyTips: [
      'Non-dominant hand represents the 5 vowels on 5 fingertips!',
      'Thumb tip = Letter A.',
      'Keep both hands clearly visible.'
    ],
    visualHint: '👉 Touch thumb tip of non-dominant hand.',
    handShapeDescription: 'Dominant index finger touching non-dominant thumb tip.',
    handShapeIllustrationType: 'bsl_a'
  },
  {
    id: 'BSL_B',
    label: 'Letter B (BSL)',
    system: 'BSL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Join the curved fingers and thumbs of both hands together to form two hollow circles (spectacles/8 shape).',
    steps: [
      'Step 1: Curve fingers and thumbs on both hands into arches.',
      'Step 2: Touch index tips and thumb tips of both hands together.',
      'Step 3: Form a double loop / number 8 shape in front of chest.'
    ],
    keyTips: [
      'Both hands join together in front.',
      'Creates two circles stacked or side-by-side.',
      'Looks like binoculars or letter B.'
    ],
    visualHint: '👓 Both hands touching forming two circles.',
    handShapeDescription: 'Both hands touching curved fingers and thumbs together to form double loops.',
    handShapeIllustrationType: 'bsl_b'
  },
  {
    id: 'BSL_C',
    label: 'Letter C (BSL)',
    system: 'BSL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Curve your dominant index finger and thumb into a clear C arc, holding it up in front of chest.',
    steps: [
      'Step 1: Raise dominant hand facing sideways.',
      'Step 2: Curve index finger and thumb into a distinct C crescent.',
      'Step 3: Keep other fingers tucked into palm.'
    ],
    keyTips: [
      'Distinct single-hand arc in BSL.',
      'Clear profile view of the C curve.',
      'Keep palm angled to show curve.'
    ],
    visualHint: '🤏 Crescent arch with dominant index & thumb.',
    handShapeDescription: 'Dominant index and thumb curved in a C shape with other fingers closed.',
    handShapeIllustrationType: 'c_curve'
  },
  {
    id: 'BSL_D',
    label: 'Letter D (BSL)',
    system: 'BSL',
    category: 'Alphabet',
    difficulty: 'Medium',
    description: 'Point non-dominant index finger up, and form a curved loop with dominant index and thumb touching it.',
    steps: [
      'Step 1: Point non-dominant index finger straight up.',
      'Step 2: Curve dominant index finger and thumb into a arch.',
      'Step 3: Touch dominant index tip to top of non-dominant finger, and thumb to base.'
    ],
    keyTips: [
      'Non-dominant index forms vertical stem.',
      'Dominant hand forms the rounded belly of the D.',
      'Forms a full 3D capital letter D.'
    ],
    visualHint: '☝️ Non-dominant vertical finger + dominant arc.',
    handShapeDescription: 'Vertical non-dominant index finger met by dominant arched index finger & thumb.',
    handShapeIllustrationType: 'bsl_d'
  },
  {
    id: 'BSL_E',
    label: 'Letter E (BSL)',
    system: 'BSL',
    category: 'Alphabet',
    difficulty: 'Easy',
    description: 'Touch the tip of your non-dominant index finger with your dominant index finger.',
    steps: [
      'Step 1: Hold non-dominant hand open with fingers spread.',
      'Step 2: Point dominant index finger.',
      'Step 3: Tap directly on non-dominant index fingertip (Vowel 2 = E).'
    ],
    keyTips: [
      'Index tip = Letter E in BSL vowel order!',
      'Vowels: Thumb (A), Index (E), Middle (I), Ring (O), Pinky (U).',
      'Keep tap deliberate and clean.'
    ],
    visualHint: '👉 Touch non-dominant index finger tip.',
    handShapeDescription: 'Dominant index finger touching non-dominant index fingertip.',
    handShapeIllustrationType: 'bsl_e'
  },
  {
    id: 'BSL_HELLO',
    label: 'Sign "Hello" (BSL)',
    system: 'BSL',
    category: 'Phrases',
    difficulty: 'Easy',
    description: 'Raise dominant hand in an open flat palm gesture with a gentle side-to-side wave motion.',
    steps: [
      'Step 1: Raise open flat hand to chest level facing forward.',
      'Step 2: Wave hand smoothly from side to side twice.',
      'Step 3: Smile broadly and make friendly eye contact.'
    ],
    keyTips: [
      'Clear, friendly side wave.',
      'Keep palm facing forward toward viewer.',
      'Relaxed shoulder stance.'
    ],
    visualHint: '👋 Open palm side-to-side friendly wave.',
    handShapeDescription: 'Open flat hand waving gently from side to side.',
    handShapeIllustrationType: 'open_palm'
  },
  {
    id: 'BSL_THANK_YOU',
    label: 'Sign "Thank You" (BSL)',
    system: 'BSL',
    category: 'Phrases',
    difficulty: 'Easy',
    description: 'Touch fingertips of dominant flat hand to your chin, then move hand forward towards recipient.',
    steps: [
      'Step 1: Touch fingertips of flat dominant hand to your chin.',
      'Step 2: Move hand outward towards the camera.',
      'Step 3: End with palm facing slightly upward.'
    ],
    keyTips: [
      'Identical core motion to ASL thank you!',
      'Graceful chin-to-viewer motion.',
      'Nod head slightly in appreciation.'
    ],
    visualHint: '🙏 Fingertips touch chin moving outward.',
    handShapeDescription: 'Flat hand touching chin and moving forward toward viewer.',
    handShapeIllustrationType: 'chin_touch_out'
  }
];

export const ALL_SIGNS: SignTarget[] = [...ASL_SIGNS, ...BSL_SIGNS];

export function getSignTargets(system: SignLanguageSystem): SignTarget[] {
  return ALL_SIGNS.filter((sign) => sign.system === system);
}
