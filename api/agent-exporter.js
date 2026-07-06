import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

export const maxDuration = 60; 

// Automatically attempt to map the server binary if an installer package exists
try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
} catch (e) {
    console.log("System note: Relying on global environment variables for FFmpeg binary location.");
}

async function downloadAsset(url, filename) {
    const tmpPath = path.join('/tmp', filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset acquisition failure: ${url} status ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    return tmpPath;
}

async function triggerDistribution(videoUrl, hookText) {
    const WEBHOOK_URL = process.env.AUTOMATION_WEBHOOK_URL;
    if (!WEBHOOK_URL) return;

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videoUrl: videoUrl,
                caption: `${hookText}\n\n#DGEA #TheCommon #Sovereignty`,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error("Distribution matrix skip:", error.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    const runId = Date.now();
    const outputPath = path.join('/tmp', `output_${runId}.mp4`);
    const srtPath = path.join('/tmp', `subs_${runId}.srt`);

    // Maintain tracking vectors for cleanup loops if things crash halfway
    const activeFiles = [outputPath, srtPath];

    try {
        const { audioUrl, images, hook, body, cta } = req.body;
        
        if (!audioUrl || !images || images.length < 3) {
            return res.status(400).json({ success: false, message: "Asset verification failed. Input channels incomplete." });
        }

        // Cache files inside container space
        const localAudio = await downloadAsset(audioUrl, `audio_${runId}.mp3`); activeFiles.push(localAudio);
        const localImg1 = await downloadAsset(images[0], `img1_${runId}.jpg`); activeFiles.push(localImg1);
        const localImg2 = await downloadAsset(images[1], `img2_${runId}.jpg`); activeFiles.push(localImg2);
        const localImg3 = await downloadAsset(images[2], `img3_${runId}.jpg`); activeFiles.push(localImg3);

        const srtContent = `1\n00:00:00,000 --> 00:00:04,000\n${hook}\n\n2\n00:00:04,000 --> 00:00:20,000\n${body}\n\n3\n00:00:20,000 --> 00:00:30,000\n${cta}`;
        fs.writeFileSync(srtPath, srtContent);

        await new Promise((resolve, reject) => {
            ffmpeg()
                // ========================================================
                // ARMORED IMPLEMENTATION: Forced explicit image loop parameters
                // ========================================================
                .input(localImg1).inputOptions(['-loop 1', '-t 10'])
                .input(localImg2).inputOptions(['-loop 1', '-t 10'])
                .input(localImg3).inputOptions(['-loop 1', '-t 10'])
                .input(localAudio)
                .complexFilter([
                    // Concat now receives 3 identical 10-second video streams with safe timebases
                    '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v_base]',
                    '[v_base]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[v_cropped]',
                    `[v_cropped]subtitles='${srtPath.replace(/'/g, "\\'")}':force_style='Fontname=Arial,Fontsize=18,PrimaryColour=&H00FFFF,Alignment=2,MarginV=140'[v_final]`
                ])
                .map('[v_final]')
                .map('3:a') 
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-preset ultrafast',
                    '-r 24',
                    '-crf 28',
                    '-shortest' 
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const videoBuffer = fs.readFileSync(outputPath);
        const blob = await put(`cmn_video_${runId}.mp4`, videoBuffer, {
            access: 'public',
            contentType: 'video/mp4'
        });

        await triggerDistribution(blob.url, hook);

        // Regular garbage collection loop
        activeFiles.forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });

        return res.status(200).json({ success: true, videoUrl: blob.url });

    } catch (error) {
        console.error("EXPORTER INTERCEPTOR CAUGHT FAULT:", error.message);
        
        // Dynamic cleanup to prevent filling server ephemeral storage on a failed build
        activeFiles.forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });

        // Force a valid JSON response so your user panel knows exactly what's broken
        return res.status(500).json({ 
            success: false, 
            error: "COMPILER_EXCEPTION",
            details: error.message,
            solution: error.message.includes("Cannot find ffmpeg") 
                ? "Run 'npm install @ffmpeg-installer/ffmpeg' in your project root." 
                : "Verify your asset URLs are accessible and not blocking connections."
        });
    }
}
