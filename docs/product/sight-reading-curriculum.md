# SightPlay sight-reading curriculum

## Purpose

SightPlay trains the conversion from notation to keyboard action. It is not a complete piano method
and should not pretend that pitch accuracy alone proves rhythm, technique, or musical expression.
The curriculum therefore publishes the whole learning map while marking each lesson according to
what the practice engine can actually present and assess.

## Evidence used

The structure synthesizes public descriptions and syllabuses; it does not reproduce proprietary
lesson text or repertoire.

- [Faber Piano Adventures](https://pianoadventures.com/piano-books/basic-piano-adventures/) uses a
  multi-level curriculum with coordinated lesson, theory, technique, performance, and sight-reading
  work. Its published reading approach combines individual note landmarks, interval reading, and
  multi-key understanding rather than relying on fixed hand positions.
- [Alfred's Basic Piano Library](https://www.alfred.com/pages/the-four-courses-of-alfreds-basic-piano-library)
  progresses through interval recognition and offers different pacing paths, with coordinated
  theory, technique, solo, ear-training, and sight-reading material.
- [Piano Safari](https://www.pianosafari.com/resources/repertoire-book-1) deliberately separates a
  slow reading sequence from faster-developing playing skills. Its public materials introduce
  intervals in concentrated units and use fresh sight-reading cards to prevent memorized execution
  from replacing reading.
- [Suzuki Association of the Americas](https://suzukiassociation.org/about/about-the-suzuki-method/)
  foregrounds listening, imitation, musical expression, and technical ability before notation.
  SightPlay keeps aural and playing skills as related tracks instead of treating score reading as
  the whole of musicianship.
- [ABRSM Piano Practical Grades 2025–2026](https://www.abrsm.org/sites/default/files/2024-06/Piano%202025%20%26%202026%20Prac%20syllabus%2020240524_access.pdf)
  grows unseen reading cumulatively from separate five-finger positions to hands together, chords,
  wider meters, articulation, dynamics, pedal, and tempo changes.
- [RCM Piano Syllabus 2022](https://teacherportal.rcmusic.com/Resources/Syllabus-Piano) treats
  repertoire, technical requirements, ear tests, rhythm reading, and sight playing as separate but
  coordinated requirements. Its earliest sight playing uses short, stepwise, one-hand melodies
  before divided-hand grand-staff work.
- Waters, Townsend, and Underwood found that rapid recall of musical patterns correlated strongly
  with pianist sight-reading skill: [British Journal of Psychology, 1998](https://doi.org/10.1111/j.2044-8295.1998.tb02676.x).
- Carter and Grahn found qualified benefits for interleaved over blocked music practice, while also
  noting a small advanced-musician sample: [Frontiers in Psychology, 2016](https://doi.org/10.3389/fpsyg.2016.01251).

These sources support a progressive start, pattern-based reading, daily novel material, and multiple
parallel skill tracks. They do not justify pure randomness for beginners or the claim that one fixed
familiar melody measures transfer.

## Course architecture

The roadmap is a spine with parallel capability tracks, not a single difficulty number.

| Module                     | Learning purpose                                                              | Current state                                                       |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Keyboard & landmarks       | Keyboard geography, staff anchors, and melodic direction                      | Landmark and direction lessons available; pre-staff lessons planned |
| Intervals & contour        | Steps, thirds, wider intervals, mixed phrases, and range                      | 8 pitch-reading lessons available; ledger-line lesson planned       |
| Grand staff & coordination | Clef changes, hands together, and independent voices                          | Planned                                                             |
| Rhythm & pulse             | Pulse, values, rests, subdivision, meter, ties, and syncopation               | Planned                                                             |
| Keys, melody & harmony     | Familiar variation, tonal patterns, keys, chords, and transposition           | 2 pitch-pattern lessons available; remaining lessons planned        |
| Technique & expression     | Fingering, articulation, dynamics, phrasing, and pedal                        | Planned                                                             |
| First-sight fluency        | Preview, novel reading, continuity, recovery, adaptive review, and repertoire | Novel pitch mix available; remaining lessons planned                |

Every module contains chapters, and every chapter contains ordered lessons with stable IDs. The
catalog in `packages/practice/src/model/curriculum.ts` is the executable source of truth for lesson
order, status, and required engine capabilities. Localized titles and descriptions live in `i18n/`.

## Status contract

- **Available** means the app generates the exercise, renders the relevant notation, accepts the
  intended input, and scores the lesson's stated skill.
- **Planned** means the pedagogical place is defined but one or more named capabilities are missing.
  The roadmap shows those capabilities and does not start the lesson.
- A renderer feature alone is insufficient. For example, drawing a hollow notehead does not make a
  duration lesson available when spacing is index-based and a correct pitch advances immediately.

All currently available lessons use quarter notes. Their measured target is pitch reading, not note
duration. This constraint should be removed only when beat-proportional layout and onset/hold/rest
scoring are both implemented.

## Lesson session design

Available lessons use four roles:

1. **Warm-up** establishes a small anchor set.
2. **Guided phrase** practices connected, constrained material rather than independent random notes.
3. **Familiar variation** provides tonal predictability without fixing a single note sequence.
4. **First-sight check** generates a distinct phrase and reports its first-attempt accuracy separately.

This is a scaffolding-to-transfer sequence, not a mastery model. Durable mastery, spaced review,
unlocking, and cross-session adaptation remain planned until learner progress is stored.

## Capability backlog and release order

1. **Rhythm engine:** beat-proportional horizontal layout, metronome/clock contract, onset and hold
   windows, rest handling, ties, and rhythm-specific scoring. This unlocks the full rhythm module and
   continuous reading.
2. **Grand-staff model:** clef per frame/voice, stable two-staff layout, chord and polyphonic matching.
3. **Notation semantics:** key signatures, accidental state, fingering, articulation, dynamics, and
   pedal markings paired with corresponding input contracts.
4. **Learning state:** durable attempts by skill, mastery estimates, spaced review, prerequisites, and
   adaptive assignment. Do not infer mastery from one completion percentage.
5. **Repertoire path:** licensed or public-domain levelled pieces with provenance and a separate
   first-sight attempt from later repertoire practice.

## Product guardrails

- Familiarity may scaffold prediction, but the transfer score must come from unseen material.
- Do not bind a staff note permanently to a finger or fixed hand position; vary starts and fingering
  once fingering is supported.
- Increase one major dimension at a time early on: pitch set, interval width, clef/hand, rhythm,
  texture, or tempo.
- Mix learned patterns after blocked introduction; do not maximize contextual interference before a
  beginner has a stable representation to retrieve.
- Keep pitch, rhythm, continuity, technique, and expression as distinct evidence. A composite score
  may summarize them later but must not erase which capability failed.
