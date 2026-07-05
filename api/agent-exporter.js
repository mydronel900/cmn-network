import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const config = {
    api: { responseLimit: false, bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method disallowed' });
    }

    const tmpDir = path.join(os.tmpdir(), `cmn_render_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
        const { hookText, bodyText, ctaText, audioUrl, images, durations } = req.body;

        const localAudioPath = path.join(tmpDir, 'narration.mp3');
        const localImg1 = path.join(tmpDir, 'img1.jpg');
        const localImg2 = path.join(tmpDir, 'img2.jpg');
        const localImg3 = path.join(tmpDir, 'img3.jpg');
        const localSubtitles = path.join(tmpDir, 'subs.srt');
        const outputMp4 = path.join(tmpDir, 'final_export.mp4');

        // Step 1: Download binary narration asset tracking array files
        const audioRes = await fetch(audioUrl);
        fs.writeFileSync(localAudioPath, await audioRes.buffer());

        // Step 2: Download high-resolution source imagery frames
        const imgRes1 = await fetch(images[0]); fs.writeFileSync(localImg1, await imgRes1.buffer());
        const imgRes2 = await fetch(images[1]); fs.writeFileSync(localImg2, await imgRes2.buffer());
        const imgRes3 = await fetch(images[2]); fs.writeFileSync(localImg3, await imgRes3.buffer());

        // Step 3: Build sub-second precision kinetic subtitles file (SRT format)
        const totalDuration = durations.intro + durations.body + durations.cta;
        const srtContent = `
1
00:00:00,000 --> 00:00:02,500
⚠️ CRITICAL DISPATCH: ${hookText.toUpperCase()}

2
00:00:02,500 --> 00:00:14,000
${bodyText}

3
00:00:14,000 --> 00:00:${Math.floor(totalDuration).toString().padStart(2, '0')},000
👉 ACTION ALERT: ${ctaText}
`.trim();
        fs.writeFileSync(localSubtitles, srtContent);

        // Step 4: Run FFmpeg processing filter graph matrix strings
        // This stretches visual inputs across specified duration windows and applies formatting overlays
        await new Promise((resolve, reject) => {
            ffmpeg()
                // Source visual layers
                .input(localImg1).loop(durations.intro)
                .input(localImg2).loop(durations.body)
                .input(localImg3).loop(durations.cta)
                // Source audio layer
                .input(localAudioPath)
                .complexFilter([
                    // Stitch image loops back-to-back into a single seamless continuous stream feed
                    '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v_base]',
                    // Apply scale and crop matrices ensuring strict mobile 1080x1920 proportions
                    '[v_base]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_cropped]',
                    // Burn customized subtitle overlays right over top of the output visual composition matrix
                    `[v_cropped]subtitles=${localSubtitles.replace(/\\/g, '/')}:force_style='Fontname=Arial,Fontsize=22,PrimaryColour=&H00FFFF,Alignment=2,MarginV=180'[v_final]`
                ])
                .map('[v_final]')
                .map('3:a') // Connect voice narration audio source
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-pix_fmt yuv420p',       // Maximizes file encoding compatibility across mobile platforms
                    `-t ${totalDuration}`,    // Forces stream truncation parameters precisely at track end boundaries
                    '-preset superfast'       // Prioritizes speed inside execution time limit parameters
                ])
                .output(outputMp4)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        // Step 5: Pipe file stream buffer straight back down client channels
        const fileBuffer = fs.readFileSync(outputMp4);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename=cmn_production.mp4`);
        return res.send(fileBuffer);

    } catch (error) {
        console.error("Exporter system thread collapsed:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        // Garbage collection: scrub transient directory blocks from processing systems memory
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (clearErr) {
            console.warn("Garbage collection cleanup skip:", clearErr);
        }
    }
}
