import "dotenv/config";
import { randomBytes } from "node:crypto";
import { DataSource } from "typeorm";
import { RubberProduct } from "../src/rubber-lining/entities/rubber-product.entity";
import {
  ProductCodingType,
  RubberProductCoding,
} from "../src/rubber-lining/entities/rubber-product-coding.entity";

const generateUid = () => `pg_${randomBytes(8).toString("hex")}`;

interface ProductData {
  code: string;
  curingMethod: string | null;
  colour: string | null;
  hardness: string | null;
  type: string | null;
  grade: string | null;
  sg: number | null;
  costPerKg: number | null;
}

const productData: ProductData[] = [
  {
    code: "SG-A38P",
    curingMethod: "Steam Cured",
    colour: "Pink",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 0.98,
    costPerKg: 83.72,
  },
  {
    code: "SG-A58P",
    curingMethod: "Steam Cured",
    colour: "Pink",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.15,
    costPerKg: 80.4,
  },
  {
    code: "SG-A38P (Pre)",
    curingMethod: "Pre Cured",
    colour: "Pink",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 0.98,
    costPerKg: null,
  },
  {
    code: "SG-A58P (Pre)",
    curingMethod: "Pre Cured",
    colour: "Pink",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.15,
    costPerKg: null,
  },
  {
    code: "SG-A38B",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.04,
    costPerKg: 69.79,
  },
  {
    code: "SG-A38R",
    curingMethod: "Steam Cured",
    colour: "Red",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 79.97,
  },
  {
    code: "SG-A38Y",
    curingMethod: "Steam Cured",
    colour: "Yellow",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 77.62,
  },
  {
    code: "SG-A38G",
    curingMethod: "Steam Cured",
    colour: "Green",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 76.13,
  },
  {
    code: "SG-A58B",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.14,
    costPerKg: 69.29,
  },
  {
    code: "SG-A58R",
    curingMethod: "Steam Cured",
    colour: "Red",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.14,
    costPerKg: 75.5,
  },
  {
    code: "SG-A38B (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.04,
    costPerKg: 69.79,
  },
  {
    code: "SG-A38R (Pre)",
    curingMethod: "Pre Cured",
    colour: "Red",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 79.97,
  },
  {
    code: "SG-A38Y (Pre)",
    curingMethod: "Pre Cured",
    colour: "Yellow",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 77.62,
  },
  {
    code: "SG-A38G (Pre)",
    curingMethod: "Pre Cured",
    colour: "Green",
    hardness: "38",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 76.13,
  },
  {
    code: "SG-A58B (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.14,
    costPerKg: 69.29,
  },
  {
    code: "SG-A58R (Pre)",
    curingMethod: "Pre Cured",
    colour: "Red",
    hardness: "58",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.14,
    costPerKg: 75.5,
  },
  {
    code: "SS-A40B",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "40",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.04,
    costPerKg: null,
  },
  {
    code: "SS-A40R",
    curingMethod: "Steam Cured",
    colour: "Red",
    hardness: "40",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 79.97,
  },
  {
    code: "SS-A60B",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "60",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.1,
    costPerKg: null,
  },
  {
    code: "SS-A40B (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "40",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.04,
    costPerKg: null,
  },
  {
    code: "SS-A40R (Pre)",
    curingMethod: "Pre Cured",
    colour: "Red",
    hardness: "40",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.05,
    costPerKg: 79.97,
  },
  {
    code: "SS-A60B (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "60",
    type: "Natural Rubber",
    grade: "A",
    sg: 1.1,
    costPerKg: null,
  },
  {
    code: "SC-C60CB",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "60",
    type: "Chlorobutyl",
    grade: "C",
    sg: 1.13,
    costPerKg: 87.27,
  },
  {
    code: "SC-C50BB",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "50",
    type: "Bromobutyl",
    grade: "C",
    sg: 1.08,
    costPerKg: 85.81,
  },
  {
    code: "SC-C60NB",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "60",
    type: "Nitrile",
    grade: "B",
    sg: 1.4,
    costPerKg: 140.29,
  },
  {
    code: "SC-C60NEO",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "60",
    type: "Neoprene",
    grade: "C",
    sg: 1.1,
    costPerKg: 79.56,
  },
  {
    code: "SC-C50EPDM",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "50",
    type: "EPDM",
    grade: "C",
    sg: 1.21,
    costPerKg: 94.11,
  },
  {
    code: "SC-C60CB (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "60",
    type: "Chlorobutyl",
    grade: "C",
    sg: 1.13,
    costPerKg: 87.27,
  },
  {
    code: "SC-C50BB (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "50",
    type: "Bromobutyl",
    grade: "C",
    sg: 1.08,
    costPerKg: 85.81,
  },
  {
    code: "SC-C60NB (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "60",
    type: "Nitrile",
    grade: "B",
    sg: 1.4,
    costPerKg: 140.29,
  },
  {
    code: "SC-C60NEO (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "60",
    type: "Neoprene",
    grade: "C",
    sg: 1.1,
    costPerKg: 79.56,
  },
  {
    code: "SC-C50EPDM (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "50",
    type: "EPDM",
    grade: "C",
    sg: 1.21,
    costPerKg: 94.11,
  },
  {
    code: "AU-C50-NBR",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "50",
    type: "Nitrile",
    grade: "C",
    sg: 1.075,
    costPerKg: 99.48,
  },
  {
    code: "AU-C60-HYP",
    curingMethod: "Steam Cured",
    colour: "Black",
    hardness: "60",
    type: "Hypalon",
    grade: null,
    sg: 1.25,
    costPerKg: null,
  },
  {
    code: "AU-C50-NBR (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "50",
    type: "Nitrile",
    grade: "C",
    sg: 1.075,
    costPerKg: 99.48,
  },
  {
    code: "AU-C60-HYP (Pre)",
    curingMethod: "Pre Cured",
    colour: "Black",
    hardness: "60",
    type: "Hypalon",
    grade: null,
    sg: 1.25,
    costPerKg: null,
  },
];

