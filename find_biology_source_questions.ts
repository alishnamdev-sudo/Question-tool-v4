import * as fs from "fs";
import * as path from "path";
import stringSimilarity from "string-similarity";

// Define the 24 Biology questions from the user's LaTeX file
const targetQuestions = [
  {
    num: 1,
    text: "The presence of a body cavity which is not lined by mesoderm, but where mesoderm is present as scattered pouches in between the ectoderm and endoderm, is called:",
    keywords: ["body cavity", "lined by mesoderm", "scattered pouches", "pseudocoelom"]
  },
  {
    num: 2,
    text: "Flame cells in flatworms (Platyhelminthes) are primarily responsible for:",
    keywords: ["flame cells", "flatworms", "osmoregulation", "excretion"]
  },
  {
    num: 3,
    text: "In molluscs, the file-like rasping organ present in the mouth for feeding is called:",
    keywords: ["molluscs", "file-like", "rasping", "radula"]
  },
  {
    num: 4,
    text: "The most distinctive feature of echinoderms is the presence of:",
    keywords: ["echinoderms", "distinctive feature", "water vascular"]
  },
  {
    num: 5,
    text: "In some animals, the body is externally and internally divided into segments with a serial repetition of at least some organs. This phenomenon is known as metamerism, and it is characteristically seen in Earthworms.",
    keywords: ["segments", "serial repetition", "metamerism", "earthworms"]
  },
  {
    num: 6,
    text: "Select the incorrect statement regarding the members of Phylum Platyhelminthes: ... They have a complete digestive system",
    keywords: ["Platyhelminthes", "incorrect", "digestive system"]
  },
  {
    num: 7,
    text: "In molluscs, the space between the hump and the mantle is called the mantle cavity in which feather-like gills are present. These gills have only respiratory functions and do not play any role in excretion.",
    keywords: ["molluscs", "mantle cavity", "feather-like gills", "excretion"]
  },
  {
    num: 8,
    text: "Adult echinoderms are radially symmetrical but their larvae are bilaterally symmetrical. Echinoderms are triploblastic and coelomate animals with a complete digestive system.",
    keywords: ["echinoderms", "radially symmetrical", "larvae", "bilaterally"]
  },
  {
    num: 9,
    text: "Match Column I with Column II regarding the basis of classification: Acoelomate, Pseudocoelomate, Radial symmetry, Bilateral symmetry",
    keywords: ["Acoelomate", "Pseudocoelomate", "Radial symmetry", "Bilateral"]
  },
  {
    num: 10,
    text: "How many of the following statements are correct regarding Phylum Platyhelminthes? (i) endoparasites (ii) Planaria (iii) flame cells (iv) sexes are separate",
    keywords: ["Platyhelminthes", "Planaria", "flame cells", "sexes are separate"]
  },
  {
    num: 11,
    text: "In molluscs, the space between the visceral hump and the mantle is called the mantle cavity in which feather-like gills are present. These gills have only respiratory functions and do not participate in excretion.",
    keywords: ["visceral hump", "mantle cavity", "feather-like gills", "respiratory"]
  },
  {
    num: 12,
    text: "Match the organisms in Column I with their common names in Column II. Asterias, Echinus, Antedon, Ophiura",
    keywords: ["Asterias", "Echinus", "Antedon", "Ophiura"]
  },
  {
    num: 13,
    text: "Notochord is a mesodermally derived rod-like structure formed on the:",
    keywords: ["notochord", "mesodermally", "rod-like", "dorsal"]
  },
  {
    num: 14,
    text: "Specialized cells called flame cells in Platyhelminthes help in:",
    keywords: ["flame cells", "Platyhelminthes", "osmoregulation", "excretion"]
  },
  {
    num: 15,
    text: "The file-like rasping organ present in the mouth of molluscs for feeding is called:",
    keywords: ["rasping", "molluscs", "feeding", "radula"]
  },
  {
    num: 16,
    text: "How many of the following organisms belong to Phylum Echinodermata? Asterias, Echinus, Antedon, Cucumaria, Ophiura, Pila, Sepia, Loligo.",
    keywords: ["Echinodermata", "Asterias", "Echinus", "Antedon", "Cucumaria", "Ophiura"]
  },
  {
    num: 17,
    text: "How many of the following animals possess a true coelom? Sycon, Obelia, Pleurobrachia, Fasciola, Ascaris, Nereis, Apis, Pila, Asterias, Balanoglossus.",
    keywords: ["true coelom", "Sycon", "Obelia", "Pleurobrachia", "Fasciola", "Ascaris", "Nereis", "Apis", "Pila", "Asterias", "Balanoglossus"]
  },
  {
    num: 18,
    text: "Read the following features: (i) Dorso-ventrally flattened body (ii) Bilateral symmetry (iii) Triploblastic (iv) Pseudocoelomate (v) Organ level of organisation (vi) Flame cells for excretion (vii) Dioecious (viii) Internal fertilisation (ix) Indirect development. How many of the above features are correct for Phylum Platyhelminthes?",
    keywords: ["features", "Platyhelminthes", "Dorso-ventrally flattened", "Bilateral symmetry"]
  },
  {
    num: 19,
    text: "How many of the following are correctly matched with their common names? Pila - Apple snail, Pinctada - Pearl oyster, Sepia - Cuttlefish, Loligo - Squid, Octopus - Devil fish, Aplysia - Sea hare, Dentalium - Tusk shell, Chaetopleura - Chiton",
    keywords: ["Pila", "Pinctada", "Sepia", "Loligo", "Octopus", "Aplysia", "Dentalium", "Chaetopleura"]
  },
  {
    num: 20,
    text: "Consider the following statements regarding Phylum Echinodermata: (i) They have an endoskeleton of calcareous ossicles (ii) Adult echinoderms are bilaterally symmetrical (iii) An excretory system is absent (iv) Mouth is on the dorsal side and anus on the ventral side (v) Water vascular system is present (vi) Fertilisation is usually internal",
    keywords: ["Echinodermata", "calcareous ossicles", "bilaterally symmetrical", "excretory system is absent", "water vascular"]
  },
  {
    num: 21,
    text: "Consider the following list of animals: Nereis, Pheretima, Hirudinaria, Periplaneta, Pila, Asterias, Balanoglossus, Scoliodon, Fasciola, Taenia, Ascaris, Wuchereria, Adamsia, Physalia. How many of these animals possess a true coelom (are coelomates)?",
    keywords: ["list of animals", "Nereis", "Pheretima", "Hirudinaria", "Periplaneta", "Pila", "Asterias", "Balanoglossus", "Scoliodon", "Fasciola", "Taenia", "Ascaris", "Wuchereria", "Adamsia", "Physalia"]
  },
  {
    num: 22,
    text: "Read the following statements regarding Phylum Platyhelminthes: (i) dorso-ventrally flattened body (ii) bilaterally symmetrical, triploblastic and acoelomate (iii) organ system level of organisation (iv) Hooks and suckers (v) Flame cells (vi) Sexes are separate (vii) Fertilisation is internal (viii) Fasciola is a free-living flatworm",
    keywords: ["statements regarding Phylum Platyhelminthes", "dorso-ventrally flattened", "triploblastic", "organ system level", "Hooks and suckers", "Fasciola", "free-living"]
  },
  {
    num: 23,
    text: "Read the following statements regarding Phylum Mollusca: (i) second largest animal phylum (ii) bilaterally symmetrical (iii) body is covered by a chitinous shell (iv) soft and spongy layer of skin forms a mantle (v) space between head and muscular foot (vi) sensory tentacles (vii) radula (viii) monoecious and viviparous",
    keywords: ["statements regarding Phylum Mollusca", "second largest animal phylum", "chitinous shell", "mantle over the visceral hump", "sensory tentacles", "radula", "monoecious", "viviparous"]
  },
  {
    num: 24,
    text: "Consider the following characteristics: (i) Endoskeleton of calcareous ossicles (ii) Adult is radially symmetrical but larvae are bilaterally symmetrical (iii) Excretory system is well developed (iv) Water vascular system (v) Sexes are separate (vi) Fertilisation is usually internal (vii) Development is indirect (viii) exclusively marine (ix) Mouth is on upper (dorsal) side (x) Asterias and Ophiura are examples.",
    keywords: ["characteristics", "Echinodermata", "radially symmetrical but larvae", "exclusively marine", "Asterias", "Ophiura"]
  }
];

