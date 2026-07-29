class CaseReporter {
  onRunStart() {
    // Keep Jest's own test execution quiet; this reporter prints per-file results.
  }

  onTestResult(_, testResult) {
    const status = testResult.numFailingTests > 0 ? 'FAIL' : 'PASS';
    console.log(`${status} ${testResult.testFilePath.replace(process.cwd() + '\\', '')}`);
    for (const assertion of testResult.testResults) {
      const mark = assertion.status === 'passed' ? '√' : '×';
      console.log(`  ${mark} ${assertion.fullName}`);
    }
  }

  onRunComplete(_, results) {
    console.log('');
    console.log(`Tests: ${results.numPassedTests} passed, ${results.numFailedTests} failed, ${results.numTotalTests} total`);
  }
}

module.exports = CaseReporter;
