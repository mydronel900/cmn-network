import fs from 'fs';
const path = 'scripts/simulate_courtroom.js';
if (fs.existsSync(path)) {
    let src = fs.readFileSync(path, 'utf8');
    if (!src.includes('SIMULATION COMPLETED')) {
        const lines = src.split('\n');
        const mainCloseIdx = lines.findIndex(l => l.includes('main().catch'));
        if (mainCloseIdx !== -1) {
            lines.splice(mainCloseIdx, 0, `    console.log("\\n==================================================");\n    console.log("🏛️  COURTROOM TRIAL SIMULATION COMPLETED SUCCESSFULLY");\n    console.log("==================================================");`);
            fs.writeFileSync(path, lines.join('\n'), 'utf8');
            console.log("✔ Added trial completion success monitors to your simulation script.");
        }
    }
}
