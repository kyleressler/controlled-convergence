// ============================================================
// state.js — Central application state
// All mutable state lives here. No business logic.
// ============================================================

// ── Tier ────────────────────────────────────────────────────
let userTier = 'free'; // 'free' | 'member' | 'pro'

// ── Project ─────────────────────────────────────────────────
let activeProject = null;
let savedProjects = [];

// ── Right-sidebar slides ─────────────────────────────────────
let currentSlide = 0;

// ── Ilities ──────────────────────────────────────────────────
let selectedIlities = new Set();
let customIlities = [];

// ── Stakeholders ─────────────────────────────────────────────
let selectedStakeholders = new Set();
let customStakeholders = [];

// ── Requirements ─────────────────────────────────────────────
let requirements = [];
let reqType = 'essential';
let reqIdCounter = 0;
let _editingReqId = null;

// ── Modal ────────────────────────────────────────────────────
let _modalType = '';
let _modalId = '';

// ── Pairwise ─────────────────────────────────────────────────
let pairMode = 'nonweighted';
let pairComparisons = {};
let pairPairs = [];
let pairIndex = 0;

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
let _scorePopupConcept = null;
let _scorePopupReq = null;
let pughAdvBackup = {};

// ── App mode ─────────────────────────────────────────────────
let appMode = 'guided'; // 'guided' | 'quick'
let _lastGuidedPage = 'home';

// ── Central state object (Supabase-ready shape) ───────────────
// currentUser: populated by auth.js on login
// currentProject / projects: synced with api.js
let appState = {
  mode: 'guided',
  currentUser: null,    // { id, email, tier, name }
  currentProject: null, // mirrors activeProject
  projects: []          // mirrors savedProjects
};
