import * as fs from "fs";
import * as path from "path";

const filePath = path.join(process.cwd(), "src", "data", "JEE Main", "JEE Main PYQs (2015-2026).json");
if (fs.existsSync(filePath)) {
  const stats = fs.statSync(filePath);
  console.log(`File: ${filePath}`);
  console.log(`Size: ${stats.size} bytes`);
  
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(1000);
  const startPos = Math.max(0, stats.size - 1000);
  fs.readSync(fd, buffer, 0, 1000, startPos);
  console.log("Last 1000 chars:");
  console.log(buffer.toString("utf-8"));
  fs.closeSync(fd);
} else {
  console.log("File does not exist:", filePath);
}
