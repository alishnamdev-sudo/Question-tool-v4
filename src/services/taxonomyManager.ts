import axios from 'axios';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

export interface TaxonomyNode {
  grade: string;
  subject: string;
  chapterName: string;
  topicName: string;
  subTopic01: string;
}

export class TaxonomyManager {
  private static cache: Record<string, TaxonomyNode[]> = {};
  private static lastFetched: Record<string, number> = {};
  private static isFetching: Record<string, boolean> = {};
  private static lastOnlineAttempt: Record<string, number> = {};
  private static CACHE_DURATION_MS = 1000 * 60 * 30; // 30 minutes cache

  private static getBackupPath(sheetName: string): string {
    const safeName = sheetName.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(process.cwd(), `taxonomy_backup_${safeName}.json`);
  }

  private static getSheetUrl(sheetName: string): string {
    return `https://docs.google.com/spreadsheets/d/1ujK3qA09CnI9BHcxUrnKL8Zz2vhvsZgsacuCzhivvFU/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  }

  public static async getTaxonomy(pattern: string = "JEE"): Promise<TaxonomyNode[]> {
    // Map pattern (JEE, NEET, CBSE) to actual sheet names in the Google Sheet
    let sheetName = "11-12 JEE";
    const cleanPattern = pattern.trim().toUpperCase();
    if (cleanPattern === "NEET") {
      sheetName = "11-12 NEET";
    } else if (cleanPattern === "CBSE") {
      sheetName = "11-12 CBSE";
    }

    const now = Date.now();
    
    // 1. If we have a cached version and it's fresh (fetched online within CACHE_DURATION_MS), return it
    if (
      this.cache[sheetName] &&
      this.cache[sheetName].length > 0 &&
      this.lastFetched[sheetName] &&
      now - this.lastFetched[sheetName] < this.CACHE_DURATION_MS
    ) {
      console.log(`Taxonomy cache hit (fresh online) for sheet: ${sheetName}`);
      return this.cache[sheetName];
    }

    // 2. If we already have some nodes in memory (even if loaded from backup/stale),
    // and we recently attempted or are currently fetching online, we can return the current memory cache to avoid blocking
    if (
      this.cache[sheetName] &&
      this.cache[sheetName].length > 0 &&
      (this.isFetching[sheetName] || now - (this.lastOnlineAttempt[sheetName] || 0) < 1000 * 60 * 10)
    ) {
      console.log(`Taxonomy memory cache hit (temporary fallback/fetching) for sheet: ${sheetName}`);
      return this.cache[sheetName];
    }

    // 3. Load from memory cache or local offline backup files immediately to give sub-millisecond response
    let nodes = this.cache[sheetName] || [];
    if (nodes.length === 0) {
      console.log(`Cache miss or empty for ${sheetName}. Loading offline local backup...`);
      nodes = this.loadLocalBackup(sheetName);
    }

    const mergedNodes = this.ensureAllSubjectsPresent(nodes, cleanPattern);
    
    // Store merged list in memory cache temporarily
    if (mergedNodes.length > 0 && (!this.cache[sheetName] || this.cache[sheetName].length === 0)) {
      this.cache[sheetName] = mergedNodes;
    }

    // Trigger completely asynchronous background refresh (non-blocking)
    const lastAttemptTime = this.lastOnlineAttempt[sheetName] || 0;
    if (!this.isFetching[sheetName] && (now - lastAttemptTime > 1000 * 60 * 10)) { // 10 mins throttle
      this.isFetching[sheetName] = true;
      this.lastOnlineAttempt[sheetName] = now;
      console.log(`Spawning background taxonomy online refresh check for: ${sheetName}`);
      this.refreshCache(sheetName)
        .then((fetchedNodes) => {
          if (fetchedNodes && fetchedNodes.length > 0) {
            const freshMerged = this.ensureAllSubjectsPresent(fetchedNodes, cleanPattern);
            this.cache[sheetName] = freshMerged;
            this.lastFetched[sheetName] = Date.now();
            console.log(`Completed background taxonomy update for: ${sheetName}. Total nodes: ${freshMerged.length}`);
          }
        })
        .catch((err) => {
          console.warn(`Background taxonomy update failed for: ${sheetName}`, err.message || err);
        })
        .finally(() => {
          this.isFetching[sheetName] = false;
        });
    }

    return mergedNodes;
  }

  private static ensureAllSubjectsPresent(nodes: TaxonomyNode[], pattern: string): TaxonomyNode[] {
    const cleanPattern = pattern.trim().toUpperCase();
    const result = [...nodes];

    // Helper to check if a subject exists in our parsed nodes list
    const hasSubject = (subj: string) => {
      const s = subj.toLowerCase().trim();
      return result.some((n) => n.subject.toLowerCase().trim() === s || 
                              n.subject.toLowerCase().trim().includes(s) || 
                              s.includes(n.subject.toLowerCase().trim()));
    };

    // Helper to load nodes from fallback backup file
    const loadBackupNodes = (filename: string): TaxonomyNode[] => {
      const backupPath = path.join(process.cwd(), filename);
      try {
        if (fs.existsSync(backupPath)) {
          console.log(`Loading fallback subjects from backup: ${filename}`);
          const data = fs.readFileSync(backupPath, 'utf-8');
          return JSON.parse(data);
        }
      } catch (e) {
        console.error(`Error loading backup file ${filename}:`, e);
      }
      return [];
    };

    if (cleanPattern === "JEE") {
      // JEE must have Physics, Chemistry, Math
      let jEEBackup: TaxonomyNode[] = [];
      const targetSubjects = ["Physics", "Chemistry", "Math"];
      
      for (const subj of targetSubjects) {
        if (!hasSubject(subj)) {
          if (jEEBackup.length === 0) {
            jEEBackup = loadBackupNodes("taxonomy_backup_11_12_JEE.json"); // has Physics, Chemistry, Math
          }
          console.log(`JEE: Subject ${subj} is missing from live spreadsheet. Supplementing from backup.`);
          const fallbackNodes = jEEBackup.filter(
            (n) => n.subject.toLowerCase().trim() === subj.toLowerCase().trim()
          );
          result.push(...fallbackNodes);
        }
      }
    } else if (cleanPattern === "NEET") {
      // NEET must have Physics, Chemistry, Biology
      let jEEBackup: TaxonomyNode[] = [];
      let cBSEBackup: TaxonomyNode[] = [];
      let nEETBackup: TaxonomyNode[] = [];

      // 1. Supplement Physics
      if (!hasSubject("Physics")) {
        console.log(`NEET: Subject Physics is missing from live spreadsheet. Supplementing from backup.`);
        nEETBackup = loadBackupNodes("taxonomy_backup_11_12_NEET.json");
        let fallbackNodes = nEETBackup.filter((n) => n.subject.toLowerCase().indexOf("physics") !== -1);
        if (fallbackNodes.length === 0) {
          if (jEEBackup.length === 0) jEEBackup = loadBackupNodes("taxonomy_backup_11_12_JEE.json");
          fallbackNodes = jEEBackup.filter((n) => n.subject.toLowerCase().indexOf("physics") !== -1);
        }
        result.push(...fallbackNodes);
      }

      // 2. Supplement Chemistry
      if (!hasSubject("Chemistry") && !hasSubject("Chem")) {
        console.log(`NEET: Subject Chemistry is missing from live spreadsheet. Supplementing from backup.`);
        if (jEEBackup.length === 0) jEEBackup = loadBackupNodes("taxonomy_backup_11_12_JEE.json");
        const fallbackNodes = jEEBackup.filter((n) => n.subject.toLowerCase().indexOf("chemistry") !== -1);
        result.push(...fallbackNodes);
      }

      // 3. Supplement Biology
      if (!hasSubject("Biology") && !hasSubject("Botany") && !hasSubject("Zoology")) {
        console.log(`NEET: Biology is missing. Supplementing Biology from CBSE backup.`);
        cBSEBackup = loadBackupNodes("taxonomy_backup_11_12_CBSE.json");
        const fallbackNodes = cBSEBackup.filter(
          (n) => n.subject.toLowerCase().indexOf("biology") !== -1
        ).map(n => ({
          ...n,
          subject: "Biology"
        }));
        result.push(...fallbackNodes);
      }
    } else if (cleanPattern === "CBSE") {
      // CBSE must have Physics, Chemistry, Mathematics, Biology
      let cBSEBackup: TaxonomyNode[] = [];
      const targetSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];
      for (const subj of targetSubjects) {
        if (!hasSubject(subj)) {
          if (cBSEBackup.length === 0) {
            cBSEBackup = loadBackupNodes("taxonomy_backup_11_12_CBSE.json");
          }
          console.log(`CBSE: Subject ${subj} is missing from live spreadsheet. Supplementing from backup.`);
          const fallbackNodes = cBSEBackup.filter(
            (n) => n.subject.toLowerCase().trim() === subj.toLowerCase().trim()
          );
          result.push(...fallbackNodes);
        }
      }
    }

    return result;
  }

  private static async refreshCache(sheetName: string): Promise<TaxonomyNode[]> {
    try {
      const url = this.getSheetUrl(sheetName);
      console.log(`Fetching taxonomy for sheet "${sheetName}" from URL: ${url}`);
      const response = await axios.get(url, { timeout: 3000 });
      
      const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const findValue = (row: any, keys: string[]) => {
        for (const key of keys) {
          const foundKey = Object.keys(row).find(
            (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
          );
          if (foundKey) return row[foundKey]?.toString().trim() || "";
        }
        return "";
      };

      const nodes: TaxonomyNode[] = records.map((row: any) => ({
        grade: findValue(row, ["Grade", "Class"]),
        subject: findValue(row, ["Subject", "Subject Name"]),
        chapterName: findValue(row, ["Chapter Name", "Chapter", "Chaptername"]),
        topicName: findValue(row, ["Topic name", "Topic", "Topicname", "Topic Name"]),
        subTopic01: findValue(row, ["Sub Topic 01", "Subtopic 01", "Sub Topic", "Subtopic", "Sub-Topic"])
      })).filter((node: TaxonomyNode) => node.grade || node.subject || node.chapterName || node.topicName);

      this.cache[sheetName] = nodes;
      this.lastFetched[sheetName] = Date.now();
      
      // Save local backup asynchronously
      const backupPath = this.getBackupPath(sheetName);
      fs.writeFile(backupPath, JSON.stringify(nodes, null, 2), (err) => {
        if (err) console.error(`Could not write taxonomy backup for ${sheetName}:`, err);
      });

      console.log(`Successfully fetched and parsed ${nodes.length} nodes for sheet "${sheetName}"`);
      return nodes;
    } catch (error) {
      console.warn(`Failed to fetch taxonomy for ${sheetName}. Reverting to local backup.`, error);
      return this.loadLocalBackup(sheetName);
    }
  }

  private static loadLocalBackup(sheetName: string): TaxonomyNode[] {
    const backupPath = this.getBackupPath(sheetName);
    try {
      if (fs.existsSync(backupPath)) {
        const data = fs.readFileSync(backupPath, 'utf-8');
        const nodes = JSON.parse(data);
        this.cache[sheetName] = nodes;
        return nodes;
      }
    } catch (e) {
      console.error(`Local taxonomy backup file is missing or corrupted for ${sheetName}:`, e);
    }
    return [];
  }
}
