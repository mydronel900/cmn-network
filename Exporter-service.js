const express = require('express');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

async function downloadAsset(url, filename) {
    const tmpPath = path.join('/tmp', filename);
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    return tmpPath;
}

app.post('/api/agent-exporter', async (req, res) => {
    const runId = Date.now();
    const outputPath = path.join('/tmp', `output_${runId}.mp4`);
    const srtPath = path.join('/tmp', `subs_${runId}.srt`);
    const activeFiles = [outputPath, srtPath];

    try {
        const { audioUrl, images, hook, body, cta } = req.body;

        const localAudio = await downloadAsset(audioUrl, `audio_${runId}.mp3`); activeFiles.push(localAudio);
        const localImg1 = await downloadAsset(images[0], `img1_${runId}.jpg`); activeFiles.push(localImg1);
        const localImg2 = await downloadAsset(images[1], `img2_${runId}.jpg`); activeFiles.push(localImg2);
        const localImg3 = await downloadAsset(images[2], `img3_${runId}.jpg`); activeFiles.push(localImg3);

        const srtContent = `1\n00:00:00,000 --> 00:00:04,000\n${hook}\n\n2\n00:00:04,000 --> 00:00:20,000\n${body}\n\n3\n00:00:20,000 --> 00:00:30,000\n${cta}`;
        fs.writeFileSync(srtPath, srtContent);

        // On a native system, we don't need installer hacks—it uses the system-installed FFmpeg binary
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(localImg1).inputOptions(['-loop 1', '-t 10'])
                .input(localImg2).inputOptions(['-loop 1', '-t 10'])
                .input(localImg3).inputOptions(['-loop 1', '-t 10'])
                .input(localAudio)
                .complexFilter([
                    '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v_base]',
                    '[v_base]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_cropped]', // Back to beautiful 1080p!
                    `[v_cropped]subtitles='${srtPath.replace(/'/g, "\\'")}':force_style='Fontname=Arial,Fontsize=24,PrimaryColour=&H00FFFF,Alignment=2,MarginV=180'[v_final]`
                ])
                .map('[v_final]')
                .map('3:a')
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions(['-pix_fmt yuv420p', '-preset faster', '-shortest'])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const videoBuffer = fs.readFileSync(outputPath);
        const blob = await put(`cmn_video_${runId}.mp4`, videoBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: 'video/mp4'
        });

        // Cleanup files
        activeFiles.forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });

        return res.status(200).json({ success: true, videoUrl: blob.url });

    } catch (error) {
        activeFiles.forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => console.log(`DGEA Media Compiler Node online on port ${PORT}`));
