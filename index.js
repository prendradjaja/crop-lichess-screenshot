const fs = require('fs');
const PNG = require('pngjs').PNG;


const BRIGHTNESS_CUTOFF = 99;


function main() {
  if (process.argv.length < 4) {
    console.log('Usage: node index.js INPUT_PATH OUTPUT_PATH');
    return;
  }

  const [inputPath, outputPath] = process.argv.slice(2);

  // Read file
  const inputPng = PNG.sync.read(fs.readFileSync(inputPath));

  // Crop
  const cropCoordinates = findCropCoordinates(inputPng);
  crop(inputPng, ...cropCoordinates);

  // Write file
  const outputBuffer = PNG.sync.write(inputPng);
  fs.writeFileSync(outputPath, outputBuffer);
}

function crop(png, xMin, xMax, yMin, yMax) {
  // A more obvious implementation would be to create a new PNG object to use
  // as output -- something like this:
  //
  //   const outputPng = new PNG({...});
  //   copyRegion(png, outputPng);
  //   return outputPng;
  //
  // Haven't been able to get that to work, so I have to do something hacky
  // and reuse my existing PNG object as output.

  // Make a copy of `png` since we're mutating it
  const tempPng = {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.data), // Copy buffer
  };

  copyRegion(tempPng, png, xMin, xMax, yMin, yMax);
}

/**
 * Copy a region from src into dst (also set dst's dimensions accordingly)
 *
 * xMax and yMax are inclusive
 */
function copyRegion(srcPng, dstPng, xMin, xMax, yMin, yMax) {
  const width = xMax - xMin + 1;
  const height = yMax - yMin + 1;
  dstPng.width = width;
  dstPng.height = height;
  for (let dstY = 0; dstY < height; dstY++) {
    for (let dstX = 0; dstX < width; dstX++) {
      let srcX = dstX + xMin;
      let srcY = dstY + yMin;
      const color = getColor(srcPng, srcX, srcY);
      setColor(dstPng, dstX, dstY, color);
    }
  }
}

function getColor(png, x, y) {
  const idx = (png.width * y + x) << 2;
  return png.data.slice(idx, idx + 3);
}

function setColor(png, x, y, color) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
}

function getBrightness(rgb) {
  // There are various ways of calculating brightness/perceived-brightness
  // of a color, I guess. For this use case, the simplest is sufficient.

  const [r, g, b] = rgb;
  const average = (r + g + b) / 3;
  return Math.floor(average);
}

function findCropCoordinates(inputPng) {
  let xMin = 0;
  let xMax = inputPng.width - 1;
  let yMin = 0;
  let yMax = inputPng.height - 1;

  // yMin
  outerLoop:
  for (let y = 0; y < inputPng.height; y++) { // iterate down
    for (let x = 0; x < inputPng.width; x++) {
      const color = getColor(inputPng, x, y);
      if (getBrightness(color) > BRIGHTNESS_CUTOFF) {
        yMin = y;
        break outerLoop;
      }
    }
  }

  // yMax
  outerLoop:
  for (let y = inputPng.height - 1; y >= 0; y--) { // iterate up
    for (let x = 0; x < inputPng.width; x++) {
      const color = getColor(inputPng, x, y);
      if (getBrightness(color) > BRIGHTNESS_CUTOFF) {
        yMax = y;
        break outerLoop;
      }
    }
  }

  // xMin
  outerLoop:
  for (let x = 0; x < inputPng.width; x++) { // iterate right
    for (let y = 0; y < inputPng.height; y++) {
      const color = getColor(inputPng, x, y);
      if (getBrightness(color) > BRIGHTNESS_CUTOFF) {
        xMin = x;
        break outerLoop;
      }
    }
  }

  // xMax
  outerLoop:
  for (let x = inputPng.width - 1; x >= 0; x--) { // iterate left
    for (let y = 0; y < inputPng.height; y++) {
      const color = getColor(inputPng, x, y);
      if (getBrightness(color) > BRIGHTNESS_CUTOFF) {
        xMax = x;
        break outerLoop;
      }
    }
  }

  return [xMin, xMax, yMin, yMax];
}

main();