const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");

if (!fs.existsSync(neetPath)) {
  console.error("NEET PYQs database not found!");
  process.exit(1);
}

const neetData = JSON.parse(fs.readFileSync(neetPath, "utf-8"));
console.log(`Loaded ${neetData.length} questions from NEET PYQs database.`);

const results = targetQuestions.map(target => {
  console.log(`\n==================================================`);
  console.log(`TARGET QUESTION ${target.num}: ${target.text.substring(0, 100)}...`);
  console.log(`==================================================`);

  // Score each question
  const scored = neetData.map((q: any) => {
    const qText = q.Question || "";
    const solText = q.Solution || "";
    const combined = (qText + " " + solText).toLowerCase();

    // Word matches on keywords
    let keywordCount = 0;
    target.keywords.forEach(kw => {
      if (combined.includes(kw.toLowerCase())) {
        keywordCount++;
      }
    });

    // String similarity on question text
    const similarity = stringSimilarity.compareTwoStrings(target.text.toLowerCase(), qText.toLowerCase());

    // Combined score
    const score = similarity * 0.4 + (keywordCount / target.keywords.length) * 0.6;

    return { q, score, similarity, keywordCount };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return { target, scored };
});

const outLines: string[] = [];

results.forEach(({ target, scored }) => {
  outLines.push(`==================================================`);
  outLines.push(`TARGET QUESTION ${target.num}: ${target.text}`);
  outLines.push(`==================================================`);

  // Print top 5 matches to be absolutely sure we capture the correct source question
  for (let i = 0; i < 5; i++) {
    const match = scored[i];
    if (match) {
      outLines.push(`  MATCH ${i + 1} (Combined Score: ${match.score.toFixed(3)}, Similarity: ${match.similarity.toFixed(3)}, KeyMatches: ${match.keywordCount}/${target.keywords.length})`);
      outLines.push(`  QuestionId: ${match.q.QuestionId}`);
      outLines.push(`  Year: ${match.q.Year || match.q.Tags?.[0]?.Year || "N/A"}`);
      outLines.push(`  Chapter/Topic: ${match.q.Tags?.[0]?.Chapter || "N/A"} -> ${match.q.Tags?.[0]?.Topic || "N/A"}`);
      outLines.push(`  Question: ${match.q.Question?.replace(/\s+/g, " ").trim()}`);
      outLines.push(`  Answer: ${JSON.stringify(match.q.Answer)}`);
      outLines.push(`  Options: ${JSON.stringify(match.q.Options)}`);
      outLines.push(`  Solution: ${match.q.Solution?.replace(/\s+/g, " ").trim().substring(0, 300)}...`);
      outLines.push(`  ----------------------------------------------`);
    }
  }
  outLines.push("\n");
});

fs.writeFileSync("biology_source_matches.txt", outLines.join("\n"));
console.log("Wrote all matches to biology_source_matches.txt");

