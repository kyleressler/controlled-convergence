// ============================================================
// state.js — Central application state
// All mutable state lives here. No business logic.
// ============================================================

// ── Tier ────────────────────────────────────────────────────
let userTier = 'free'; // 'free' | 'account' | 'pro'

// ── Project ─────────────────────────────────────────────────
let activeProject = null;
let savedProjects = [];

// ── Right-sidebar slides ─────────────────────────────────────
let currentSlide = 0;

// ── Ilities ──────────────────────────────────────────────────
let selectedIlities = new Set();
let customIlities = [];
let ilityOrder = []; // user-defined card display order (array of ility IDs)

// ── Stakeholders ─────────────────────────────────────────────
let selectedStakeholders = new Set();
let customStakeholders = [];
let stakOrder = []; // user-defined card display order (array of stakeholder IDs)

// ── Requirements ─────────────────────────────────────────────
let requirements = [];
let reqType = '';
let reqIdCounter = 0;
let _editingReqId = null;

// ── Modal ────────────────────────────────────────────────────
let _modalType = '';
let _modalId = '';

// ── Pairwise ─────────────────────────────────────────────────
let pairMode    = 'nonweighted'; // 'nonweighted' | 'weighted'
let pairSubject = 'ilities';     // 'ilities' | 'requirements'
let pairMethod  = 'pairwise';    // 'pairwise' | 'forcedrank'
let pairComparisons = {};
let pairPairs = [];
let pairIndex = 0;
let forcedRankOrder = [];        // ordered IDs for forced rank mode
let _frDragId     = null;        // active drag ID for forced rank DnD
let _frDragOverId = null;        // current drag-over target ID

// ── Navigation ───────────────────────────────────────────────
let _currentPage = 'home';
const _completedPages = new Set();

// ── Pugh / Scoring ───────────────────────────────────────────
let pughConcepts = [];
let pughScores = {};
let pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false };
let pughConceptCounter = 0;
let scoringConceptId = null;
let scoringReqIndex = 0;
let datumDefIndex = 0;
let datumPerformance = {};
let conceptPerformance = {};
let conceptNotes = {};          // { 'conceptId_reqId': 'text' }
let conceptCustomFields = [];   // [{ id, name, type }] — project-level custom fields
let _cfIdCounter = 0;           // auto-increment for custom field IDs
let scorerFilter = '';          // '' = all; otherwise stakeholder ID to filter by
let _scorePopupConcept = null;
let _scorePopupReq = null;
let pughAdvBackup = {};

// ── App mode ─────────────────────────────────────────────────
let appMode = 'full'; // 'full' | 'basic'
let _lastFullPage = 'home';

// ── Central state object (Supabase-ready shape) ───────────────
// currentUser: populated by auth.js on login
// currentProject / projects: synced with api.js
let appState = {
  mode: 'full',
  currentUser: null,    // { id, email, tier, name }
  currentProject: null, // mirrors activeProject
  projects: []          // mirrors savedProjects
};
