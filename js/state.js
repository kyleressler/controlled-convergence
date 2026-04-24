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
let pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false, freezeTopRow: false };
let pughCollapsedIlities = new Set(); // tracks which ility IDs (and '__ungrouped__') are collapsed in the Pugh Matrix
let pughChartSort = 'order'; // 'order' | 'utility' | 'minus'
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
let datumDefActive = false;     // true while datum definition panel is open inline
let _scorePopupConcept = null;
let _scorePopupReq = null;
let pughAdvBackup = {};

// ── Permission / Role ────────────────────────────────────────
// The current user's role on the active project.
// null = not determined yet or no project loaded
// 'owner' | 'editor' | 'scoped_editor' | 'viewer'
let currentProjectRole = null;

// Collaborators (project_members rows) for the active project.
// Populated by loadProjectCollaborators() when a project loads (owners only).
// Each entry: { user_id, role, invited_by, created_at, display_name } — display_name is the invite email
let projectCollaborators = [];

// Scoring tasks assigned TO the current user for the active project.
// Used by scoped editors to know which cells they're allowed to score.
let myAssignedScoringTasks = [];

// ── Tasks ────────────────────────────────────────────────────
// Active scoring tasks for the current project (pending or accepted).
// Populated by loadActiveScoringTasksForProject() whenever a project loads.
let activeScoringTasks = [];

// All req_review tasks for the current project (pending, accepted, completed).
// Pending/accepted → shows "Review pending" badge on req card.
// Completed → shows permanent approval record on req card.
let reqReviewTasks = [];

// ── App mode ─────────────────────────────────────────────────
let appMode = 'full'; // 'full' | 'basic'
let _lastFullPage = 'home';

// ── Convergence Summary ───────────────────────────────────────
let convSelectedConceptId = '';
let convRationale         = '';
let convLessons           = { req: '', concepts: '', assumption: '', different: '' };
let convRisks             = '';
let convNextSteps         = [];   // [{ id, what, who, when }]
let convClosedAt          = null;
let _convNSCounter        = 0;

// ── Requirements page filter state ───────────────────────────
// Declared here (loaded before app.js) so they exist when the hash handler
// fires loadExampleProject() → renderRequirements() → getReqPageFilteredReqs().
let reqPageIlityFilter          = [];
let reqPageIlityMatchMode       = 'any';
let reqPageStakeholderFilter    = [];
let reqPageStakeholderMatchMode = 'any';
let reqPageTagFilter            = [];
let reqPageTagMatchMode         = 'any';

// ── Central state object (Supabase-ready shape) ───────────────
// currentUser: populated by auth.js on login
// currentProject / projects: synced with api.js
let appState = {
  mode: 'full',
  currentUser: null,    // { id, email, tier, name }
  currentProject: null, // mirrors activeProject
  projects: []          // mirrors savedProjects
};
