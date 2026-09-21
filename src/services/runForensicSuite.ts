import { DspForensicVerifier } from './dspForensicVerification';
import { ExpressivePerformanceForensicVerifier } from './expressivePerformanceForensicVerification';
import { FinalRenderingCoherenceForensicVerifier } from './finalRenderingCoherenceForensicVerification';
import { MusicalBrainForensicVerifier } from './musicalBrainForensicVerification';
import { GenerativeDecisionForensicVerifier } from './aiMusicalBrain/generativeDecisionForensicVerification';
import { GenerativeArrangementForensicVerifier } from './aiMusicalBrain/generativeArrangementForensicVerification';
import { Phase3ForensicVerification } from './phase3ForensicVerification';
import { Phase5ForensicVerification } from './musicIntelligence/phase5ForensicVerification';
import { Phase6ForensicVerification } from './mixer/phase6ForensicVerification';
import { Phase6ForensicVerifier } from './phase6ForensicVerification';
import { Phase7ForensicVerifier } from './phase7ForensicVerification';
import { Phase8ExportForensicVerifier } from './phase8ExportForensicVerification';
import { Phase8ForensicVerifier } from './phase8ForensicVerification';
import { Phase9ForensicVerifier } from './phase9ForensicVerification';
import { Phase10ForensicVerifier } from './phase10ForensicVerification';
import { Phase10PerformanceForensicVerifier } from './phase10PerformanceForensicVerification';
import { Phase11ForensicVerifier } from './phase11ForensicVerification';
import { Phase12ForensicVerifier } from './phase12ForensicVerification';
import { RecorderFlowForensicVerifier } from './recorderFlowForensicVerification';

// Provide global mock for AudioContext in CLI environment if needed
if (typeof window === 'undefined') {
  (global as any).window = {
    AudioContext: class MockAudioContext {
      public sampleRate = 44100;
      public state = 'running';
      public resume() { return Promise.resolve(); }
      public createBuffer(channels: number, length: number, sampleRate: number) {
        const channelData = Array.from({ length: channels }, () => new Float32Array(length));
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: (ch: number) => channelData[ch]
        };
      }
    }
  };
}

