/**
 * Revision Atlas - Small Fictional Demo Project
 * Title: "The Glass Clockmaker" (Fictional Mystery / Historical Fiction)
 */
window.PROJECT_PROFILES = window.PROJECT_PROFILES || {};
window.PROJECT_PROFILES['demo'] = {
  "id": "demo-glass-clockmaker",
  "title": "The Glass Clockmaker",
  "author": "Elena Vance",
  "projectType": "Novel",
  "subtitle": "A Fictional Demonstration Project",
  "targetWordCount": 65000,
  "lexicon": {
    "sacredTerms": [
      "The Chronometer",
      "The Obsidian Escapement",
      "Low Tide Watch"
    ],
    "customTerms": [
      "Vernier scale",
      "Arbor",
      "Mainspring",
      "Pendulum drift"
    ],
    "avoidTerms": [
      "Digital",
      "Modern electric"
    ]
  },
  "motifs": [
    {
      "id": "m-brass",
      "name": "Brass & Mechanism",
      "category": "Material",
      "keywords": [
        "brass",
        "gear",
        "escapement",
        "cog",
        "pendulum",
        "ticking",
        "spring"
      ],
      "collocations": [
        "polished brass",
        "clockwork precision",
        "wound the spring"
      ],
      "significance": "Human attempt to regulate chaos and enforce order over unyielding time."
    },
    {
      "id": "m-salt",
      "name": "Salt & Sea Fog",
      "category": "Atmospheric",
      "keywords": [
        "salt",
        "fog",
        "brine",
        "tide",
        "harbor",
        "mist",
        "coastal"
      ],
      "collocations": [
        "salt air",
        "fog rolling in",
        "brine on the glass"
      ],
      "significance": "The corrosive natural environment threatening fragile mechanical precision."
    },
    {
      "id": "m-silence",
      "name": "Sudden Silence",
      "category": "Auditory",
      "keywords": [
        "silence",
        "stillness",
        "stopped",
        "quiet",
        "hush",
        "paused"
      ],
      "collocations": [
        "dead silence",
        "clock stopped",
        "unnatural quiet"
      ],
      "significance": "Ominous disruptions of routine; moments when truth breaks through."
    }
  ],
  "characters": [
    {
      "id": "char-elias",
      "canonicalName": "Elias Thorne",
      "aliases": [
        "The Apprentice",
        "Elias"
      ],
      "role": "Protagonist",
      "archetype": "The Meticulous Observer",
      "firstAppearsChapter": 1,
      "coreRelationships": "Apprentice to Master Corvus; investigating the stopped harbor clock.",
      "sensoryTokens": [
        "brass filings on fingertips",
        "smell of whale oil",
        "magnifying loupe"
      ],
      "readerKnowledgeNotes": "Elias suspects Master Corvus concealed a secondary blueprint inside the tower escapement."
    },
    {
      "id": "char-corvus",
      "canonicalName": "Master Julian Corvus",
      "aliases": [
        "The Master Clockmaker",
        "Corvus"
      ],
      "role": "Mentor / Antagonist",
      "archetype": "The Guardian of Secrets",
      "firstAppearsChapter": 1,
      "coreRelationships": "Master horologist; vanished during the storm of the third neap tide.",
      "sensoryTokens": [
        "stained cuffs",
        "pocket chronometer ticking in pocket",
        "sharp gaze"
      ],
      "readerKnowledgeNotes": "Publicly honored by the harbor guild, privately facing insolvency."
    },
    {
      "id": "char-maren",
      "canonicalName": "Maren Reed",
      "aliases": [
        "The Harbor Archivist",
        "Maren"
      ],
      "role": "Ally",
      "archetype": "The Keeper of Records",
      "firstAppearsChapter": 2,
      "coreRelationships": "Oversees the tidal registry; provides Elias with historical tide logs.",
      "sensoryTokens": [
        "ink stains on palms",
        "damp wool coat",
        "ledger ribbons"
      ],
      "readerKnowledgeNotes": "Knows the harbor depth soundings have been systematically altered for three seasons."
    }
  ],
  "symbolsThemes": [
    {
      "id": "sym-escapement",
      "name": "The Obsidian Escapement",
      "openJobs": "Explores the fragile balance between human ambition and inevitable decay.",
      "whatItDoesNotMean": "Not a supernatural talisman or magical relic; strictly mechanical precision.",
      "linkedMotifs": [
        "Brass & Mechanism"
      ],
      "authorNotes": "The centerpiece clock mechanism in the harbor tower."
    },
    {
      "id": "sym-tide",
      "name": "The Low Tide",
      "openJobs": "The revelation of secrets buried beneath high water.",
      "whatItDoesNotMean": "Not an environmental apocalypse; represents cyclical exposure of truth.",
      "linkedMotifs": [
        "Salt & Sea Fog"
      ],
      "authorNotes": "Recurring moment where the submerged foundations of the harbor become visible."
    }
  ],
  "canon": [
    {
      "id": "canon-1",
      "type": "World Rule",
      "title": "The Great Harbor Clock Dependency",
      "establishedIn": 1,
      "statement": "Every ship entering the narrows relies upon the harbor clock bell for safe pilotage through the granite shoals.",
      "status": "Established Canon"
    },
    {
      "id": "canon-2",
      "type": "Figure Fact",
      "title": "Master Corvus Disappearance",
      "establishedIn": 2,
      "statement": "Julian Corvus disappeared from locked quarters on the night of October 14th without his sea coat or boots.",
      "status": "Established Canon"
    }
  ],
  "sceneModel": {
    "dimensions": [
      {
        "key": "setting",
        "label": "Setting",
        "placeholder": "Where does the scene occur?"
      },
      {
        "key": "time",
        "label": "Time",
        "placeholder": "When (time of day / chronology)?"
      },
      {
        "key": "pov",
        "label": "POV",
        "placeholder": "Point of view character"
      },
      {
        "key": "characters",
        "label": "Characters Present",
        "placeholder": "Who is in the room / scene?"
      },
      {
        "key": "purpose",
        "label": "Scene Purpose",
        "placeholder": "Dramatic or narrative objective"
      },
      {
        "key": "sensory",
        "label": "Sensory Anchors",
        "placeholder": "Tactile, auditory, olfactory details"
      },
      {
        "key": "keyEvent",
        "label": "Key Event",
        "placeholder": "What shifts or changes in this scene?"
      },
      {
        "key": "continuity",
        "label": "Continuity Notes",
        "placeholder": "Props, time elapsed, causal links"
      }
    ]
  },
  "analyzers": [
    {
      "id": "over-explanation",
      "name": "Over-Explanation & Defensive Framing",
      "description": "Flags repeated justifications, anticipatory defense, repeated qualifications, apologetic framing, or excessive contextualization.",
      "triggers": [
        "you have to understand",
        "what I meant was",
        "in order to explain",
        "I was only trying to",
        "because I knew that",
        "it should be noted that",
        "needless to say",
        "as previously mentioned"
      ]
    },
    {
      "id": "somatic-balance",
      "name": "Sensory & Physical Anchors",
      "description": "Tracks concrete physical tokens versus abstract narrative reflection.",
      "triggers": [
        "brass",
        "whale oil",
        "fog",
        "salt",
        "iron",
        "bell",
        "glass",
        "stone"
      ]
    }
  ],
  "initialChapters": [
    {
      "id": "ch-1",
      "number": 1,
      "title": "The Escapement on the Narrows",
      "content": "The fog arrived before the bell.\n\nElias Thorne stood upon the catwalk of the harbor tower, thirty fathoms above the breakwater, wiping salt spray from the brass bezel of his magnifying loupe. Below him, the Atlantic broke against the granite piers with the steady, measured breathing of a sleeping beast.\n\nInside the housing, the pendulum swung through an arc of six degrees. Tick. A pause. Tack.\n\nIt was three seconds slow before the harbor bell struck the third hour of the morning watch. In this harbor, three seconds was the difference between clear water and the jagged teeth of the Black Shoals.\n\n* * *\n\nMaster Corvus had taught him the rule on his first morning in the workshop: iron rusts, gold sleeps, but brass remembers every hand that ever touched it.\n\nWhen Elias climbed down the circular iron stair into the lantern gallery, the master's drafting stool was empty. A pot of tallow was cooling on the small cast-iron stove. Beside it lay an open ledger, its ruled margins annotated in Corvus's tight, sloping script.\n\n\"He did not take his coat,\" Elias whispered to the empty room.\n\nThe heavy wool sea coat hung from its brass peg beside the timber door, stiff with dried brine. On the worktable, the master's ivory-handled winding key was resting on a sheet of dry blotter paper.\n\nA gust of wind rattled the storm sashes, carrying the smell of low tide and chimney coal from the fish-houses along the wharf. The bell above them began its toll. One. Two. Three.\n\nThen the iron tongue struck dead against the rim and did not swing again.",
      "wordCount": 284,
      "notes": "Establishes the harbor clock stakes, the master's unexplained departure, and the physical setting of the tower.",
      "status": "revised",
      "lastModified": "2026-09-14T13:06:22.995Z",
      "revisionStatus": "Revised",
      "lastRevisionCompletedAt": "2026-09-12T14:30:00-05:00",
      "lastEditedAt": "2026-09-14T08:00:00-05:00",
      "function": {
        "purpose": "Establish harbor clock pilotage dependency and Master Corvus's sudden disappearance.",
        "centralTurn": "The perpetual harbor bell falls silent for the first time in living memory.",
        "entryState": "Elias is maintaining routine mechanical watch high above the breakwater.",
        "exitState": "The master is missing, the bell is dead, and the harbor is in navigational peril.",
        "readerKnowledgeEntering": "None (opening chapter of the mystery).",
        "readerKnowledgeLeaving": "Master Corvus departed without his coat or winding key; three seconds clock lag causes shipwrecks.",
        "opens": "Where did Corvus go without his sea coat? Why is the clock escapement lagging?",
        "answers": "Establishes the harbor clock stakes.",
        "setup": "The missing sea coat and the cooling tallow on the workshop stove.",
        "payoff": "",
        "stakesMovement": "Shifts from routine maintenance to imminent maritime disaster on the Black Shoals.",
        "characterMovement": "Elias is thrust from obedient apprentice to sole custodian of the narrows.",
        "themeMotifWork": "Brass mechanism, salt fog, human attempts to regulate time against the sea.",
        "whatWouldBeLost": "The foundational mystery, atmospheric texture, and physical rules of the harbor clock.",
        "authorNotes": "Ensure the three-second timing rule feels tactile and high-stakes.",
        "functionTags": [
          "Introduces character",
          "Introduces setting",
          "Establishes canon",
          "Introduces motif",
          "Raises stakes"
        ]
      }
    },
    {
      "id": "ch-2",
      "number": 2,
      "title": "The Ledger of the Third Neap",
      "content": "Maren Reed did not look up from her drafting table when the brass bell above the archivist's door chimed.\n\n\"If you have come about the pilotage tariffs, the collector is at the tavern until noon,\" she said, her quill scraping steadily across parchment. \"And if you have come about the tower bell stopping, half the town has already pounded on my shutters.\"\n\n\"I came about the tide registers,\" Elias said. He closed the heavy door behind him, shutting out the damp harbor wind.\n\nMaren paused. The quill hovered above the inkwell, suspended in the amber pool of lamplight.\n\n\"The tide registers are guild property, Thorne. Your master has the only duplicate key.\"\n\n\"My master is not at the tower,\" Elias said.\n\nShe turned then. The ink on her left index finger was fresh, dark as squid sepia against her pale skin. Her eyes drifted to his hands, where fine brass shavings still glistened in the ridges of his knuckles.\n\n* * *\n\n\"When?\" she asked.\n\n\"Before the third hour,\" Elias replied. \"The kettle was still warm, but the coat was on the peg.\"\n\nShe stood without speaking, took a ring of iron keys from beneath a velvet cloth, and walked to the tall cedar cabinet at the back of the archival vault.\n\n\"He came here two nights ago,\" Maren said quietly, unlocking the lower iron grille. \"He did not ask for the astronomical tables. He asked for the soundings taken forty years ago, before the breakwater was laid.\"",
      "wordCount": 260,
      "notes": "Introduces Maren Reed, provides the clue about the historical soundings, and establishes the alliance.",
      "status": "draft",
      "lastModified": "2026-09-14T13:06:22.996Z",
      "revisionStatus": "In Revision",
      "lastRevisionCompletedAt": null,
      "lastEditedAt": "2026-09-14T08:00:00-05:00",
      "function": {
        "purpose": "Introduce Maren Reed, provide the clue regarding historical soundings, and forge the investigatory alliance.",
        "centralTurn": "Maren reveals that Corvus was secretly researching old underwater topography before the breakwater was built.",
        "entryState": "Elias enters the archival vault seeking guild tide registers alone.",
        "exitState": "Maren and Elias join forces; the investigation shifts from simple disappearance to long-term conspiracy.",
        "readerKnowledgeEntering": "Corvus vanished without taking his winter sea coat.",
        "readerKnowledgeLeaving": "Corvus visited Maren two nights earlier asking for soundings taken forty years ago.",
        "opens": "What do the 40-year-old soundings reveal beneath the modern harbor?",
        "answers": "Confirms Corvus had a hidden motive before vanishing.",
        "setup": "The iron grille and the 40-year-old hydrographic soundings.",
        "payoff": "The mystery of Corvus's missing coat now has a deliberate intellectual purpose.",
        "stakesMovement": "Broadens from an isolated missing person to institutional tampering with harbor depths.",
        "characterMovement": "Maren shifts from defensive bureaucrat to covert co-conspirator with Elias.",
        "themeMotifWork": "Tides, ink, records vs oral tradition, hidden underwater structures.",
        "whatWouldBeLost": "The primary narrative engine connecting the clock failure to the harbor's history.",
        "authorNotes": "Keep Maren's demeanor sharp and wary before she reveals Corvus's visit.",
        "functionTags": [
          "Introduces character",
          "Changes relationship",
          "Provides setup",
          "Contains revelation"
        ]
      }
    }
  ],
  "initialFragments": [
    {
      "id": "frag-demo-1",
      "title": "The Sound of a Broken Mainspring",
      "content": "A broken mainspring does not snap with a report like a pistol; it uncoils inside its barrel with a low, metallic shiver, like dry leaves sliding across slate.",
      "wordCount": 30,
      "status": "active",
      "tags": [
        "clocks",
        "sound",
        "sensory"
      ],
      "createdDate": "2026-09-14T13:06:22.996Z",
      "modifiedDate": "2026-09-14T13:06:22.996Z",
      "sourceOriginNote": "Apprentice notebook reflection on workshop failures.",
      "relatedChapters": [
        "1"
      ],
      "relatedCharacters": [
        "Elias Thorne"
      ],
      "relatedSymbolsMotifs": [
        "Brass & Mechanism"
      ],
      "relatedThemes": [
        "Unseen mechanical strain"
      ],
      "relatedTimelineEvents": [],
      "authorNotes": "Can be inserted into Chapter 3 during the workshop inspection.",
      "locationUltimatelyUsed": ""
    }
  ],
  "initialVersions": [
    {
      "id": "ver-demo-working",
      "code": "RA-W-0001",
      "name": "Current Working Draft",
      "versionType": "Working Branch",
      "createdAt": "2026-09-14T07:30:00-05:00",
      "frozenAt": null,
      "lastEditedAt": "2026-09-14T08:00:00-05:00",
      "parentId": null,
      "parentName": null,
      "parentType": null,
      "authorNote": "Initial draft containing the opening harbor clock sequence and archive inquiry.",
      "totalWords": 544,
      "chapterCount": 2,
      "revisionCycle": "Draft 1",
      "status": "active",
      "isReadOnly": false,
      "isSafetySnapshot": false,
      "chapters": [
        {
          "id": "ch-1",
          "number": 1,
          "title": "The Escapement on the Narrows",
          "content": "The fog arrived before the bell.\n\nElias Thorne stood upon the catwalk of the harbor tower, thirty fathoms above the breakwater, wiping salt spray from the brass bezel of his magnifying loupe. Below him, the Atlantic broke against the granite piers with the steady, measured breathing of a sleeping beast.\n\nInside the housing, the pendulum swung through an arc of six degrees. Tick. A pause. Tack.\n\nIt was three seconds slow before the harbor bell struck the third hour of the morning watch. In this harbor, three seconds was the difference between clear water and the jagged teeth of the Black Shoals.\n\n* * *\n\nMaster Corvus had taught him the rule on his first morning in the workshop: iron rusts, gold sleeps, but brass remembers every hand that ever touched it.\n\nWhen Elias climbed down the circular iron stair into the lantern gallery, the master's drafting stool was empty. A pot of tallow was cooling on the small cast-iron stove. Beside it lay an open ledger, its ruled margins annotated in Corvus's tight, sloping script.\n\n\"He did not take his coat,\" Elias whispered to the empty room.\n\nThe heavy wool sea coat hung from its brass peg beside the timber door, stiff with dried brine. On the worktable, the master's ivory-handled winding key was resting on a sheet of dry blotter paper.\n\nA gust of wind rattled the storm sashes, carrying the smell of low tide and chimney coal from the fish-houses along the wharf. The bell above them began its toll. One. Two. Three.\n\nThen the iron tongue struck dead against the rim and did not swing again.",
          "wordCount": 284,
          "notes": "Establishes the harbor clock stakes, the master's unexplained departure, and the physical setting of the tower.",
          "status": "revised",
          "lastModified": "2026-09-14T13:06:22.995Z",
          "revisionStatus": "Revised",
          "lastRevisionCompletedAt": "2026-09-12T14:30:00-05:00",
          "lastEditedAt": "2026-09-14T08:00:00-05:00"
        },
        {
          "id": "ch-2",
          "number": 2,
          "title": "The Ledger of the Third Neap",
          "content": "Maren Reed did not look up from her drafting table when the brass bell above the archivist's door chimed.\n\n\"If you have come about the pilotage tariffs, the collector is at the tavern until noon,\" she said, her quill scraping steadily across parchment. \"And if you have come about the tower bell stopping, half the town has already pounded on my shutters.\"\n\n\"I came about the tide registers,\" Elias said. He closed the heavy door behind him, shutting out the damp harbor wind.\n\nMaren paused. The quill hovered above the inkwell, suspended in the amber pool of lamplight.\n\n\"The tide registers are guild property, Thorne. Your master has the only duplicate key.\"\n\n\"My master is not at the tower,\" Elias said.\n\nShe turned then. The ink on her left index finger was fresh, dark as squid sepia against her pale skin. Her eyes drifted to his hands, where fine brass shavings still glistened in the ridges of his knuckles.\n\n* * *\n\n\"When?\" she asked.\n\n\"Before the third hour,\" Elias replied. \"The kettle was still warm, but the coat was on the peg.\"\n\nShe stood without speaking, took a ring of iron keys from beneath a velvet cloth, and walked to the tall cedar cabinet at the back of the archival vault.\n\n\"He came here two nights ago,\" Maren said quietly, unlocking the lower iron grille. \"He did not ask for the astronomical tables. He asked for the soundings taken forty years ago, before the breakwater was laid.\"",
          "wordCount": 260,
          "notes": "Introduces Maren Reed, provides the clue about the historical soundings, and establishes the alliance.",
          "status": "draft",
          "lastModified": "2026-09-14T13:06:22.996Z",
          "revisionStatus": "In Revision",
          "lastRevisionCompletedAt": null,
          "lastEditedAt": "2026-09-14T08:00:00-05:00"
        }
      ]
    }
  ],
  "activeVersionId": "ver-demo-working"
};
