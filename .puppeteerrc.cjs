const { join } = require('path');

/**
 * Puppeteer configuration for Render deployment
 * This ensures Chrome is installed within the project directory
 * which persists between build and runtime on Render.
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
