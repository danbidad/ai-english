import { YouTubeTranscriptCli } from './cli.js';

// Configure logging
console.log = console.log || function() {};

function main(): void {
  // Get command line arguments without the first two elements (node and script name)
  const args = process.argv.slice(2);

  // Run the CLI with the provided arguments
  const result = new YouTubeTranscriptCli(args).run();
  console.log(result);
}

// Check if this file is being run directly
if (require.main === module) {
  main();
}

export { main };
