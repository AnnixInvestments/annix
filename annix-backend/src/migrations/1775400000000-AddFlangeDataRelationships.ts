import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlangeDataRelationships1775400000000 implements MigrationInterface {
  name = 'AddFlangeDataRelationships1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding flange data relationships...');

    await this.createIntegralFlangeCompatibility(queryRunner);
    await this.addFaceFinishField(queryRunner);
    await this.createTestFlangesTable(queryRunner);

    console.warn('Flange data relationships completed.');
  }

  private async createIntegralFlangeCompatibility(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating integral_flange_compatibility table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integral_flange_compatibility (
        id SERIAL PRIMARY KEY,
        nps VARCHAR(20) NOT NULL,
        schedule VARCHAR(30) NOT NULL,
        flange_standard_id INTEGER REFERENCES flange_standards(id) ON DELETE CASCADE,
        flange_type_id INTEGER REFERENCES flange_types(id) ON DELETE SET NULL,
        pressure_class_id INTEGER REFERENCES flange_pressure_classes(id) ON DELETE CASCADE,
        is_compatible BOOLEAN NOT NULL DEFAULT true,
        wall_thickness_min_mm NUMERIC(8,3),
        wall_thickness_max_mm NUMERIC(8,3),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(nps, schedule, flange_standard_id, flange_type_id, pressure_class_id)
      )
    `);

    const asmeB165 = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`);
    const asmeB1647A = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.47 Series A'`);
    const asmeB1647B = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.47 Series B'`);
    const sabs1123 = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'SABS 1123'`);
    const bs4504 = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'BS 4504'`);
    const bs10 = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'BS 10'`);

    const wnType = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/2'`);
    const soType = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/3'`);
    const swType = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/5'`);

    const asmeB165Id = asmeB165.length > 0 ? asmeB165[0].id : null;
    const asmeB1647AId = asmeB1647A.length > 0 ? asmeB1647A[0].id : null;
    const asmeB1647BId = asmeB1647B.length > 0 ? asmeB1647B[0].id : null;
    const sabs1123Id = sabs1123.length > 0 ? sabs1123[0].id : null;
    const bs4504Id = bs4504.length > 0 ? bs4504[0].id : null;
    const bs10Id = bs10.length > 0 ? bs10[0].id : null;
    const wnTypeId = wnType.length > 0 ? wnType[0].id : null;
    const soTypeId = soType.length > 0 ? soType[0].id : null;
    const swTypeId = swType.length > 0 ? swType[0].id : null;

    const class150 = await queryRunner.query(`SELECT id FROM flange_pressure_classes WHERE designation = 'Class 150' AND "standardId" = $1`, [asmeB165Id]);
    const class300 = await queryRunner.query(`SELECT id FROM flange_pressure_classes WHERE designation = 'Class 300' AND "standardId" = $1`, [asmeB165Id]);
    const class600 = await queryRunner.query(`SELECT id FROM flange_pressure_classes WHERE designation = 'Class 600' AND "standardId" = $1`, [asmeB165Id]);
    const class900 = await queryRunner.query(`SELECT id FROM flange_pressure_classes WHERE designation = 'Class 900' AND "standardId" = $1`, [asmeB165Id]);
    const class1500 = await queryRunner.query(`SELECT id FROM flange_pressure_classes WHERE designation = 'Class 1500' AND "standardId" = $1`, [asmeB165Id]);

    const class150Id = class150.length > 0 ? class150[0].id : null;
    const class300Id = class300.length > 0 ? class300[0].id : null;
    const class600Id = class600.length > 0 ? class600[0].id : null;
    const class900Id = class900.length > 0 ? class900[0].id : null;
    const class1500Id = class1500.length > 0 ? class1500[0].id : null;

    const compatibilityData = [
      { nps: '1/2', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 2.77, maxWall: null, notes: 'Standard weight - suitable for Class 150 WN' },
      { nps: '1/2', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 3.73, maxWall: null, notes: 'Extra strong - suitable for Class 300 WN' },
      { nps: '3/4', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 2.87, maxWall: null, notes: 'Standard weight' },
      { nps: '3/4', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 3.91, maxWall: null, notes: 'Extra strong' },
      { nps: '1', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 3.38, maxWall: null, notes: 'Standard weight' },
      { nps: '1', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 4.55, maxWall: null, notes: 'Extra strong' },
      { nps: '1', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 6.35, maxWall: null, notes: 'Schedule 160 for Class 600' },
      { nps: '1-1/2', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 3.68, maxWall: null, notes: 'Standard weight' },
      { nps: '1-1/2', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 5.08, maxWall: null, notes: 'Extra strong' },
      { nps: '2', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 3.91, maxWall: null, notes: 'Standard weight' },
      { nps: '2', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 5.54, maxWall: null, notes: 'Extra strong' },
      { nps: '2', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 8.74, maxWall: null, notes: 'Schedule 160' },
      { nps: '3', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 5.49, maxWall: null, notes: 'Standard weight' },
      { nps: '3', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 7.62, maxWall: null, notes: 'Extra strong' },
      { nps: '3', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 11.13, maxWall: null, notes: 'Schedule 160' },
      { nps: '4', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 6.02, maxWall: null, notes: 'Standard weight' },
      { nps: '4', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 8.56, maxWall: null, notes: 'Extra strong' },
      { nps: '4', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 13.49, maxWall: null, notes: 'Schedule 160' },
      { nps: '6', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 7.11, maxWall: null, notes: 'Standard weight' },
      { nps: '6', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 10.97, maxWall: null, notes: 'Extra strong' },
      { nps: '6', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 18.26, maxWall: null, notes: 'Schedule 160' },
      { nps: '8', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 8.18, maxWall: null, notes: 'Standard weight' },
      { nps: '8', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 12.70, maxWall: null, notes: 'Extra strong' },
      { nps: '8', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 23.01, maxWall: null, notes: 'Schedule 160' },
      { nps: '10', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.27, maxWall: null, notes: 'Standard weight' },
      { nps: '10', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 12.70, maxWall: null, notes: 'Extra strong' },
      { nps: '10', schedule: 'Sch 160', standardId: asmeB165Id, typeId: wnTypeId, classId: class600Id, minWall: 28.58, maxWall: null, notes: 'Schedule 160' },
      { nps: '12', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },
      { nps: '12', schedule: 'XS', standardId: asmeB165Id, typeId: wnTypeId, classId: class300Id, minWall: 12.70, maxWall: null, notes: 'Extra strong' },
      { nps: '14', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },
      { nps: '16', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },
      { nps: '18', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },
      { nps: '20', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },
      { nps: '24', schedule: 'STD', standardId: asmeB165Id, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'Standard weight' },

      { nps: '1/2', schedule: 'Sch 80', standardId: asmeB165Id, typeId: swTypeId, classId: class600Id, minWall: 3.73, maxWall: null, notes: 'Socket weld for small bore high pressure' },
      { nps: '3/4', schedule: 'Sch 80', standardId: asmeB165Id, typeId: swTypeId, classId: class600Id, minWall: 3.91, maxWall: null, notes: 'Socket weld for small bore high pressure' },
      { nps: '1', schedule: 'Sch 80', standardId: asmeB165Id, typeId: swTypeId, classId: class600Id, minWall: 4.55, maxWall: null, notes: 'Socket weld for small bore high pressure' },
      { nps: '1-1/2', schedule: 'Sch 80', standardId: asmeB165Id, typeId: swTypeId, classId: class600Id, minWall: 5.08, maxWall: null, notes: 'Socket weld for small bore high pressure' },
      { nps: '2', schedule: 'Sch 80', standardId: asmeB165Id, typeId: swTypeId, classId: class600Id, minWall: 5.54, maxWall: null, notes: 'Socket weld for small bore high pressure' },

      { nps: '1/2', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 2.77, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '3/4', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 2.87, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '1', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 3.38, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '2', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 3.91, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '3', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 5.49, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '4', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 6.02, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '6', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 7.11, maxWall: null, notes: 'Slip-on suitable for low pressure' },
      { nps: '8', schedule: 'STD', standardId: asmeB165Id, typeId: soTypeId, classId: class150Id, minWall: 8.18, maxWall: null, notes: 'Slip-on suitable for low pressure' },

      { nps: '26', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '28', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '30', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '32', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '34', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '36', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '42', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },
      { nps: '48', schedule: 'STD', standardId: asmeB1647AId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series A for large bore' },

      { nps: '26', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '28', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '30', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '36', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '42', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '48', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '54', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
      { nps: '60', schedule: 'STD', standardId: asmeB1647BId, typeId: wnTypeId, classId: class150Id, minWall: 9.53, maxWall: null, notes: 'B16.47 Series B (API 605) for large bore' },
    ];

    for (const item of compatibilityData) {
      if (!item.standardId || !item.classId) continue;

      await queryRunner.query(`
        INSERT INTO integral_flange_compatibility (nps, schedule, flange_standard_id, flange_type_id, pressure_class_id, wall_thickness_min_mm, wall_thickness_max_mm, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (nps, schedule, flange_standard_id, flange_type_id, pressure_class_id) DO UPDATE SET
          wall_thickness_min_mm = EXCLUDED.wall_thickness_min_mm,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `, [item.nps, item.schedule, item.standardId, item.typeId, item.classId, item.minWall, item.maxWall, item.notes]);
    }

    console.warn(`Added ${compatibilityData.length} integral flange compatibility records`);
  }

  private async addFaceFinishField(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding face_finish field to flange tables...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flange_face_finishes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        ra_roughness_min_um NUMERIC(6,2),
        ra_roughness_max_um NUMERIC(6,2),
        applicable_gasket_types TEXT[],
        standard_reference VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const faceFinishes = [
      { code: 'RF', name: 'Raised Face', description: 'Standard raised face finish for general service', raMin: 3.2, raMax: 6.3, gaskets: ['spiral wound', 'PTFE', 'graphite', 'rubber'], standard: 'ASME B16.5' },
      { code: 'FF', name: 'Flat Face', description: 'Full face for cast iron and non-metallic flanges', raMin: 3.2, raMax: 6.3, gaskets: ['full face rubber', 'PTFE', 'fiber'], standard: 'ASME B16.5' },
      { code: 'RTJ', name: 'Ring Type Joint', description: 'Metallic ring groove for high pressure/temperature', raMin: 0.8, raMax: 1.6, gaskets: ['ring joint R', 'ring joint RX', 'ring joint BX'], standard: 'ASME B16.5/API 6A' },
      { code: 'SERR', name: 'Serrated', description: 'Concentric or spiral serrations for enhanced sealing', raMin: 3.2, raMax: 12.5, gaskets: ['spiral wound', 'graphite', 'PTFE'], standard: 'ASME B16.5' },
      { code: 'SMOOTH', name: 'Smooth', description: 'Stock/as-machined finish 125-250 AARH', raMin: 3.2, raMax: 6.3, gaskets: ['spiral wound', 'PTFE', 'graphite'], standard: 'ASME B16.5' },
      { code: 'GROOVED', name: 'Grooved', description: 'Phonographic spiral groove', raMin: null, raMax: null, gaskets: ['solid metal', 'spiral wound'], standard: 'ASME B16.5' },
      { code: 'LAPPED', name: 'Lapped', description: 'Smooth lapped finish for lap joint flanges', raMin: 1.6, raMax: 3.2, gaskets: ['spiral wound', 'PTFE'], standard: 'ASME B16.5' },
      { code: 'MALE', name: 'Male', description: 'Tongue side of tongue-and-groove joint', raMin: 3.2, raMax: 6.3, gaskets: ['solid metal', 'spiral wound'], standard: 'ASME B16.5' },
      { code: 'FEMALE', name: 'Female', description: 'Groove side of tongue-and-groove joint', raMin: 3.2, raMax: 6.3, gaskets: ['solid metal', 'spiral wound'], standard: 'ASME B16.5' },
    ];

    for (const finish of faceFinishes) {
      await queryRunner.query(`
        INSERT INTO flange_face_finishes (code, name, description, ra_roughness_min_um, ra_roughness_max_um, applicable_gasket_types, standard_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          ra_roughness_min_um = EXCLUDED.ra_roughness_min_um,
          ra_roughness_max_um = EXCLUDED.ra_roughness_max_um,
          applicable_gasket_types = EXCLUDED.applicable_gasket_types
      `, [finish.code, finish.name, finish.description, finish.raMin, finish.raMax, finish.gaskets, finish.standard]);
    }

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'flange_dimensions' AND column_name = 'face_finish_id'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE flange_dimensions
        ADD COLUMN face_finish_id INTEGER REFERENCES flange_face_finishes(id) ON DELETE SET NULL
      `);

      const rfFinish = await queryRunner.query(`SELECT id FROM flange_face_finishes WHERE code = 'RF'`);
      if (rfFinish.length > 0) {
        await queryRunner.query(`
          UPDATE flange_dimensions SET face_finish_id = $1 WHERE face_finish_id IS NULL
        `, [rfFinish[0].id]);
      }
    }

    console.warn(`Added ${faceFinishes.length} flange face finish options`);
  }

  private async createTestFlangesTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating test_flanges table for mock-up rings...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test_flanges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        nps VARCHAR(20) NOT NULL,
        pressure_class VARCHAR(30) NOT NULL,
        flange_standard_id INTEGER REFERENCES flange_standards(id) ON DELETE SET NULL,
        material VARCHAR(100),
        outside_diameter_mm NUMERIC(10,2),
        inside_diameter_mm NUMERIC(10,2),
        thickness_mm NUMERIC(8,2),
        bolt_circle_diameter_mm NUMERIC(10,2),
        num_bolt_holes INTEGER,
        bolt_hole_diameter_mm NUMERIC(8,2),
        face_finish_id INTEGER REFERENCES flange_face_finishes(id) ON DELETE SET NULL,
        is_reusable BOOLEAN DEFAULT true,
        max_test_pressure_bar NUMERIC(10,2),
        certification_required BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test_flange_usage_log (
        id SERIAL PRIMARY KEY,
        test_flange_id INTEGER REFERENCES test_flanges(id) ON DELETE CASCADE,
        project_reference VARCHAR(100),
        test_date DATE,
        test_pressure_bar NUMERIC(10,2),
        test_duration_minutes INTEGER,
        test_result VARCHAR(50),
        inspector_name VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const asmeB165 = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`);
    const rfFinish = await queryRunner.query(`SELECT id FROM flange_face_finishes WHERE code = 'RF'`);
    const rtjFinish = await queryRunner.query(`SELECT id FROM flange_face_finishes WHERE code = 'RTJ'`);

    const asmeB165Id = asmeB165.length > 0 ? asmeB165[0].id : null;
    const rfFinishId = rfFinish.length > 0 ? rfFinish[0].id : null;
    const rtjFinishId = rtjFinish.length > 0 ? rtjFinish[0].id : null;

    const testFlanges = [
      { name: 'Mock-Up Ring 2" CL150', type: 'MOCK_UP_RING', nps: '2', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 152.4, id: 60.3, thickness: 19.1, bcd: 120.7, numBolts: 4, boltDia: 15.9, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },
      { name: 'Mock-Up Ring 4" CL150', type: 'MOCK_UP_RING', nps: '4', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 228.6, id: 114.3, thickness: 23.9, bcd: 190.5, numBolts: 8, boltDia: 15.9, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },
      { name: 'Mock-Up Ring 6" CL150', type: 'MOCK_UP_RING', nps: '6', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 279.4, id: 168.3, thickness: 25.4, bcd: 241.3, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },
      { name: 'Mock-Up Ring 8" CL150', type: 'MOCK_UP_RING', nps: '8', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 342.9, id: 219.1, thickness: 28.6, bcd: 298.5, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },
      { name: 'Mock-Up Ring 10" CL150', type: 'MOCK_UP_RING', nps: '10', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 406.4, id: 273.1, thickness: 30.2, bcd: 362.0, numBolts: 12, boltDia: 22.2, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },
      { name: 'Mock-Up Ring 12" CL150', type: 'MOCK_UP_RING', nps: '12', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 482.6, id: 323.9, thickness: 31.8, bcd: 431.8, numBolts: 12, boltDia: 22.2, finishId: rfFinishId, maxPressure: 20.7, notes: 'Standard mock-up for hydro test' },

      { name: 'Mock-Up Ring 2" CL300', type: 'MOCK_UP_RING', nps: '2', class: 'Class 300', standardId: asmeB165Id, material: 'Carbon Steel', od: 165.1, id: 60.3, thickness: 22.4, bcd: 127.0, numBolts: 8, boltDia: 15.9, finishId: rfFinishId, maxPressure: 51.7, notes: 'Class 300 mock-up for hydro test' },
      { name: 'Mock-Up Ring 4" CL300', type: 'MOCK_UP_RING', nps: '4', class: 'Class 300', standardId: asmeB165Id, material: 'Carbon Steel', od: 254.0, id: 114.3, thickness: 30.2, bcd: 200.0, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 51.7, notes: 'Class 300 mock-up for hydro test' },
      { name: 'Mock-Up Ring 6" CL300', type: 'MOCK_UP_RING', nps: '6', class: 'Class 300', standardId: asmeB165Id, material: 'Carbon Steel', od: 317.5, id: 168.3, thickness: 36.6, bcd: 269.9, numBolts: 12, boltDia: 19.1, finishId: rfFinishId, maxPressure: 51.7, notes: 'Class 300 mock-up for hydro test' },

      { name: 'Test Blind 4" CL150', type: 'TEST_BLIND', nps: '4', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 228.6, id: null, thickness: 23.9, bcd: 190.5, numBolts: 8, boltDia: 15.9, finishId: rfFinishId, maxPressure: 20.7, notes: 'Solid blind for test isolation' },
      { name: 'Test Blind 6" CL150', type: 'TEST_BLIND', nps: '6', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 279.4, id: null, thickness: 25.4, bcd: 241.3, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 20.7, notes: 'Solid blind for test isolation' },
      { name: 'Test Blind 8" CL150', type: 'TEST_BLIND', nps: '8', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 342.9, id: null, thickness: 28.6, bcd: 298.5, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 20.7, notes: 'Solid blind for test isolation' },

      { name: 'Spectacle Blind 4" CL150', type: 'SPECTACLE_BLIND', nps: '4', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 228.6, id: 114.3, thickness: 12.7, bcd: 190.5, numBolts: 8, boltDia: 15.9, finishId: rfFinishId, maxPressure: 20.7, notes: 'Figure-8 spectacle blind per ASME B16.48' },
      { name: 'Spectacle Blind 6" CL150', type: 'SPECTACLE_BLIND', nps: '6', class: 'Class 150', standardId: asmeB165Id, material: 'Carbon Steel', od: 279.4, id: 168.3, thickness: 12.7, bcd: 241.3, numBolts: 8, boltDia: 19.1, finishId: rfFinishId, maxPressure: 20.7, notes: 'Figure-8 spectacle blind per ASME B16.48' },

      { name: 'RTJ Mock-Up 4" CL600', type: 'MOCK_UP_RING', nps: '4', class: 'Class 600', standardId: asmeB165Id, material: 'Carbon Steel', od: 273.1, id: 114.3, thickness: 47.8, bcd: 215.9, numBolts: 8, boltDia: 25.4, finishId: rtjFinishId, maxPressure: 103.4, notes: 'RTJ face mock-up for high pressure' },
      { name: 'RTJ Mock-Up 6" CL600', type: 'MOCK_UP_RING', nps: '6', class: 'Class 600', standardId: asmeB165Id, material: 'Carbon Steel', od: 355.6, id: 168.3, thickness: 55.6, bcd: 292.1, numBolts: 12, boltDia: 25.4, finishId: rtjFinishId, maxPressure: 103.4, notes: 'RTJ face mock-up for high pressure' },
    ];

    for (const flange of testFlanges) {
      await queryRunner.query(`
        INSERT INTO test_flanges (name, type, nps, pressure_class, flange_standard_id, material, outside_diameter_mm, inside_diameter_mm, thickness_mm, bolt_circle_diameter_mm, num_bolt_holes, bolt_hole_diameter_mm, face_finish_id, max_test_pressure_bar, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING
      `, [flange.name, flange.type, flange.nps, flange.class, flange.standardId, flange.material, flange.od, flange.id, flange.thickness, flange.bcd, flange.numBolts, flange.boltDia, flange.finishId, flange.maxPressure, flange.notes]);
    }

    console.warn(`Added ${testFlanges.length} test flange specifications`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting flange data relationships...');

    await queryRunner.query(`DROP TABLE IF EXISTS test_flange_usage_log CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS test_flanges CASCADE`);

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'flange_dimensions' AND column_name = 'face_finish_id'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE flange_dimensions DROP COLUMN face_finish_id`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS flange_face_finishes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS integral_flange_compatibility CASCADE`);

    console.warn('Flange data relationships reverted.');
  }
}
