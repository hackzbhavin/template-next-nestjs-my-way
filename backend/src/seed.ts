import { AppDataSource } from './data-source';

const TOTAL = 8000000;
const CHUNK_SIZE = 10000;
// Decide how many chunks to process at the exact same time
// Matching this to your poolSize (20) is a good strategy
const CONCURRENCY_LIMIT = 20;

function buildChunk(start: number, end: number) {
  const placeholders: string[] = [];
  const params: (string | number)[] = [];

  for (let i = start; i <= end; i++) {
    placeholders.push('(?, ?, ?, ?)');
    params.push(`User${i}`, `user${i}@test.com`, 'hashedpass', 1);
  }

  return { placeholders, params };
}

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  try {
    console.log('Truncating users table...');
    await AppDataSource.query('TRUNCATE TABLE users');
    await AppDataSource.query('ALTER TABLE users AUTO_INCREMENT = 1');

    console.log(`Starting to seed ${TOTAL} users concurrently...`);

    let start = 1;

    // Loop until we reach the TOTAL
    while (start <= TOTAL) {
      const promises: Promise<any>[] = [];
      // Build a batch of concurrent promises
      for (let i = 0; i < CONCURRENCY_LIMIT && start <= TOTAL; i++) {
        const end = Math.min(start + CHUNK_SIZE - 1, TOTAL);
        const { placeholders, params } = buildChunk(start, end);

        // We use AppDataSource.query directly.
        // TypeORM will automatically pull a free connection from the pool for each!
        const queryPromise = AppDataSource.query(
          `INSERT INTO users (name, email, password, isActive) VALUES ${placeholders.join(
            ', ',
          )}`,
          params,
        );

        promises.push(queryPromise);
        start += CHUNK_SIZE; // move to the next chunk
      }

      // Execute the batch of 20 queries at the exact same time
      await Promise.all(promises);

      // Access the pool to see it in action
      const driver = AppDataSource.driver as any;
      const pool = driver.pool;

      process.stdout.write(`\rSeeded up to ${start - 1}/${TOTAL} users... `);
      console.log(
        `| Pool - Total: ${pool?._allConnections?.length || 0}, Free: ${
          pool?._freeConnections?.length || 0
        }`,
      );
    }

    console.log(`\nDone — ${TOTAL} users inserted successfully!`);
  } catch (err) {
    console.error('\nSeed failed:', err);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
