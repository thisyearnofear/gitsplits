import dotenv from 'dotenv';
dotenv.config();

import { runCanaryOnce } from './services/canary-monitor';

async function main() {
  const result = await runCanaryOnce();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
