/**
 * CMN RWA Telemetry Simulator
 * Continuously pushes simulated IoT / commodity index changes to the local node.
 */

const TARGET_API = 'http://localhost:3000/api/update-telemetry';

// Baseline tracking values to simulate organic market/sensor fluctuations
const telemetryFeeds = [
    { feedType: 'renewableEnergy', key: 'solar_array_zone_3_kwh', current: 42.5, variance: 1.5 },
    { feedType: 'digitalInfrastructure', key: 'datacenter_rack_load_pct', current: 78.0, variance: 0.8 },
    { feedType: 'commodity', key: 'copper_spot_usd_kg', current: 8.45, variance: 0.05 }
];

function log(msg) {
    console.log(`[🤖 ORACLE SIMULATOR] ${new Date().toLocaleTimeString()} - ${msg}`);
}

async function runTick() {
    // Pick a random sensor element to modulate
    const target = telemetryFeeds[Math.floor(Math.random() * telemetryFeeds.length)];
    
    // Calculate a small random walk fluctuation (up or down)
    const drift = (Math.random() * 2 - 1) * target.variance;
    target.current = Math.max(0.1, target.current + drift);

    const payload = {
        feedType: target.feedType,
        key: target.key,
        value: target.current.toFixed(2)
    };

    try {
        const response = await fetch(TARGET_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            log(`Updated ${payload.key} ➔ ${payload.value} (Parity Engine Recalculated)`);
        } else {
            log(`⚠️ Endpoint rejected payload: ${data.error}`);
        }
    } catch (err) {
        log(`❌ Connection failure. Make sure your local node server is running on port 3000.`);
    }

    // Schedule next data broadcast between 3 to 6 seconds out
    const nextInterval = Math.floor(Math.random() * 3000) + 3000;
    setTimeout(runTick, nextInterval);
}

console.log('===================================================');
console.log('  CMN Real-Time Real-World Asset Telemetry Active  ');
console.log('===================================================');
log('Starting background transmission loop...');
runTick();
