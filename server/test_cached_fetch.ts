import { cachedFetch } from './utils/cached_fetch.js';

/**
 * Test script for the cachedFetch function
 */
async function testCachedFetch() {
  console.log('Testing cachedFetch function...');
  
  // Test URL
  const testUrl = 'https://jsonplaceholder.typicode.com/todos/1';
  
  console.log(`First fetch from ${testUrl} (should fetch from network):`);
  const startTime1 = Date.now();
  const result1 = await cachedFetch(testUrl);
  const endTime1 = Date.now();
  console.log(`Result:`, result1);
  console.log(`Time taken: ${endTime1 - startTime1}ms`);
  
  console.log(`\nSecond fetch from ${testUrl} (should fetch from cache):`);
  const startTime2 = Date.now();
  const result2 = await cachedFetch(testUrl);
  const endTime2 = Date.now();
  console.log(`Result:`, result2);
  console.log(`Time taken: ${endTime2 - startTime2}ms`);
  
  // The second fetch should be faster if it's coming from cache
  console.log(`\nCache performance improvement: ${(endTime1 - startTime1) - (endTime2 - startTime2)}ms`);
  
  // Test with a different content type
  const imageUrl = 'https://via.placeholder.com/150';
  console.log(`\nFetching image from ${imageUrl}:`);
  const imageResult = await cachedFetch(imageUrl);
  console.log(`Image data length: ${imageResult.length} bytes`);
  
  console.log('\nTest completed successfully!');
}

// Run the test
testCachedFetch().catch(error => {
  console.error('Test failed:', error);
});