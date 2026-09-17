/**
 * SonoDent AI // Core Dental Intelligence & Voice Parsing Engine
 * Specialized for CareStack Clinical EHR Integration (DSOLVE 2026 Problem 7)
 * Author: ctrlX (S Sidharth Unni & Arjun Unnikrishnan Pillai)
 */

(function(global) {
  'use strict';

  // Standard 32-Tooth Anatomy Table (Universal & FDI cross-index)
  const TEETH_METADATA = [
    // Maxilla (Upper Arch) - Quadrant 1 (Teeth 1-8)
    { id: 1,  fdi: 18, name: "Maxillary Right 3rd Molar", type: "molar", quad: 1, roots: 3 },
    { id: 2,  fdi: 17, name: "Maxillary Right 2nd Molar", type: "molar", quad: 1, roots: 3 },
    { id: 3,  fdi: 16, name: "Maxillary Right 1st Molar", type: "molar", quad: 1, roots: 3 },
    { id: 4,  fdi: 15, name: "Maxillary Right 2nd Premolar", type: "premolar", quad: 1, roots: 1 },
    { id: 5,  fdi: 14, name: "Maxillary Right 1st Premolar", type: "premolar", quad: 1, roots: 2 },
    { id: 6,  fdi: 13, name: "Maxillary Right Canine", type: "canine", quad: 1, roots: 1 },
    { id: 7,  fdi: 12, name: "Maxillary Right Lateral Incisor", type: "incisor", quad: 1, roots: 1 },
    { id: 8,  fdi: 11, name: "Maxillary Right Central Incisor", type: "incisor", quad: 1, roots: 1 },
    // Maxilla (Upper Arch) - Quadrant 2 (Teeth 9-16)
    { id: 9,  fdi: 21, name: "Maxillary Left Central Incisor", type: "incisor", quad: 2, roots: 1 },
    { id: 10, fdi: 22, name: "Maxillary Left Lateral Incisor", type: "incisor", quad: 2, roots: 1 },
    { id: 11, fdi: 23, name: "Maxillary Left Canine", type: "canine", quad: 2, roots: 1 },
    { id: 12, fdi: 24, name: "Maxillary Left 1st Premolar", type: "premolar", quad: 2, roots: 2 },
    { id: 13, fdi: 25, name: "Maxillary Left 2nd Premolar", type: "premolar", quad: 2, roots: 1 },
    { id: 14, fdi: 26, name: "Maxillary Left 1st Molar", type: "molar", quad: 2, roots: 3 },
    { id: 15, fdi: 27, name: "Maxillary Left 2nd Molar", type: "molar", quad: 2, roots: 3 },
    { id: 16, fdi: 28, name: "Maxillary Left 3rd Molar", type: "molar", quad: 2, roots: 3 },
    // Mandible (Lower Arch) - Quadrant 3 (Teeth 17-24)
    { id: 17, fdi: 38, name: "Mandibular Left 3rd Molar", type: "molar", quad: 3, roots: 2 },
    { id: 18, fdi: 37, name: "Mandibular Left 2nd Molar", type: "molar", quad: 3, roots: 2 },
    { id: 19, fdi: 36, name: "Mandibular Left 1st Molar", type: "molar", quad: 3, roots: 2 },
    { id: 20, fdi: 35, name: "Mandibular Left 2nd Premolar", type: "premolar", quad: 3, roots: 1 },
    { id: 21, fdi: 34, name: "Mandibular Left 1st Premolar", type: "premolar", quad: 3, roots: 1 },
    { id: 22, fdi: 33, name: "Mandibular Left Canine", type: "canine", quad: 3, roots: 1 },
    { id: 23, fdi: 32, name: "Mandibular Left Lateral Incisor", type: "incisor", quad: 3, roots: 1 },
    { id: 24, fdi: 31, name: "Mandibular Left Central Incisor", type: "incisor", quad: 3, roots: 1 },
    // Mandible (Lower Arch) - Quadrant 4 (Teeth 25-32)
    { id: 25, fdi: 41, name: "Mandibular Right Central Incisor", type: "incisor", quad: 4, roots: 1 },
    { id: 26, fdi: 42, name: "Mandibular Right Lateral Incisor", type: "incisor", quad: 4, roots: 1 },
    { id: 27, fdi: 43, name: "Mandibular Right Canine", type: "canine", quad: 4, roots: 1 },
    { id: 28, fdi: 44, name: "Mandibular Right 1st Premolar", type: "premolar", quad: 4, roots: 1 },
    { id: 29, fdi: 45, name: "Mandibular Right 2nd Premolar", type: "premolar", quad: 4, roots: 1 },
    { id: 30, fdi: 46, name: "Mandibular Right 1st Molar", type: "molar", quad: 4, roots: 2 },
    { id: 31, fdi: 47, name: "Mandibular Right 2nd Molar", type: "molar", quad: 4, roots: 2 },
    { id: 32, fdi: 48, name: "Mandibular Right 3rd Molar", type: "molar", quad: 4, roots: 2 }
  ];

  // 6 Standardized Probing Sites
  const SITES = ["MB", "B", "DB", "ML", "L", "DL"];
  const SITE_NAMES = {
    MB: "Mesiobuccal",
    B:  "Mid-Buccal / Facial",
    DB: "Distobuccal",
    ML: "Mesiolingual",
    L:  "Mid-Lingual / Palatal",
    DL: "Distolingual"
  };

  class SonoDentEngine {
    constructor() {
      this.teeth = {};
      this.activeToothId = 1;
      this.activeSiteIndex = 0; // 0 to 5
      this.historyStack = [];
      this.numberingSystem = "universal"; // "universal" or "fdi"
      this.initChart();
    }

    initChart() {
      TEETH_METADATA.forEach(t => {
        this.teeth[t.id] = {
          id: t.id,
          fdi: t.fdi,
          name: t.name,
          type: t.type,
          quad: t.quad,
          roots: t.roots,
          missing: false,
          implant: false,
          mobility: 0, // 0, 1, 2, 3
          furcation: 0, // 0, 1, 2, 3, 4
          // 6 Probing Points
          probing: {
            MB: 2, B: 2, DB: 2,
            ML: 2, L: 2, DL: 2
          },
          bleeding: {
            MB: false, B: false, DB: false,
            ML: false, L: false, DL: false
          },
          suppuration: {
            MB: false, B: false, DB: false,
            ML: false, L: false, DL: false
          },
          recession: {
            MB: 0, B: 0, DB: 0,
            ML: 0, L: 0, DL: 0
          }
        };
      });
    }

    setMeasurement(toothId, site, depth, bleeding = null, suppuration = null, recession = null) {
      if (!this.teeth[toothId]) return false;
      const t = this.teeth[toothId];
      
      this.historyStack.push({
        toothId,
        site,
        prevProbing: t.probing[site],
        prevBleeding: t.bleeding[site],
        prevSuppuration: t.suppuration[site],
        prevRecession: t.recession[site]
      });

      if (depth !== null && depth !== undefined) {
        t.probing[site] = Math.max(1, Math.min(15, parseInt(depth, 10)));
      }
      if (bleeding !== null) t.bleeding[site] = !!bleeding;
      if (suppuration !== null) t.suppuration[site] = !!suppuration;
      if (recession !== null) t.recession[site] = parseInt(recession, 10);

      return true;
    }

    rollbackLast() {
      if (this.historyStack.length === 0) return null;
      const item = this.historyStack.pop();
      const t = this.teeth[item.toothId];
      t.probing[item.site] = item.prevProbing;
      t.bleeding[item.site] = item.prevBleeding;
      t.suppuration[item.site] = item.prevSuppuration;
      t.recession[item.site] = item.prevRecession;
      this.activeToothId = item.toothId;
      this.activeSiteIndex = SITES.indexOf(item.site);
      return item;
    }

    advanceSite() {
      this.activeSiteIndex++;
      if (this.activeSiteIndex >= SITES.length) {
        this.activeSiteIndex = 0;
        this.activeToothId++;
        if (this.activeToothId > 32) this.activeToothId = 1;
      }
    }

    selectTooth(id) {
      const num = parseInt(id, 10);
      if (this.numberingSystem === "universal") {
        if (num >= 1 && num <= 32) {
          this.activeToothId = num;
          this.activeSiteIndex = 0;
          return true;
        }
      } else {
        const match = TEETH_METADATA.find(t => t.fdi === num);
        if (match) {
          this.activeToothId = match.id;
          this.activeSiteIndex = 0;
          return true;
        }
      }
      return false;
    }

    parseVoiceTranscript(text) {
      if (!text || typeof text !== "string") return [];
      const clean = text.toLowerCase().trim();
      const tokens = clean.split(/\s+/);
      const actions = [];

      let i = 0;
      while (i < tokens.length) {
        const tok = tokens[i];

        if (tok === "scratch" || tok === "undo" || tok === "cancel" || tok === "back") {
          const undone = this.rollbackLast();
          actions.push({ type: "rollback", item: undone });
          i++;
          continue;
        }

        if ((tok === "tooth" || tok === "number" || tok === "teeth") && i + 1 < tokens.length) {
          const tNum = this.parseSpokenNumber(tokens[i + 1]);
          if (tNum) {
            this.selectTooth(tNum);
            actions.push({ type: "select_tooth", toothId: this.activeToothId });
            i += 2;
            continue;
          }
        }

        const siteMatch = this.matchSiteName(tok);
        if (siteMatch) {
          this.activeSiteIndex = SITES.indexOf(siteMatch);
          actions.push({ type: "select_site", site: siteMatch });
          i++;
          continue;
        }

        if (tok === "bleeding" || tok === "blood" || tok === "bleed" || tok === "bop") {
          const currSite = SITES[this.activeSiteIndex];
          this.setMeasurement(this.activeToothId, currSite, null, true);
          actions.push({ type: "condition", toothId: this.activeToothId, site: currSite, condition: "bleeding" });
          i++;
          continue;
        }
        if (tok === "pus" || tok === "suppuration") {
          const currSite = SITES[this.activeSiteIndex];
          this.setMeasurement(this.activeToothId, currSite, null, null, true);
          actions.push({ type: "condition", toothId: this.activeToothId, site: currSite, condition: "suppuration" });
          i++;
          continue;
        }

        const numVal = this.parseSpokenNumber(tok);
        if (numVal !== null && numVal >= 1 && numVal <= 15) {
          const currSite = SITES[this.activeSiteIndex];
          this.setMeasurement(this.activeToothId, currSite, numVal);
          actions.push({ type: "measurement", toothId: this.activeToothId, site: currSite, depth: numVal });
          this.advanceSite();
          i++;
          continue;
        }

        i++;
      }

      return actions;
    }

    parseSpokenNumber(word) {
      if (!word) return null;
      const parsed = parseInt(word, 10);
      if (!isNaN(parsed)) return parsed;

      const map = {
        zero: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3,
        four: 4, for: 4, fore: 4, five: 5, six: 6, seven: 7, eight: 8, ate: 8,
        nine: 9, niner: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
        fourteen: 14, fifteen: 15
      };
      return map[word] !== undefined ? map[word] : null;
    }

    matchSiteName(word) {
      if (word === "mesial" || word === "mesiobuccal" || word === "mb") return "MB";
      if (word === "buccal" || word === "facial" || word === "b") return "B";
      if (word === "distal" || word === "distobuccal" || word === "db") return "DB";
      if (word === "mesiolingual" || word === "ml") return "ML";
      if (word === "lingual" || word === "palatal" || word === "l") return "L";
      if (word === "distolingual" || word === "dl") return "DL";
      return null;
    }

    getAnalytics() {
      let totalSites = 0;
      let bleedingSites = 0;
      let suppurationSites = 0;
      let deepPocketsCount = 0;
      let moderatePocketsCount = 0;
      let sumDepth = 0;
      let maxDepth = 0;
      let affectedTeethCount = 0;

      const quadrantBreakdown = {
        1: { teethCount: 0, diseasedTeeth: 0, deepPockets: 0 },
        2: { teethCount: 0, diseasedTeeth: 0, deepPockets: 0 },
        3: { teethCount: 0, diseasedTeeth: 0, deepPockets: 0 },
        4: { teethCount: 0, diseasedTeeth: 0, deepPockets: 0 }
      };

      TEETH_METADATA.forEach(meta => {
        const t = this.teeth[meta.id];
        if (t.missing) return;

        let toothHasDisease = false;
        quadrantBreakdown[meta.quad].teethCount++;

        SITES.forEach(s => {
          totalSites++;
          const d = t.probing[s];
          sumDepth += d;
          if (d > maxDepth) maxDepth = d;

          if (d >= 5) {
            deepPocketsCount++;
            toothHasDisease = true;
            quadrantBreakdown[meta.quad].deepPockets++;
          } else if (d === 4) {
            moderatePocketsCount++;
            toothHasDisease = true;
          }

          if (t.bleeding[s]) bleedingSites++;
          if (t.suppuration[s]) suppurationSites++;
        });

        if (toothHasDisease) {
          affectedTeethCount++;
          quadrantBreakdown[meta.quad].diseasedTeeth++;
        }
      });

      const bopPercent = totalSites > 0 ? Math.round((bleedingSites / totalSites) * 100) : 0;
      const meanDepth = totalSites > 0 ? (sumDepth / totalSites).toFixed(2) : "0.00";
      const affectedTeethPercent = Math.round((affectedTeethCount / 32) * 100);

      let staging = "Gingival Health";
      let stageDescription = "Intact periodontium with minimal sulcular depth.";
      let grade = "Grade A (Low Risk)";

      if (maxDepth >= 7 || deepPocketsCount >= 12) {
        staging = "Periodontitis — Stage IV (Advanced)";
        stageDescription = "Severe attachment loss, deep pockets >= 7mm, tooth loss vulnerability.";
        grade = bopPercent > 30 ? "Grade C (Rapid Progression)" : "Grade B (Moderate)";
      } else if (maxDepth >= 6 || deepPocketsCount >= 6) {
        staging = "Periodontitis — Stage III (Severe)";
        stageDescription = "Severe probing depths >= 6mm with vertical bone loss patterns.";
        grade = bopPercent > 20 ? "Grade B (Moderate Progression)" : "Grade A (Slow)";
      } else if (maxDepth === 5 || moderatePocketsCount >= 8) {
        staging = "Periodontitis — Stage II (Moderate)";
        stageDescription = "Established periodontitis with pocket depths up to 5mm.";
        grade = "Grade B (Moderate)";
      } else if (maxDepth === 4 || bopPercent >= 10) {
        staging = "Periodontitis — Stage I (Initial / Mild)";
        stageDescription = "Localized early pocketing (4mm) and marginal inflammation.";
        grade = "Grade A (Slow Progression)";
      } else if (bopPercent > 10) {
        staging = "Biofilm-Induced Gingivitis";
        stageDescription = "Inflammatory gingival response without bone loss.";
        grade = "Non-Destructive";
      }

      const extent = affectedTeethPercent >= 30 ? "Generalized" : "Localized";
      const fullDiagnosis = staging.includes("Stage") ? `${extent} ${staging} (${grade})` : staging;

      const cdtCodes = [];
      [1, 2, 3, 4].forEach(q => {
        const qData = quadrantBreakdown[q];
        if (qData.deepPockets >= 4) {
          cdtCodes.push({
            code: "CDT D4341",
            desc: `Periodontal Scaling & Root Planing (Quadrant ${q})`,
            teethCount: qData.deepPockets,
            fee: "$285.00"
          });
        } else if (qData.deepPockets >= 1) {
          cdtCodes.push({
            code: "CDT D4342",
            desc: `Periodontal Scaling & Root Planing (1-3 Teeth, Quad ${q})`,
            teethCount: qData.deepPockets,
            fee: "$165.00"
          });
        }
      });

      if (cdtCodes.length === 0) {
        if (bopPercent > 10) {
          cdtCodes.push({ code: "CDT D4346", desc: "Scaling in Presence of Moderate Gingival Inflammation", fee: "$120.00" });
        } else {
          cdtCodes.push({ code: "CDT D1110", desc: "Adult Prophylaxis (Preventive Maintenance)", fee: "$95.00" });
        }
      }

      return {
        totalSites,
        bleedingSites,
        suppurationSites,
        bopPercent,
        deepPocketsCount,
        moderatePocketsCount,
        meanDepth,
        maxDepth,
        affectedTeethCount,
        affectedTeethPercent,
        diagnosis: fullDiagnosis,
        stage: staging,
        grade,
        stageDescription,
        quadrantBreakdown,
        cdtCodes
      };
    }
  }

  global.TEETH_METADATA = TEETH_METADATA;
  global.SITES = SITES;
  global.SITE_NAMES = SITE_NAMES;
  global.SonoDentEngine = SonoDentEngine;

})(typeof window !== 'undefined' ? window : this);
