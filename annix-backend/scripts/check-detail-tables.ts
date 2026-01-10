import { AppDataSource } from '../src/config/data-source';

async function check() {
  console.log('Connecting...');
  await AppDataSource.initialize();

  console.log('bend_rfqs:');
  const bends = await AppDataSource.query('SELECT * FROM bend_rfqs');
  console.log(JSON.stringify(bends, null, 2));

  console.log('\nfitting_rfqs:');
  const fittings = await AppDataSource.query('SELECT * FROM fitting_rfqs');
  console.log(JSON.stringify(fittings, null, 2));

  await AppDataSource.destroy();
}

check().catch(console.error);
