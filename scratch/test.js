const fs = require('fs');
const path = require('path');

const giftsJsonPath = path.join(__dirname, '../assets/gifts/gifts.json');
const imagesDir = path.join(__dirname, '../assets/gifts/images');

let rawdata = fs.readFileSync(giftsJsonPath, 'utf8');
let gifts = JSON.parse(rawdata);

const existingIds = new Set(gifts.map(g => String(g.id)));
console.log("Does existingIds have 10034?", existingIds.has("10034"));
console.log("Total existing gifts:", gifts.length);

const files = fs.readdirSync(imagesDir);
console.log("Total files in imagesDir:", files.length);

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

fs.writeFileSync(giftsJsonPath, JSON.stringify(gifts, null, 2));

console.log(`Added ${addedCount} new gifts.`);
