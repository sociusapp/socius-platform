const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Image compress karo (overwrite existing file)
 * @param {string} filePath - Input path
 * @param {number} quality - JPEG/PNG quality (0-100)
 */
const compressImage = async (filePath, quality = 80) => {
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }

        const ext = path.extname(filePath).toLowerCase();

        // PDF compression avoid karein
        if (ext === '.pdf') {
            return filePath;
        }

        const tempPath = `${filePath}_temp`;

        let pipeline = sharp(filePath);

        if (ext === '.png') {
            pipeline = pipeline.png({ quality, compressionLevel: 9 });
        } else {
            pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        }

        await pipeline.toFile(tempPath);

        // Overwrite original with compressed
        fs.renameSync(tempPath, filePath);

        const stats = fs.statSync(filePath);
        logger.info(`Compressed ${filePath}: ${stats.size} bytes`);

        return filePath;
    } catch (error) {
        logger.error('Image compression failed', error);
        return filePath; // Fallback to original
    }
};

module.exports = {
    compressImage,
};
