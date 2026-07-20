import * as fs from "fs";
import * as path from "path";

const filePath = path.join(process.cwd(), "ray_optics_extracted.txt");
const content = fs.readFileSync(filePath, "utf-8");

const questions = content.split(/--- INDEX \d+ \|/);

console.log(`Total blocks: ${questions.length}`);

const mirrorQuestions = [];
questions.forEach(qBlock => {
  if (qBlock.toLowerCase().includes("mirror")) {
    const idMatch = qBlock.match(/\s*(JEE|NEET)\s*\|\s*ID:\s*([a-f0-9]+)/i);
    const id = idMatch ? idMatch[2] : "unknown";
    const source = idMatch ? idMatch[1] : "unknown";
    
    const topicMatch = qBlock.match(/Topic:\s*(.*)/i);
    const topic = topicMatch ? topicMatch[1] : "unknown";
    
    const qTextMatch = qBlock.match(/Question:\s*([\s\S]*?)(Answer:|Options:|Solution:)/i);
    const qText = qTextMatch ? qTextMatch[1].replace(/\s+/g, " ").trim() : "unknown";
    
    mirrorQuestions.push({ id, source, topic, question: qText });
  }
});

console.log(`Found ${mirrorQuestions.length} mirror-related questions:`);
mirrorQuestions.forEach((mq, idx) => {
  console.log(`\n[${idx + 1}] [${mq.source}] ID: ${mq.id} | Topic: ${mq.topic}`);
  console.log(`    Q: ${mq.question.substring(0, 300)}...`);
});
