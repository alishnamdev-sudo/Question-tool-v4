import * as fs from "fs";
import * as path from "path";
import stringSimilarity from "string-similarity";

// Define the target LaTeX questions we want to map back to the database
const targetQuestions = [
  {
    num: 1,
    text: "What is the correct IUPAC name of the compound CH3-CH(CH3)-CH2-CH=CH2?",
    keywords: ["CH3-CH(CH3)-CH2-CH=CH2", "IUPAC name", "4-Methylpent-1-ene", "2-Methylpent-4-ene"]
  },
  {
    num: 2,
    text: "Which of the following alkanes cannot be prepared in good yield by the Wurtz reaction?",
    keywords: ["cannot be prepared in good yield by the Wurtz reaction", "Wurtz reaction", "Heptane", "Butane"]
  },
  {
    num: 3,
    text: "Which of the following alkanes yields only one monochlorinated product upon photochemical chlorination?",
    keywords: ["yields only one monochlorinated product upon photochemical chlorination", "monochlorinated product", "photochemical chlorination", "Dimethylpropane"]
  },
  {
    num: 4,
    text: "The major product formed when 2-bromobutane is treated with alcoholic KOH is:",
    keywords: ["2-bromobutane", "alcoholic KOH", "But-2-ene", "Dehydrohalogenation", "Zaitsev"]
  },
  {
    num: 5,
    text: "The IUPAC name of the compound CH3-C \\equiv C-CH(CH3)2 is:",
    keywords: ["CH3-C", "C-CH(CH3)2", "4-Methylpent-2-yne", "IUPAC"]
  },
  {
    num: 6,
    text: "Electrolysis of an aqueous solution of sodium acetate produces which of the following gases at the anode?",
    keywords: ["Electrolysis", "sodium acetate", "anode", "ethane", "CO2", "Kolbe"]
  },
  {
    num: 7,
    text: "The complete combustion of one mole of an alkane produces 4 moles of H2O. The alkane is:",
    keywords: ["combustion", "alkane produces 4 moles of H2O", "Propane", "moles of H2O"]
  },
  {
    num: 8,
    text: "The reduction of but-2-yne with H2 in the presence of Lindlar's catalyst yields:",
    keywords: ["but-2-yne", "Lindlar", "cis-But-2-ene", "trans-But-2-ene", "reduction"]
  },
  {
    num: 9,
    text: "What is the correct IUPAC name of the compound CH2=CH-CH2-C \\equiv CH?",
    keywords: ["CH2=CH-CH2-C", "IUPAC", "Pent-1-en-4-yne", "priority"]
  },
  {
    num: 10,
    text: "An alkyl halide RX reacts with magnesium in dry ether to form a Grignard reagent, which upon treatment with D2O yields 2-methylbutane-2-d. The original alkyl halide RX is:",
    keywords: ["Grignard reagent", "D2O", "2-methylbutane-2-d", "original alkyl halide RX"]
  },
  {
    num: 11,
    text: "Which of the following alkanes will yield a mixture of exactly three monochloro structural isomers upon photochemical chlorination?",
    keywords: ["mixture of exactly three monochloro structural isomers", "n-Pentane", "photochemical chlorination"]
  },
  {
    num: 12,
    text: "2-Bromo-2-methylbutane reacts with sodium ethoxide in ethanol to give product A (major) and with potassium tert-butoxide in tert-butanol to give product B (major). Identify A and B.",
    keywords: ["2-Bromo-2-methylbutane reacts with sodium ethoxide", "potassium tert-butoxide", "Saytzeff", "Hofmann"]
  },
  {
    num: 13,
    text: "The correct IUPAC name of the compound CH3-CH2-C(CH3)2-CH2-CH(CH3)-CH(CH3)2 is:",
    keywords: ["CH3-CH2-C(CH3)2-CH2-CH(CH3)-CH(CH3)2", "IUPAC", "2,3,5,5-Tetramethylheptane"]
  },
  {
    num: 14,
    text: "An aqueous solution of sodium 3-methylbutanoate is subjected to Kolbe's electrolysis. The major hydrocarbon product formed at the anode is:",
    keywords: ["sodium 3-methylbutanoate", "Kolbe", "anode", "2,5-Dimethylhexane", "isobutyl"]
  },
  {
    num: 15,
    text: "A gaseous alkane requires exactly 6.5 times its own volume of oxygen for complete combustion under the same conditions of temperature and pressure. The alkane is:",
    keywords: ["requires exactly 6.5 times its own volume of oxygen", "combustion", "Butane"]
  },
  {
    num: 16,
    text: "2-Bromo-3-methylpentane is treated with alcoholic KOH. How many total alkene products (including stereoisomers) are formed?",
    keywords: ["2-Bromo-3-methylpentane", "alcoholic KOH", "stereoisomers", "alkene products"]
  },
  {
    num: 17,
    text: "Consider the highly branched alkane with the condensed formula CH3CH2C(CH3)2CH(CH2CH2CH3)CH(CH(CH3)2)CH(CH2CH3)CH2CH3. What is the sum of the locants of all substituents in its correct IUPAC name?",
    keywords: ["highly branched alkane with the condensed formula", "sum of the locants", "IUPAC name"]
  },
  {
    num: 18,
    text: "31.2 g of an alkyl iodide (RI) reacts completely with sodium in dry ether to produce 5.8 g of a symmetric alkane (R-R). What is the molar mass of the alkane R-R in g mol-1?",
    keywords: ["31.2 g of an alkyl iodide", "symmetric alkane", "Wurtz", "molar mass"]
  },
  {
    num: 19,
    text: "A gaseous mixture of 10 mL of an alkane and 80 mL of O2 (excess) is exploded. After cooling to room temperature, the volume of the residual gas is 60 mL. On passing this residual gas through KOH solution, its volume decreases by 30 mL. What is the molecular mass of the alkane in g mol-1?",
    keywords: ["10 mL of an alkane", "80 mL of O2", "residual gas", "KOH solution", "molecular mass"]
  },
  {
    num: 20,
    text: "2,2-Dimethylpentan-3-ol is heated with concentrated H2SO4. The major alkene product formed is subjected to ozonolysis followed by reductive workup (Zn/H2O). What is the molar mass of the heavier carbonyl compound formed in g mol-1?",
    keywords: ["2,2-Dimethylpentan-3-ol", "concentrated H2SO4", "ozonolysis", "reductive workup", "molar mass"]
  },
  {
    num: 21,
    text: "Consider the alkane with the following condensed structural formula: CH3CH2-CH(CH2CH2CH3)-CH(CH2CH3)-CH(CH(CH3)2)-CH2CH2CH3. Let P be the number of carbon atoms in the principal chain, S be the total number of substituents... Find P+S+L.",
    keywords: ["P be the number of carbon atoms", "principal chain", "substituents", "locants", "P + S + L"]
  },
  {
    num: 22,
    text: "An optically active carboxylic acid A (molecular formula C7H14O2) undergoes decarboxylation on heating with soda lime to give an alkane B. Alkane B on photochemical monochlorination yields exactly 2 structural isomers. Let x be the total number of possible structures for A... Let y be the molar mass... Find x+y.",
    keywords: ["optically active carboxylic acid", "C7H14O2", "decarboxylation", "soda lime", "monochlorination", "structural isomers"]
  },
  {
    num: 23,
    text: "One mole of a straight-chain alkane X requires 12.5 moles of O2 for complete combustion. When X is heated with Cr2O3/Al2O3 at 773 K and 10-20 atm, it undergoes aromatization to give a mixture of aromatic isomers. Let Y be the isomer... Find m*n.",
    keywords: ["straight-chain alkane X", "12.5 moles of O2", "Cr2O3/Al2O3", "aromatization", "hyperconjugation", "sigma-bonds", "pi-bonds"]
  },
  {
    num: 24,
    text: "When 3-bromo-3-methylpentane is heated with sodium ethoxide in ethanol, a dehydrohalogenation reaction occurs to form a mixture of alkenes. Let x be... Let y be... Find x*y.",
    keywords: ["3-bromo-3-methylpentane", "sodium ethoxide", "dehydrohalogenation", "alkenes", "alpha-hydrogens", "x * y"]
  }
];