async function runMasterSuite() {
  console.log("================================================================================");
  console.log("SURGE STUDIO — MASTER FORENSIC VERIFICATION AUDIT (PARTS 1, 2, 3, 4A, 4B, 5P1, 5P2 & 5P3)");
  console.log("================================================================================");

  // 1. Run DSP & Regression Suite (Parts 1, 2, 3 + Adversarial)
  console.log("\n>>> [0/7] RUNNING PHASE 3 NATIVE AUDIO ENGINE & JNI BRIDGE VERIFICATION...");
  const p3Report = Phase3ForensicVerification.runVerification();
  p3Report.details.forEach(d => console.log(`  ${d}`));
  if (!p3Report.allTestsPassed) {
    console.error("PHASE 3 NATIVE BRIDGE VERIFICATION FAILED!");
  } else {
    console.log(">>> PHASE 3 NATIVE AUDIO ENGINE & JNI BRIDGE VERIFIED (100% GREEN)!");
  }

  console.log("\n>>> [1/6] RUNNING PART 1, 2, 3 DSP & HARMONY FORENSIC SUITE...");
  const dspReport = DspForensicVerifier.runAllTests();
  console.log(`Total DSP Tests: ${dspReport.totalTests} | Passed: ${dspReport.passedTests} | Failed: ${dspReport.failedTests}`);
  if (!dspReport.allPassed) {
    console.error("DSP FAILURES DETECTED:");
    dspReport.results.filter(r => !r.passed).forEach(f => {
      console.error(`- [${f.testId}] ${f.name}: ${f.actual}`);
    });
  } else {
    console.log(">>> ALL PART 1, 2, 3 + ADVERSARIAL TESTS PASSED (100% GREEN)!");
  }

  // 2. Run Expressive Performance Intelligence Suite (Part 4A)
  console.log("\n>>> [2/6] RUNNING PART 4A EXPRESSIVE PERFORMANCE INTELLIGENCE SUITE...");
  const expReport = ExpressivePerformanceForensicVerifier.runAllTests();
  console.log(`Total Part 4A Tests: ${expReport.totalTests} | Passed: ${expReport.passedTests} | Failed: ${expReport.failedTests}`);
  expReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 3. Run Final Expressive Rendering Coherence Suite (Part 4B)
  console.log("\n>>> [3/6] RUNNING PART 4B FINAL EXPRESSIVE RENDERING COHERENCE SUITE (FR-01 to FR-31)...");
  const finalReport = FinalRenderingCoherenceForensicVerifier.runAllTests();
  console.log(`Total Part 4B Tests: ${finalReport.totalTests} | Passed: ${finalReport.passedTests} | Failed: ${finalReport.failedTests}`);
  finalReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 4. Run AI Musical Brain & Unified Representation Suite (Part 5 - Prompt 1)
  console.log("\n>>> [4/6] RUNNING PART 5 PROMPT 1 AI MUSICAL BRAIN & UMR SUITE (MB-01 to MB-33)...");
  const brainReport = await MusicalBrainForensicVerifier.runAllTests();
  console.log(`Total Part 5 P1 Tests: ${brainReport.totalTests} | Passed: ${brainReport.passedTests} | Failed: ${brainReport.failedTests}`);
  brainReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 5. Run Generative Music Decision Suite (Part 5 - Prompt 2)
  console.log("\n>>> [5/6] RUNNING PART 5 PROMPT 2 GENERATIVE MUSIC DECISION SUITE (GD-01 to GD-24)...");
  const genReport = await GenerativeDecisionForensicVerifier.runAllTests();
  console.log(`Total Part 5 P2 Tests: ${genReport.totalTests} | Passed: ${genReport.passedTests} | Failed: ${genReport.failedTests}`);
  genReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 6. Run Generative Arrangement Realization Suite (Part 5 - Prompt 3)
  console.log("\n>>> [6/7] RUNNING PART 5 PROMPT 3 GENERATIVE ARRANGEMENT REALIZATION SUITE (GA-01 to GA-24)...");
  const arrReport = await GenerativeArrangementForensicVerifier.runAllTests();
  console.log(`Total Part 5 P3 Tests: ${arrReport.totalTests} | Passed: ${arrReport.passedTests} | Failed: ${arrReport.failedTests}`);
  arrReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 6.5. Run Phase 5 Canonical Music Intelligence & Arrangement Suite
  console.log("\n>>> [6.5/14] RUNNING PHASE 5 CANONICAL MUSIC INTELLIGENCE & ARRANGEMENT SUITE...");
  const p5Report = await Phase5ForensicVerification.getInstance().runAllTests();
  console.log(`Total Phase 5 Tests: ${p5Report.totalTests} | Passed: ${p5Report.passed} | Failed: ${p5Report.failed}`);
  p5Report.results.forEach(r => {
    const symbol = r.status === 'PASS' ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.category}] ${symbol} - ${r.name}`);
    if (r.status !== 'PASS') {
      console.error(`     Evidence: ${r.evidence}`);
    }
  });

  // 6.6. Run Phase 6 Professional Mixer & Real DSP Verification Suite
  console.log("\n>>> [6.6/14] RUNNING PHASE 6 PROFESSIONAL MIXER & REAL DSP SUITE...");
  const p6MixerReport = await Phase6ForensicVerification.runVerification();
  console.log(`Total Phase 6 Mixer Tests: ${p6MixerReport.checks.length} | Score: ${p6MixerReport.score}%`);
  p6MixerReport.checks.forEach(c => {
    const symbol = c.status === 'PASS' ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${c.id}] ${symbol} - ${c.description}`);
    if (c.status !== 'PASS') {
      console.error(`     Details: ${c.details}`);
    }
  });

  // 7. Run Phase 6 Final Professional Music Generation & Production Suite
  console.log("\n>>> [7/8] RUNNING PHASE 6 FINAL PROFESSIONAL MUSIC GENERATION SUITE (P6-01 to P6-12)...");
  const p6Report = await Phase6ForensicVerifier.runAllTests();
  console.log(`Total Phase 6 Tests: ${p6Report.totalTests} | Passed: ${p6Report.passedTests} | Failed: ${p6Report.failedTests}`);
  p6Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 8. Run Phase 7 True Generative Composition Engine Suite (TC-01 to TC-18)
  console.log("\n>>> [8/9] RUNNING PHASE 7 TRUE GENERATIVE COMPOSITION SUITE (TC-01 to TC-18)...");
  const p7Report = await Phase7ForensicVerifier.runAllTests();
  console.log(`Total Phase 7 Tests: ${p7Report.totalTests} | Passed: ${p7Report.passedTests} | Failed: ${p7Report.failedTests}`);
  p7Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 9. Run Phase 8 Professional Song Arrangement Engine Suite (AR-01 to AR-21)
  console.log("\n>>> [9/10] RUNNING PHASE 8 PROFESSIONAL SONG ARRANGEMENT SUITE (AR-01 to AR-21)...");
  const p8Report = await Phase8ForensicVerifier.runAllTests();
  console.log(`Total Phase 8 Tests: ${p8Report.totalTests} | Passed: ${p8Report.passedTests} | Failed: ${p8Report.failedTests}`);
  p8Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 9.5 Run Phase 8 Canonical Export, Packaging & Delivery Pipeline Suite (EX-01 to EX-15)
  console.log("\n>>> [9.5/10] RUNNING PHASE 8 EXPORT, PACKAGING & DELIVERY PIPELINE SUITE (EX-01 to EX-15)...");
  const p8ExportReport = await Phase8ExportForensicVerifier.runAllTests();
  console.log(`Total Phase 8 Export Tests: ${p8ExportReport.totalTests} | Passed: ${p8ExportReport.passedTests} | Failed: ${p8ExportReport.failedTests}`);
  p8ExportReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 10. Run Phase 9 AI-Assisted Professional Mixing Engine Suite (MX-01 to MX-21)
  console.log("\n>>> [10/11] RUNNING PHASE 9 AI-ASSISTED PROFESSIONAL MIXING SUITE (MX-01 to MX-21)...");
  const p9Report = await Phase9ForensicVerifier.runAllTests();
  console.log(`Total Phase 9 Tests: ${p9Report.totalTests} | Passed: ${p9Report.passedTests} | Failed: ${p9Report.failedTests}`);
  p9Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 11. Run Phase 10 Human-Like Instrument Performance Suite (P10-01 to P10-20)
  console.log("\n>>> [11/12] RUNNING PHASE 10 HUMAN-LIKE PERFORMANCE SUITE (P10-01 to P10-20)...");
  const p10Report = await Phase10ForensicVerifier.runAllTests();
  console.log(`Total Phase 10 Tests: ${p10Report.totalTests} | Passed: ${p10Report.passedTests} | Failed: ${p10Report.failedTests}`);
  p10Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 11.5 Run Phase 10 Performance, Scalability, Memory & Runtime Stability Engine Suite (PF-01 to PF-20)
  console.log("\n>>> [11.5/12] RUNNING PHASE 10 PERFORMANCE, SCALABILITY, MEMORY & RUNTIME STABILITY SUITE (PF-01 to PF-20)...");
  const p10PerfReport = await Phase10PerformanceForensicVerifier.runAllTests();
  console.log(`Total Phase 10 Performance Tests: ${p10PerfReport.totalTests} | Passed: ${p10PerfReport.passedTests} | Failed: ${p10PerfReport.failedTests}`);
  p10PerfReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 12. Run Phase 11 Song Identity & Long-Term Musical Memory Suite (P11-01 to P11-12)
  console.log("\n>>> [12/13] RUNNING PHASE 11 SONG IDENTITY & MUSICAL MEMORY SUITE (P11-01 to P11-12)...");
  const p11Report = await Phase11ForensicVerifier.runAllTests();
  console.log(`Total Phase 11 Tests: ${p11Report.totalTests} | Passed: ${p11Report.passedTests} | Failed: ${p11Report.failedTests}`);
  p11Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  // 13. Run Phase 12 Neural & Deep-Learning Musical Intelligence Suite (P12-01 to P12-20)
  console.log("\n>>> [13/14] RUNNING PHASE 12 NEURAL & DEEP-LEARNING MUSICAL INTELLIGENCE SUITE (P12-01 to P12-20)...");
  const p12Report = await Phase12ForensicVerifier.runAllTests();
  console.log(`Total Phase 12 Tests: ${p12Report.totalTests} | Passed: ${p12Report.passedTests} | Failed: ${p12Report.failedTests}`);
  p12Report.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Details: ${r.details}`);
    }
  });

  // 14. Run Recorder Entry & Workflow Safety Forensic Suite (REC-FLOW-01 to REC-FLOW-13)
  console.log("\n>>> [14/14] RUNNING RECORDER ENTRY & WORKFLOW SAFETY SUITE (REC-FLOW-01 to REC-FLOW-13)...");
  const recFlowReport = await RecorderFlowForensicVerifier.runAllTests();
  console.log(`Total Recorder Flow Tests: ${recFlowReport.totalTests} | Passed: ${recFlowReport.passedTests} | Failed: ${recFlowReport.failedTests}`);
  recFlowReport.results.forEach(r => {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${r.testId}] ${symbol} - ${r.name}`);
    if (!r.passed) {
      console.error(`     Expected: ${r.expected}`);
      console.error(`     Actual:   ${r.actual}`);
    }
  });

  const totalAll = dspReport.totalTests + expReport.totalTests + finalReport.totalTests + brainReport.totalTests + genReport.totalTests + arrReport.totalTests + p5Report.totalTests + p6Report.totalTests + p7Report.totalTests + p8Report.totalTests + p8ExportReport.totalTests + p9Report.totalTests + p10Report.totalTests + p10PerfReport.totalTests + p11Report.totalTests + p12Report.totalTests + recFlowReport.totalTests;
  const passedAll = dspReport.passedTests + expReport.passedTests + finalReport.passedTests + brainReport.passedTests + genReport.passedTests + arrReport.passedTests + p5Report.passed + p6Report.passedTests + p7Report.passedTests + p8Report.passedTests + p8ExportReport.passedTests + p9Report.passedTests + p10Report.passedTests + p10PerfReport.passedTests + p11Report.passedTests + p12Report.passedTests + recFlowReport.passedTests;
  const failedAll = dspReport.failedTests + expReport.failedTests + finalReport.failedTests + brainReport.failedTests + genReport.failedTests + arrReport.failedTests + p5Report.failed + p6Report.failedTests + p7Report.failedTests + p8Report.failedTests + p8ExportReport.failedTests + p9Report.failedTests + p10Report.failedTests + p10PerfReport.failedTests + p11Report.failedTests + p12Report.failedTests + recFlowReport.failedTests;

  if (dspReport.allPassed && expReport.allPassed && finalReport.allPassed && brainReport.allPassed && genReport.allPassed && arrReport.allPassed && p5Report.allPassed && p6Report.allPassed && p7Report.allPassed && p8Report.allPassed && p8ExportReport.allPassed && p9Report.allPassed && p10Report.allPassed && p10PerfReport.allPassed && p11Report.allPassed && p12Report.failedTests === 0 && recFlowReport.allPassed) {
    console.log("\n================================================================================");
    console.log(`MASTER VERIFICATION SUCCESS: 100% GREEN (${passedAll}/${totalAll} TESTS PASSED)!`);
    console.log("================================================================================");
  } else {
    console.error(`\nMASTER VERIFICATION FAILED! Passed: ${passedAll}/${totalAll}, Failed: ${failedAll}`);
    process.exit(1);
  }
}

runMasterSuite();

