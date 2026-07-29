const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const project = args[0];

const steps = [
  '1/4  Preparing test environment',
  '2/4  Running Jest',
  '3/4  Collecting coverage summary',
  '4/4  Finished',
];

for (const step of steps.slice(0, 1)) console.log(step);
if (project) {
  console.log(`Selected project: ${project}`);
}
console.log(steps[1]);

const jestArgs = [
  '--config',
  'jest.config.cjs',
  '--coverage',
  '--coverageReporters=text-summary',
  '--reporters=./jest.noop-reporter.cjs',
  '--detectOpenHandles',
  '--runInBand',
];

if (project) {
  jestArgs.push('--selectProjects', project);
}

const result = spawnSync('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
});

console.log(steps[2]);
process.exitCode = result.status ?? 1;
console.log(steps[3]);
