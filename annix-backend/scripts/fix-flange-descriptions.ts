import { AppDataSource } from '../src/config/data-source';
import { BoqSection } from '../src/boq/entities/boq-section.entity';

async function fixFlangeDescriptions() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Connected!\n');

  const sectionRepo = AppDataSource.getRepository(BoqSection);

  const flangeSections = await sectionRepo.find({
    where: { sectionType: 'flanges' }
  });

  console.log(`Found ${flangeSections.length} flange sections to update\n`);

  let updatedCount = 0;

  for (const section of flangeSections) {
    let updated = false;
    const items = section.items || [];

    const updatedItems = items.map((item: any) => {
      if (item.description && item.description.includes('Weld Neck Flange')) {
        updated = true;
        return {
          ...item,
          description: item.description.replace('Weld Neck Flange', 'Slip On Flange')
        };
      }
      return item;
    });

    if (updated) {
      section.items = updatedItems;
      await sectionRepo.save(section);
      updatedCount++;
      console.log(`Updated BOQ section ${section.id} for BOQ ${section.boqId}`);
    }
  }

  console.log(`\nDone! Updated ${updatedCount} sections.`);
  await AppDataSource.destroy();
}

fixFlangeDescriptions().catch(console.error);
