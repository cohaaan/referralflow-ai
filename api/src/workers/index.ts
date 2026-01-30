// Worker startup file - run this to start all background workers
import './ocr.worker';
import './classification.worker';
import './extraction.worker';
import './ai-processing.worker';

console.log('All workers started successfully');
console.log('Workers running:');
console.log('  - OCR Processing Worker');
console.log('  - Document Classification Worker');
console.log('  - Data Extraction Worker');
console.log('  - AI Processing Worker');

// Keep process alive
process.on('SIGINT', () => {
  console.log('Shutting down workers...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down workers...');
  process.exit(0);
});
