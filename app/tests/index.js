// Entry point so that `node --test app/tests` works: node treats a directory argument as a
// module path and loads this index.js. Import every *.test.mjs file in this folder here.
import './logic.test.mjs';
import './scaffold-core.test.mjs';
import './fallback.test.mjs';
import './serve.test.mjs';
import './persona-data.test.mjs';
