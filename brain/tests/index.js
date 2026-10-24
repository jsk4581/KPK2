// Entry point so that `node --test tests/` works on Node 22: the runner treats a directory
// argument as a module path and loads this index.js. Import every *.test.mjs file here.
// (`node --test` with no argument and `node --test 'tests/*.test.mjs'` run the same files directly.)
import './data.test.mjs';
import './state.test.mjs';
import './constraint.test.mjs';
import './policy.test.mjs';
import './messages.test.mjs';
import './person.test.mjs';
import './goal.test.mjs';
import './monitor.test.mjs';
import './server.test.mjs';
import './think.test.mjs';
import './integration.test.mjs';
import './security.test.mjs';
import './compat.test.mjs';
