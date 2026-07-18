import { exec, execFile } from 'child_process';

console.log("Method 1: exec with double escaping");
const exePath = '"X:\\\\PogoDogo Build\\\\Pogo Doggo.exe"';
console.log("Path:", exePath);
exec(exePath, (err, stdout, stderr) => {
  if (err) {
    console.error("Method 1 failed:", err.message);
  } else {
    console.log("Method 1 succeeded");
  }
});

setTimeout(() => {
  console.log("\nMethod 2: execFile with normal path");
  const exePath2 = 'X:\\PogoDogo Build\\Pogo Doggo.exe';
  console.log("Path:", exePath2);
  execFile(exePath2, (err, stdout, stderr) => {
    if (err) {
      console.error("Method 2 failed:", err.message);
    } else {
      console.log("Method 2 succeeded");
    }
  });
}, 2000);
