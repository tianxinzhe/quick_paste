const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = 'd:\\Project_AI\\quikfill\\images\\edge';
const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

async function resizeImages() {
  for (const file of files) {
    const inputPath = path.join(imagesDir, file);
    const tempPath = path.join(imagesDir, 'temp_' + file);
    
    try {
      const metadata = await sharp(inputPath).metadata();
      console.log(`Before: ${file} - ${metadata.width}x${metadata.height}`);
      
      await sharp(inputPath)
        .resize(1280, 800, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 1 } 
        })
        .toFile(tempPath);
      
      fs.unlinkSync(inputPath);
      fs.renameSync(tempPath, inputPath);
      
      const newMetadata = await sharp(inputPath).metadata();
      console.log(`After: ${file} - ${newMetadata.width}x${newMetadata.height}`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
  console.log('All images resized to 1280x800');
}

resizeImages();
