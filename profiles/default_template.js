/**
 * Revision Atlas - Generic Project Profile Starter Template
 * Reusable for any novel, memoir, narrative nonfiction, or short story project.
 */
window.PROJECT_PROFILES = window.PROJECT_PROFILES || {};
window.PROJECT_PROFILES['template'] = {
  id: 'template',
  title: 'Untitled Project',
  author: 'Author Name',
  projectType: 'Novel',
  targetWordCount: 80000,

  // Customizable terminology & lexicon
  lexicon: {
    sacredTerms: [],
    customTerms: [],
    avoidTerms: []
  },

  // Motifs to track
  motifs: [
    {
      id: 'motif-1',
      name: 'Light & Shadow',
      category: 'Visual',
      keywords: ['light', 'shadow', 'illumination', 'gloom', 'lantern', 'dusk', 'dawn'],
      collocations: ['fading light', 'deep shadow'],
      significance: 'Transitions between certainty and uncertainty.'
    }
  ],

  // Character dossiers
  characters: [
    {
      id: 'char-1',
      canonicalName: 'Protagonist',
      aliases: ['Main Figure'],
      role: 'Lead',
      archetype: 'The Seeker',
      firstAppearsChapter: 1,
      coreRelationships: 'Navigates the central dramatic conflict.',
      sensoryTokens: ['coat', 'boots', 'voice'],
      readerKnowledgeNotes: 'The narrative unfolds primarily through their perspective and observations.'
    }
  ],

  // Symbols & Themes
  symbolsThemes: [
    {
      id: 'sym-1',
      name: 'The Road',
      openJobs: 'Explores movement toward the unknown and internal transformation.',
      whatItDoesNotMean: 'Not simply physical travel or commuting.',
      linkedMotifs: ['Light & Shadow'],
      authorNotes: 'Represents the trajectory of the main conflict.'
    }
  ],

  // Canon & Continuity Ledger
  canon: [
    {
      id: 'canon-1',
      type: 'World Fact',
      title: 'Physical Law / Ground Truth',
      establishedIn: 1,
      statement: 'Every major action carries irreversible narrative and emotional consequences.',
      status: 'Established Canon'
    }
  ],

  // Customizable scene model dimensions
  sceneModel: {
    dimensions: [
      { key: 'setting', label: 'Setting', placeholder: 'Where does the scene occur?' },
      { key: 'time', label: 'Time', placeholder: 'When (time of day / chronology)?' },
      { key: 'pov', label: 'POV', placeholder: 'Point of view character' },
      { key: 'characters', label: 'Characters Present', placeholder: 'Who is in the room / scene?' },
      { key: 'purpose', label: 'Scene Purpose', placeholder: 'Dramatic or narrative objective' },
      { key: 'sensory', label: 'Sensory Anchors', placeholder: 'Tactile, auditory, olfactory details' },
      { key: 'keyEvent', label: 'Key Event', placeholder: 'What shifts or changes in this scene?' },
      { key: 'continuity', label: 'Continuity Notes', placeholder: 'Props, time elapsed, causal links' }
    ]
  },

  // Project-specific diagnostic analyzers
  analyzers: [
    {
      id: 'over-explanation',
      name: 'Over-Explanation & Defensive Framing',
      description: 'Flags repeated justifications, anticipatory defense, repeated qualifications, apologetic framing, or excessive contextualization.',
      triggers: [
        'you have to understand', 'what I meant was', 'in order to explain', 'I was only trying to',
        'because I knew that', 'it should be noted that', 'needless to say', 'as previously mentioned'
      ]
    },
    {
      id: 'somatic-balance',
      name: 'Sensory & Physical Anchors',
      description: 'Tracks concrete physical tokens versus abstract narrative reflection.',
      triggers: ['breath', 'hands', 'cold', 'heat', 'glass', 'stone', 'blood', 'voice']
    }
  ],

  initialChapters: [
    {
      id: 'ch-1',
      number: 1,
      title: 'Chapter 1',
      content: '',
      wordCount: 0,
      notes: '',
      status: 'draft',
      lastModified: new Date().toISOString()
    }
  ],

  initialFragments: []
};
