import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// ========================================================
// OPTIMIZATION 1: EXTEND RUNTIME TO HOBBY TIER MAXIMUM
// ========================================================
export const maxDuration = 60; 

// Helper function to download network assets (audio/images) to Vercel's local /tmp directory
async function downloadAsset(url, filename) {
    const tmpPath = path.join('/tmp', filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch asset: ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    return tmpPath;
}

// Distribution sub-routine targeting Make.com or n8n
async function triggerDistribution(videoUrl, hookText) {
    const WEBHOOK_URL = process.env.AUTOMATION_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
        console.log("Distribution bypassed: AUTOMATION_WEBHOOK_URL not configured.");
        return;
    }

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videoUrl: videoUrl,
                caption: `${hookText}\n\n#DGEA #TheCommon #IndividualSovereignty #SimulationGlitch`,
                timestamp: new Date().toISOString()
            })
        });
        console.log("Distribution webhook successfully deployed to the matrix!");
    } catch (error) {
        console.error("Distribution execution failed:", error);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    // Ensure your temporary paths are isolated per function call
    const runId = Date.now();
    const outputPath = path.join('/tmp', `output_${runId}.mp4`);
    const srtPath = path.join('/tmp', `subs_${runId}.srt`);

    try {
        const { audioUrl, images, hook, body, cta } = req.body;
        
        if (!audioUrl || !images || images.length < 3) {
            return res.status(400).json({ success: false, message: "Missing required assets. Engine requires audio and 3 images." });
        }

        console.log("Initializing local file caching sequence...");
        // Synchronously fetch and download assets into server runtime memory/tmp
        const localAudio = await downloadAsset(audioUrl, `audio_${runId}.mp3`);
        const localImg1 = await downloadAsset(images[0], `img1_${runId}.jpg`);
        const localImg2 = await downloadAsset(images[1], `img2_${runId}.jpg`);
        const localImg3 = await downloadAsset(images[2], `img3_${runId}.jpg`);

        // Build simple kinetic subtitle file timing rules (approximate splits for short-form)
        const fullScriptText = `${hook} ${body} ${cta}`;
        const srtContent = `1\n00:00:00,000 --> 00:00:03,000\n${hook}\n\n2\n00:00:03,000 --> 00:00:20,000\n${body}\n\n3\n00:00:20,000 --> 00:00:30,000\n${cta}`;
        fs.writeFileSync(srtPath, srtContent);

        console.log("Launching optimized FFmpeg hyper-speed compilation matrix...");

        await new Promise((resolve, reject) => {
            ffmpeg()
                // Input visual elements 0, 1, 2 (forced loops to allow processing duration)
                .input(localImg1).loop(10)
                .input(localImg2).loop(10)
                .input(localImg3).loop(10)
                // Input audio element 3
                .input(localAudio)
                // ========================================================
                // OPTIMIZATION 2: THE HYPER-SPEED RENDERING MATRIX
                // ========================================================
                .complexFilter([
                    // Stitch images together, discarding silent native visual audio channels
                    '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v_base]',
                    // Drop processing load ~55% by converting output target from 1080p to 720p 
                    '[v_base]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[v_cropped]',
                    // Apply stylized subtitle overlay matching mobile screen aspect configurations
                    `[v_cropped]subtitles='${srtPath.replace(/'/g, "\\'")}':force_style='Fontname=Arial,Fontsize=18,PrimaryColour=&H00FFFF,Alignment=2,MarginV=140'[v_final]`
                ])
                .map('[v_final]')
                .map('3:a') // Bind the downloaded ElevenLabs voice track
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-preset ultrafast', // Bypasses slow deep-encoding cycles for raw speed
                    '-r 24',            // Caps frame math at 24fps instead of 30/60
                    '-crf 28',           // Aggressively compresses CPU load during file creation
                    '-shortest'          // Automatically cuts video execution matching audio length
                ])
                .output(outputPath)
                .on('end', () => {
                    console.log("FFmpeg compilation sequence successful.");
                    resolve();
                })
                .on('error', (err) => {
                    console.error("FFmpeg failure details:", err);
                    reject(err);
                })
                .run();
        });

        console.log("Uploading finished file to Vercel global storage networks...");
        const videoBuffer = fs.readFileSync(outputPath);
        const blob = await put(`cmn_video_${runId}.mp4`, videoBuffer, {
            access: 'public',
            contentType: 'video/mp4'
        });

        // Fire and forget distribution trigger asynchronously
        await triggerDistribution(blob.url, hook);

        // Cleanup local server files to avoid exhausting ephemeral /tmp workspace space
        try {
            fs.unlinkSync(outputPath);
            fs.unlinkSync(srtPath);
            fs.unlinkSync(localAudio);
            fs.unlinkSync(localImg1);
            fs.unlinkSync(localImg2);
            fs.unlinkSync(localImg3);
        } catch (cleanupErr) {
            console.warn("Garbage collection warning:", cleanupErr);
        }

        return res.status(200).json({ 
            success: true, 
            videoUrl: blob.url, 
            message: "Protocol node cycle complete. Video broadcasted to distribution matrix." 
        });

    } catch (error) {
        console.error("Node Exporter Fatal Collapse:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
