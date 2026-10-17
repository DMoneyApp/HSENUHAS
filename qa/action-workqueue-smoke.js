const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
const getFn = (name) => {
  const patterns = {
    addDaysISO: /  function addDaysISO\([^)]*\)\{[^\n]*\}/,
    actionDeadlineState: /  function actionDeadlineState\(r,todayKey=today\(\)\)\{[\s\S]*?\n  \}/
  };
  const match = app.match(patterns[name]);
  assert(match, `function ${name} must exist`);
  return match[0];
};
const context = {};
vm.runInNewContext(`${getFn('addDaysISO')}; ${getFn('actionDeadlineState')}; this.actionDeadlineState=actionDeadlineState;`, context);
const state = context.actionDeadlineState;
const date = (status, due_date) => ({ status, data: { due_date } });
assert.strictEqual(state(date('open','2026-10-11'),'2026-10-12'),'overdue');
assert.strictEqual(state(date('open','2026-10-12'),'2026-10-12'),'due_today');
assert.strictEqual(state(date('open','2026-10-19'),'2026-10-12'),'next_7');
assert.strictEqual(state(date('open','2026-10-20'),'2026-10-12'),'upcoming');
assert.strictEqual(state(date('open',''),'2026-10-12'),'missing');
assert.strictEqual(state(date('open','2026-02-31'),'2026-10-12'),'missing');
assert.strictEqual(state(date('closed','2026-10-11'),'2026-10-12'),'closed');
assert(app.includes('data-action-filter="owner"') && app.includes('data-action-filter="priority"') && app.includes('data-action-filter="due"'), 'register must expose owner, priority and due-state filters');
assert(app.includes("state.actionOwner=e.target.value") && app.includes("state.actionPriority=e.target.value") && app.includes("state.actionDue=e.target.value"), 'filters must update state and rerender');
assert(app.includes("'overdue actions'") || app.includes('overdue actions'), 'register should expose overdue count');
assert(app.includes('Source finding') && app.includes('a.data?.responsible') && app.includes('a.data?.due_date'), 'linked-action detail should include owner and deadline context');
console.log('ACTION WORK QUEUE SMOKE: PASSED (7 deadline scenarios plus 3 wiring assertions)');
