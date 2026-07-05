import fs from 'fs';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

// Set path for Vercel's environment
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const config = {
    api: { responseLimit: false, bodyParser: { sizeLimit: '15mb' } }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method disallowed' });
    }

    const tmpDir = path.join(os.tmpdir(), `cmn_${Date.now()}`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    try {
        const { hookText, bodyText, ctaText, audioUrl, images, durations } = req.body;

        const localAudioPath = path.join(tmpDir, 'narration.mp3');
        const localImg1 = path.join(tmpDir, 'img1.jpg');
        const localImg2 = path.join(tmpDir, 'img2.jpg');
        const localImg3 = path.join(tmpDir, 'img3.jpg');
        const localSubtitles = path.join(tmpDir, 'subs.srt');
        const outputMp4 = path.join(tmpDir, 'final.mp4');

        // CONSISTENT FETCH: Use arrayBuffer() + Buffer.from() instead of .buffer()
        const downloadFile = async (url, dest) => {
            const response = await fetch(url);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(dest, buffer);
        };

        await downloadFile(audioUrl, localAudioPath);
        await downloadFile(images[0], localImg1);
        await downloadFile(images[1], localImg2);
        await downloadFile(images[2], localImg3);

        // Build SRT
        const totalDuration = durations.intro + durations.body + durations.cta;
        const srtContent = `1\n00:00:00,000 --> 00:00:02,500\n⚠️ ${hookText.toUpperCase()}\n\n2\n00:00:02,500 --> 00:00:14,000\n${bodyText}\n\n3\n00:00:14,000 --> 00:00:${Math.floor(totalDuration).toString().padStart(2, '0')},000\n👉 ${ctaText}`;
        fs.writeFileSync(localSubtitles, srtContent);

        // FFmpeg Logic
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(localImg1).loop(durations.intro)
                .input(localImg2).loop(durations.body)
                .input(localImg3).loop(durations.cta)
                .input(localAudioPath)
                .complexFilter([
                    '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v_base]',
                    '[v_base]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_cropped]',
                    `[v_cropped]subtitles='${localSubtitles.replace(/'/g, "\\'")}':force_style='Fontname=Arial,Fontsize=22,PrimaryColour=&H00FFFF,Alignment=2,MarginV=180'[v_final]`
                ])
                .map('[v_final]')
                .map('3:a')
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    `-t ${totalDuration}`,
                    '-preset superfast'
                ])
                .output(outputMp4)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Return file
        const fileBuffer = fs.readFileSync(outputMp4);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename=cmn_production.mp4');
        return res.send(fileBuffer);

    } catch (error) {
        console.error("Exporter Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
}
