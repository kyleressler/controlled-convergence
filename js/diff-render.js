// ============================================================
// diff-render.js — Section-aware diff between two project snapshots.
//
// Phase 6: powers the "View changes" modal in the history view.
// Given two project.data blobs (the JSONB structure containing
// requirements, ilities, concepts, scoring, etc.), produces a
// human-readable description of what changed between them.
//
// Output shape:
//   {
//     sections: [
//       { name: 'Goal Statement', lines: ['Changed "by" from "X" to "Y"'] },
//       { name: 'Requirements',   lines: ['Added: "..."', 'Removed: "..."'] },
//       ...
//     ]
//   }
//
// Each section's `lines` array is empty if nothing changed in that section.
// Section is omitted from the output if it has no lines.
//
// Dependencies: none (pure functions over plain objects).
// Used by: app.js (handleViewVersionChanges).
// ============================================================

(function() {

  // Top-level entry point. Returns an array of { name, lines } sections,
  // omitting any section with no changes.
  function buildVersionDiff(oldData, newData) {
    oldData = oldData || {};
    newData = newData || {};

    var sections = [];

    var goalLines = _diffGoal(oldData, newData);
    if (goalLines.length) sections.push({ name: 'Goal Statement', lines: goalLines });

    var ilityLines = _diffIlities(oldData, newData);
    if (ilityLines.length) sections.push({ name: 'Lifecycle Properties (Ilities)', lines: ilityLines });

    var stakLines = _diffStakeholders(oldData, newData);
    if (stakLines.length) sections.push({ name: 'Stakeholders', lines: stakLines });

    var reqLines = _diffRequirements(oldData, newData);
    if (reqLines.length) sections.push({ name: 'Requirements', lines: reqLines });

    var pairLines = _diffPairwise(oldData, newData);
    if (pairLines.length) sections.push({ name: 'Weighting', lines: pairLines });

    var conceptLines = _diffConcepts(oldData, newData);
    if (conceptLines.length) sections.push({ name: 'Concepts', lines: conceptLines });

    var scoreLines = _diffScoring(oldData, newData);
    if (scoreLines.length) sections.push({ name: 'Scoring', lines: scoreLines });

    var settingsLines = _diffSettings(oldData, newData);
    if (settingsLines.length) sections.push({ name: 'Project Settings', lines: settingsLines });

    var convLines = _diffConvergence(oldData, newData);
    if (convLines.length) sections.push({ name: 'Convergence', lines: convLines });

    return { sections: sections };
  }

  // ── Goal Statement ──
  // Fields: goal.{to, by, using, while, basic}, plus goalMode
  function _diffGoal(oldD, newD) {
    var lines = [];
    var oldG = (oldD.goal || {});
    var newG = (newD.goal || {});
    var fields = ['to', 'by', 'using', 'while', 'basic'];
    fields.forEach(function(f) {
      var o = oldG[f] || '';
      var n = newG[f] || '';
      if (o !== n) {
        if (!o) lines.push('Added "' + f + '": ' + _quote(n));
        else if (!n) lines.push('Cleared "' + f + '" (was ' + _quote(o) + ')');
        else lines.push('Changed "' + f + '" from ' + _quote(o) + ' to ' + _quote(n));
      }
    });
    if (oldD.goalMode !== newD.goalMode && (oldD.goalMode || newD.goalMode)) {
      lines.push('Goal mode changed from ' + _quote(oldD.goalMode || '(none)') + ' to ' + _quote(newD.goalMode || '(none)'));
    }
    return lines;
  }

  // ── Ilities ──
  // ilities is an array of selected IDs. customIlities is array of {id, name, desc}.
  function _diffIlities(oldD, newD) {
    var lines = [];
    var oldSel = (oldD.ilities || []).slice().sort();
    var newSel = (newD.ilities || []).slice().sort();
    var added   = newSel.filter(function(x) { return oldSel.indexOf(x) === -1; });
    var removed = oldSel.filter(function(x) { return newSel.indexOf(x) === -1; });
    if (added.length)   lines.push('Selected: ' + added.map(_quote).join(', '));
    if (removed.length) lines.push('Deselected: ' + removed.map(_quote).join(', '));

    // Custom ilities by id
    var oldCust = _byId(oldD.customIlities || []);
    var newCust = _byId(newD.customIlities || []);
    Object.keys(newCust).forEach(function(id) {
      if (!oldCust[id]) lines.push('Added custom ility: ' + _quote(newCust[id].name));
    });
    Object.keys(oldCust).forEach(function(id) {
      if (!newCust[id]) lines.push('Removed custom ility: ' + _quote(oldCust[id].name));
    });
    return lines;
  }

  // ── Stakeholders ──
  function _diffStakeholders(oldD, newD) {
    var lines = [];
    var oldSel = (oldD.stakeholders || []).slice().sort();
    var newSel = (newD.stakeholders || []).slice().sort();
    var added   = newSel.filter(function(x) { return oldSel.indexOf(x) === -1; });
    var removed = oldSel.filter(function(x) { return newSel.indexOf(x) === -1; });
    if (added.length)   lines.push('Selected: ' + added.map(_quote).join(', '));
    if (removed.length) lines.push('Deselected: ' + removed.map(_quote).join(', '));

    var oldCust = _byId(oldD.customStakeholders || []);
    var newCust = _byId(newD.customStakeholders || []);
    Object.keys(newCust).forEach(function(id) {
      if (!oldCust[id]) lines.push('Added custom stakeholder: ' + _quote(newCust[id].name));
    });
    Object.keys(oldCust).forEach(function(id) {
      if (!newCust[id]) lines.push('Removed custom stakeholder: ' + _quote(oldCust[id].name));
    });
    return lines;
  }

  // ── Requirements ──
  // requirements is an array of {id, text, type, format, primary, secondaries, ...}
  function _diffRequirements(oldD, newD) {
    var lines = [];
    var oldR = _byId(oldD.requirements || []);
    var newR = _byId(newD.requirements || []);

    Object.keys(newR).forEach(function(id) {
      if (!oldR[id]) {
        lines.push('Added: ' + _quote(_reqLabel(newR[id])));
      } else {
        // Detect modifications. Compare a few key fields.
        var changes = [];
        if ((oldR[id].text || '') !== (newR[id].text || '')) changes.push('text');
        if ((oldR[id].type || '') !== (newR[id].type || '')) changes.push('type (' + (oldR[id].type || '') + '→' + (newR[id].type || '') + ')');
        if ((oldR[id].primary || '') !== (newR[id].primary || '')) changes.push('primary ility');
        if (JSON.stringify(oldR[id].secondaries || []) !== JSON.stringify(newR[id].secondaries || [])) changes.push('secondary ilities');
        if (JSON.stringify(oldR[id].stakeholders || []) !== JSON.stringify(newR[id].stakeholders || [])) changes.push('stakeholders');
        if (JSON.stringify((oldR[id].tags || []).slice().sort()) !== JSON.stringify((newR[id].tags || []).slice().sort())) changes.push('tags');
        if (changes.length) {
          lines.push('Edited ' + _quote(_reqLabel(newR[id])) + ' (' + changes.join(', ') + ')');
        }
      }
    });
    Object.keys(oldR).forEach(function(id) {
      if (!newR[id]) lines.push('Removed: ' + _quote(_reqLabel(oldR[id])));
    });
    return lines;
  }
  function _reqLabel(r) {
    if (!r) return '';
    var t = (r.text || '').trim();
    if (t.length > 80) t = t.substring(0, 77) + '…';
    return t || '(empty)';
  }

  // ── Pairwise (Weighting) ──
  function _diffPairwise(oldD, newD) {
    var lines = [];
    if ((oldD.pairMode || 'nonweighted') !== (newD.pairMode || 'nonweighted')) {
      lines.push('Mode changed from ' + _quote(oldD.pairMode || 'nonweighted') + ' to ' + _quote(newD.pairMode || 'nonweighted'));
    }
    if ((oldD.pairSubject || 'ilities') !== (newD.pairSubject || 'ilities')) {
      lines.push('Subject changed from ' + _quote(oldD.pairSubject || 'ilities') + ' to ' + _quote(newD.pairSubject || 'ilities'));
    }
    if ((oldD.pairMethod || 'pairwise') !== (newD.pairMethod || 'pairwise')) {
      lines.push('Method changed from ' + _quote(oldD.pairMethod || 'pairwise') + ' to ' + _quote(newD.pairMethod || 'pairwise'));
    }
    var oldComps = oldD.pairComparisons || {};
    var newComps = newD.pairComparisons || {};
    var oldKeys = Object.keys(oldComps);
    var newKeys = Object.keys(newComps);
    var added   = newKeys.filter(function(k) { return !(k in oldComps); }).length;
    var removed = oldKeys.filter(function(k) { return !(k in newComps); }).length;
    var changed = newKeys.filter(function(k) { return (k in oldComps) && oldComps[k] !== newComps[k]; }).length;
    if (added)   lines.push('Added '   + added   + ' pairwise comparison' + (added   === 1 ? '' : 's'));
    if (removed) lines.push('Removed ' + removed + ' pairwise comparison' + (removed === 1 ? '' : 's'));
    if (changed) lines.push('Changed ' + changed + ' pairwise comparison' + (changed === 1 ? '' : 's'));
    var oldFR = (oldD.forcedRankOrder || []).join(',');
    var newFR = (newD.forcedRankOrder || []).join(',');
    if (oldFR !== newFR) lines.push('Forced rank order changed');
    return lines;
  }

  // ── Concepts ──
  function _diffConcepts(oldD, newD) {
    var lines = [];
    var oldC = _byId(oldD.concepts || []);
    var newC = _byId(newD.concepts || []);
    Object.keys(newC).forEach(function(id) {
      if (!oldC[id]) {
        lines.push('Added: ' + _quote(newC[id].name || '(unnamed)'));
      } else if ((oldC[id].name || '') !== (newC[id].name || '')) {
        lines.push('Renamed: ' + _quote(oldC[id].name || '(unnamed)') + ' → ' + _quote(newC[id].name || '(unnamed)'));
      }
    });
    Object.keys(oldC).forEach(function(id) {
      if (!newC[id]) lines.push('Removed: ' + _quote(oldC[id].name || '(unnamed)'));
    });
    return lines;
  }

  // ── Scoring ──
  // matrix is keyed by "conceptId_reqId" → score symbol/number.
  // Counts added/removed/changed cells. Listing every cell would be too noisy.
  function _diffScoring(oldD, newD) {
    var lines = [];
    var oldM = oldD.matrix || {};
    var newM = newD.matrix || {};
    var added = 0, removed = 0, changed = 0;
    Object.keys(newM).forEach(function(k) {
      if (!(k in oldM)) added++;
      else if (oldM[k] !== newM[k]) changed++;
    });
    Object.keys(oldM).forEach(function(k) { if (!(k in newM)) removed++; });
    if (added)   lines.push('Scored ' + added + ' new cell' + (added === 1 ? '' : 's'));
    if (changed) lines.push('Changed ' + changed + ' existing score' + (changed === 1 ? '' : 's'));
    if (removed) lines.push('Cleared ' + removed + ' score' + (removed === 1 ? '' : 's'));

    // Datum performance
    var oldDP = oldD.datumPerformance || {};
    var newDP = newD.datumPerformance || {};
    var dpChanged = 0;
    Object.keys(newDP).forEach(function(rid) {
      if (JSON.stringify(oldDP[rid] || {}) !== JSON.stringify(newDP[rid] || {})) dpChanged++;
    });
    Object.keys(oldDP).forEach(function(rid) {
      if (!newDP[rid]) dpChanged++;
    });
    if (dpChanged) lines.push('Updated datum performance for ' + dpChanged + ' requirement' + (dpChanged === 1 ? '' : 's'));

    return lines;
  }

  // ── Project Settings ──
  function _diffSettings(oldD, newD) {
    var lines = [];
    var oldS = oldD.pughSettings || {};
    var newS = newD.pughSettings || {};
    if (!!oldS.advancedScoring !== !!newS.advancedScoring) {
      lines.push('Advanced scoring (−3..+3) ' + (newS.advancedScoring ? 'enabled' : 'disabled'));
    }
    if (!!oldS.showMAS !== !!newS.showMAS) {
      lines.push('Minimum Acceptable Score (MAS) display ' + (newS.showMAS ? 'enabled' : 'disabled'));
    }
    if (!!oldS.showMTHUS !== !!newS.showMTHUS) {
      lines.push('MTHUS display ' + (newS.showMTHUS ? 'enabled' : 'disabled'));
    }
    return lines;
  }

  // ── Convergence ──
  function _diffConvergence(oldD, newD) {
    var lines = [];
    var oldC = oldD.convergence || {};
    var newC = newD.convergence || {};
    if ((oldC.rationale || '') !== (newC.rationale || '')) lines.push('Rationale text changed');
    if ((oldC.risks     || '') !== (newC.risks     || '')) lines.push('Risks text changed');
    if ((oldC.selectedConceptId || '') !== (newC.selectedConceptId || '')) {
      lines.push('Selected concept changed');
    }
    var oldL = oldC.lessons || {};
    var newL = newC.lessons || {};
    ['req', 'concepts', 'different', 'assumption'].forEach(function(k) {
      if ((oldL[k] || '') !== (newL[k] || '')) lines.push('Lesson "' + k + '" changed');
    });
    var oldNS = (oldC.nextSteps || []).length;
    var newNS = (newC.nextSteps || []).length;
    if (oldNS !== newNS) lines.push('Next steps count changed (' + oldNS + ' → ' + newNS + ')');
    return lines;
  }

  // ── Helpers ──
  function _byId(arr) {
    var out = {};
    if (!Array.isArray(arr)) return out;
    arr.forEach(function(item) {
      if (item && item.id != null) out[String(item.id)] = item;
    });
    return out;
  }
  function _quote(s) {
    if (s == null) return '""';
    return '"' + String(s) + '"';
  }

  // Expose to global scope (the codebase's pseudo-module pattern).
  window.buildVersionDiff = buildVersionDiff;

})();
