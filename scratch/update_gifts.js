const fs = require('fs');
const path = require('path');

const giftsJsonPath = path.join(__dirname, '../assets/gifts/gifts.json');
const imagesDir = path.join(__dirname, '../assets/gifts/images');

let rawdata = fs.readFileSync(giftsJsonPath);
let gifts = JSON.parse(rawdata);

let updatedCount = 0;

gifts.forEach(gift => {
    const id = gift.id;
    const imageFilename = `${id}.png`;
    const imagePath = path.join(imagesDir, imageFilename);
    
    if (fs.existsSync(imagePath)) {
        if (!gift.image) {
            gift.image = `images/gifts/${imageFilename}`;
            updatedCount++;
        }
    }
});

fs.writeFileSync(giftsJsonPath, JSON.stringify(gifts, null, 2));

console.log(`Updated ${updatedCount} gifts with images.`);
