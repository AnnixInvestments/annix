import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { FeedbackGithubService } from "../src/feedback/feedback-github.service";
import {
  FEEDBACK_TRIAGE_REGRESSION_SET,
  type FeedbackTriageFixture,
} from "../src/feedback/feedback-triage-regression.data";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const service = app.get(FeedbackGithubService);
    const results: Array<FeedbackTriageFixture & { actual: string; match: boolean }> = [];

    for (const fixture of FEEDBACK_TRIAGE_REGRESSION_SET) {
      const actual = await service.classifyFeedback(fixture.content);
      results.push({
        ...fixture,
        actual,
        match: actual === fixture.expected,
      });
    }

    const passed = results.filter((result) => result.match).length;
    const accuracy = passed / results.length;

    for (const result of results) {
      const prefix = result.match ? "PASS" : "FAIL";
      console.log(`${prefix} ${result.id}: expected=${result.expected} actual=${result.actual}`);
    }

    console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${passed}/${results.length})`);

    if (accuracy < 0.7) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main();
