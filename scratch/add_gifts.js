const fs = require('fs');
const path = require('path');

const giftsJsonPath = path.join(__dirname, '../assets/gifts/gifts.json');
const imagesDir = path.join(__dirname, '../assets/gifts/images');

let rawdata = fs.readFileSync(giftsJsonPath);
let gifts = JSON.parse(rawdata);

const existingIds = new Set(gifts.map(g => String(g.id)));

const files = fs.readdirSync(imagesDir);

let addedCount = 0;

files.forEach(file => {
    if (file.endsWith('.png')) {
        const id = file.replace('.png', '');
        
        if (!existingIds.has(id)) {
            gifts.unshift({
                id: parseInt(id, 10),
                name: `Gift ${id}`,
                diamond: 1, // Default diamond cost
                image: `images/${file}`
            });
            addedCount++;
        }
    }
});

// Also, let's fix any existing gift that has an empty image but the file exists
let updatedCount = 0;
gifts.forEach(gift => {
    const id = gift.id;
    const imageFilename = `${id}.png`;
    const imagePath = path.join(imagesDir, imageFilename);
    
    if (fs.existsSync(imagePath) && !gift.image) {
        gift.image = `images/${imageFilename}`;
        updatedCount++;
    }
});

fs.writeFileSync(giftsJsonPath, JSON.stringify(gifts, null, 2));

console.log(`Added ${addedCount} new gifts. Updated ${updatedCount} existing gifts.`);
