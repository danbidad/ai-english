// 다른 어떤 모듈들보다도 먼저 수행되어야 하는 초기화를 수행한다.
// Hoisting 문제 때문에 index.ts에서 직접 수행하는 코드들은 
// 실제로는 다른 모듈들의 코드가 실행되고나서 맨 마지막에 실행되는 것이다.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); 
