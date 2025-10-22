const path = require('path');

function getQualitySettings(quality) {
  const settings = {
    high: {
      resolution: parseInt(process.env.HIGH_RESOLUTION || '1080'),
      crf: parseInt(process.env.HIGH_QUALITY_CRF || '23'),
      bitrate: process.env.HIGH_BITRATE || '5000k',
      name: 'high'
    },
    medium: {
      resolution: parseInt(process.env.MEDIUM_RESOLUTION || '480'),
      crf: parseInt(process.env.MEDIUM_QUALITY_CRF || '28'),
      bitrate: process.env.MEDIUM_BITRATE || '2500k',
      name: 'medium'
    },
    low: {
      resolution: parseInt(process.env.LOW_RESOLUTION || '360'),
      crf: parseInt(process.env.LOW_QUALITY_CRF || '32'),
      bitrate: process.env.LOW_BITRATE || '1000k',
      name: 'low'
    }
  };
  
  return settings[quality] || settings.high;
}

function buildHLSCommand(ffmpeg, inputPath, outputPath, quality) {
  const settings = getQualitySettings(quality);
  const segmentDuration = parseInt(process.env.SEGMENT_DURATION || '10');
  const audioBitrate = process.env.AUDIO_BITRATE || '128k';
  
  return ffmpeg
    .input(inputPath)
    .outputOptions([
      '-c:v libx264',
      `-crf ${settings.crf}`,
      '-preset fast',
      '-profile:v high',
      '-level 4.0',
      `-vf scale=-2:${settings.resolution}`,
      '-c:a aac',
      `-b:a ${audioBitrate}`,
      '-ac 2',
      '-ar 48000',
      '-f hls',
      `-hls_time ${segmentDuration}`,
      '-hls_playlist_type vod',
      '-hls_segment_type mpegts',
      '-hls_segment_filename', path.join(outputPath, 'segment%03d.ts')
    ])
    .output(path.join(outputPath, 'playlist.m3u8'));
}

function buildPosterCommand(ffmpeg, inputPath, outputPath, seekTime = '10%') {
  return ffmpeg
    .input(inputPath)
    .seekInput(seekTime)
    .outputOptions([
      '-frames:v 1',
      '-vf scale=1280:720:force_original_aspect_ratio=decrease',
      '-q:v 2'
    ])
    .output(outputPath);
}

function generateMasterPlaylist(qualities, outputPath) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  
  const qualityBandwidths = {
    high: { bandwidth: 5000000, resolution: '1920x1080' },
    medium: { bandwidth: 2500000, resolution: '854x480' },
    low: { bandwidth: 1000000, resolution: '640x360' }
  };
  
  qualities.forEach(quality => {
    const info = qualityBandwidths[quality];
    if (info) {
      lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${info.bandwidth},RESOLUTION=${info.resolution}`);
      lines.push(`${quality}/playlist.m3u8`);
    }
  });
  
  return lines.join('\n');
}

module.exports = {
  getQualitySettings,
  buildHLSCommand,
  buildPosterCommand,
  generateMasterPlaylist
};