// Load the JSON databases
const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");

let allQuestions: any[] = [];

if (fs.existsSync(jeePath)) {
  const jeeData = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
  allQuestions = allQuestions.concat(jeeData.map((q: any) => ({ ...q, source: "JEE" })));
}
if (fs.existsSync(neetPath)) {
  const neetData = JSON.parse(fs.readFileSync(neetPath, "utf-8"));
  allQuestions = allQuestions.concat(neetData.map((q: any) => ({ ...q, source: "NEET" })));
}

console.log(`Loaded ${allQuestions.length} questions in total from default databases.`);

// Find best matches for each target question
targetQuestions.forEach(target => {
  let bestMatch: any = null;
  let highestScore = 0;

  for (const q of allQuestions) {
    const qText = q.Question || "";
    
    // Calculate string similarity on full text
    let score = stringSimilarity.compareTwoStrings(target.text.toLowerCase(), qText.toLowerCase());

    // Also look at keyword presence to boost matching
    let keywordMatches = 0;
    target.keywords.forEach(kw => {
      if (qText.toLowerCase().includes(kw.toLowerCase())) {
        keywordMatches++;
      }
    });

    if (keywordMatches > 0) {
      score += keywordMatches * 0.15;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = q;
    }
  }

  console.log(`\n========================================`);
  console.log(`LATEX QUESTION ${target.num}: "${target.text}"`);
  if (bestMatch && highestScore > 0.3) {
    console.log(`MATCHED PYQ SOURCE: [${bestMatch.source}] [ID: ${bestMatch.QuestionId || "N/A"}] (Score: ${highestScore.toFixed(3)})`);
    console.log(`Chapter: ${bestMatch.Tags?.[0]?.Chapter || "N/A"} | Topic: ${bestMatch.Tags?.[0]?.Topic || "N/A"}`);
    console.log(`Original Question: "${bestMatch.Question?.replace(/\s+/g, " ").trim()}"`);
    console.log(`Original Answer: ${JSON.stringify(bestMatch.Answer)}`);
    console.log(`Original Options: ${JSON.stringify(bestMatch.Options)}`);
    console.log(`Original Solution: "${bestMatch.Solution?.replace(/\s+/g, " ").trim().substring(0, 150)}..."`);
  } else {
    console.log(`NO STRONG MATCH FOUND (Highest score: ${highestScore.toFixed(3)})`);
  }
});