async function main() {
  console.log("Connecting to database...");

  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USERNAME || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "annix_db",
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    entities: [RubberProductCoding, RubberProduct],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log("Connected.");

  const codingRepo = dataSource.getRepository(RubberProductCoding);
  const productRepo = dataSource.getRepository(RubberProduct);

  console.log("\n1. Deleting existing products...");
  const existingProducts = await productRepo.find();
  if (existingProducts.length > 0) {
    await productRepo.remove(existingProducts);
  }
  console.log(`   Deleted ${existingProducts.length} products`);

  console.log("\n2. Checking/creating codings...");

  const existingCodings = await codingRepo.find();
  const codingMap: Record<string, Record<string, string>> = {
    [ProductCodingType.COLOUR]: {},
    [ProductCodingType.HARDNESS]: {},
    [ProductCodingType.TYPE]: {},
    [ProductCodingType.GRADE]: {},
    [ProductCodingType.CURING_METHOD]: {},
    [ProductCodingType.COMPOUND]: {},
  };

  existingCodings.forEach((c) => {
    codingMap[c.codingType][c.name.toLowerCase()] = c.firebaseUid;
  });

  const ensureCoding = async (
    type: ProductCodingType,
    name: string,
    code?: string,
  ): Promise<string> => {
    const key = name.toLowerCase();
    if (codingMap[type][key]) {
      return codingMap[type][key];
    }

    const coding = codingRepo.create({
      firebaseUid: generateUid(),
      codingType: type,
      name: name,
      code: code || name.substring(0, 10).toUpperCase(),
    });
    const saved = await codingRepo.save(coding);
    codingMap[type][key] = saved.firebaseUid;
    console.log(`   Created ${type}: ${name}`);
    return saved.firebaseUid;
  };

  const colours = [...new Set(productData.map((p) => p.colour).filter(Boolean))] as string[];
  const hardnesses = [...new Set(productData.map((p) => p.hardness).filter(Boolean))] as string[];
  const types = [...new Set(productData.map((p) => p.type).filter(Boolean))] as string[];
  const grades = [...new Set(productData.map((p) => p.grade).filter(Boolean))] as string[];
  const curingMethods = [
    ...new Set(productData.map((p) => p.curingMethod).filter(Boolean)),
  ] as string[];

  console.log(`   Colours: ${colours.join(", ")}`);
  console.log(`   Hardnesses: ${hardnesses.join(", ")}`);
  console.log(`   Types: ${types.join(", ")}`);
  console.log(`   Grades: ${grades.join(", ")}`);
  console.log(`   Curing Methods: ${curingMethods.join(", ")}`);

  for (const colour of colours) {
    await ensureCoding(ProductCodingType.COLOUR, colour, colour[0].toUpperCase());
  }
  for (const hardness of hardnesses) {
    await ensureCoding(ProductCodingType.HARDNESS, hardness, hardness);
  }
  for (const type of types) {
    await ensureCoding(ProductCodingType.TYPE, type, type.substring(0, 3).toUpperCase());
  }
  for (const grade of grades) {
    await ensureCoding(ProductCodingType.GRADE, grade, grade);
  }
  for (const curingMethod of curingMethods) {
    await ensureCoding(
      ProductCodingType.CURING_METHOD,
      curingMethod,
      curingMethod === "Steam Cured" ? "SC" : "PC",
    );
  }

  console.log("\n3. Creating products...");

  let created = 0;
  for (const p of productData) {
    const colourUid = p.colour ? codingMap[ProductCodingType.COLOUR][p.colour.toLowerCase()] : null;
    const hardnessUid = p.hardness
      ? codingMap[ProductCodingType.HARDNESS][p.hardness.toLowerCase()]
      : null;
    const typeUid = p.type ? codingMap[ProductCodingType.TYPE][p.type.toLowerCase()] : null;
    const gradeUid = p.grade ? codingMap[ProductCodingType.GRADE][p.grade.toLowerCase()] : null;
    const curingMethodUid = p.curingMethod
      ? codingMap[ProductCodingType.CURING_METHOD][p.curingMethod.toLowerCase()]
      : null;

    const product = productRepo.create({
      firebaseUid: generateUid(),
      title: p.code,
      specificGravity: p.sg,
      costPerKg: p.costPerKg,
      colourFirebaseUid: colourUid,
      hardnessFirebaseUid: hardnessUid,
      typeFirebaseUid: typeUid,
      gradeFirebaseUid: gradeUid,
      curingMethodFirebaseUid: curingMethodUid,
      markup: 100,
    });

    await productRepo.save(product);
    created++;
    console.log(`   Created: ${p.code}`);
  }

  console.log("\n=== Summary ===");
  console.log(`Products created: ${created}`);
  console.log(
    `Total codings: ${Object.values(codingMap).reduce((sum, m) => sum + Object.keys(m).length, 0)}`,
  );

  await dataSource.destroy();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
