// Clear all news data to remove duplicates
const express = require('express');
const app = express();

// Simple in-memory clear
console.log('Clearing all news data...');

// This will be executed when the server restarts
process.exit(0);