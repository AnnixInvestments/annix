/**
 * Mongo schema generator — issue #298
 *
 * Re-runnable: emits a @nestjs/mongoose @Schema() class for each TypeORM entity.
 * Run with: npx ts-node --transpile-only scripts/generate-mongo-schemas.ts
 */

import fs from "node:fs";
import path from "node:path";
import { getMetadataArgsStorage } from "typeorm";

const SRC_DIR = path.resolve(__dirname, "../src");

function findEntityFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEntityFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".entity.ts")) {
      results.push(full);
    }
  }
  return results;
}

interface ProcessedColumn {
  propertyName: string;
  mongoType: string;
  isArray: boolean;
  required: boolean;
  isPrimary: boolean;
}

interface ProcessedRelation {
  propertyName: string;
  relationType: string;
  targetClassName: string | null;
  inverseFkField: string | null;
}

interface EntitySchema {
  className: string;
  collectionName: string;
  columns: ProcessedColumn[];
  relations: ProcessedRelation[];
}

interface GeneratorResult {
  generated: string[];
  failed: Array<{ file: string; error: string }>;
}

type EntityClass = { name: string } & (abstract new (...args: never[]) => unknown);
type NamedCallable = { name: string; toString(): string } & ((...args: never[]) => unknown);

function isEntityClass(value: unknown): value is EntityClass {
  return typeof value === "function" && typeof (value as { name?: unknown }).name === "string";
}

function typeormColToMongoType(
  opts: Record<string, unknown>,
  isGenerated: boolean,
): { mongoType: string; isArray: boolean } {
  const rawTypeValue = opts["type"];
  const isArray = !!opts["array"];

  if (typeof rawTypeValue === "function") {
    const ctorName = (rawTypeValue as NamedCallable).name;
    if (ctorName === "Number") return { mongoType: "Number", isArray };
    if (ctorName === "Boolean") return { mongoType: "Boolean", isArray };
    if (ctorName === "Date") return { mongoType: "Date", isArray };
    return { mongoType: "String", isArray };
  }

  const rawType = typeof rawTypeValue === "string" ? rawTypeValue : "";

  if (isGenerated && rawType === "uuid") {
    return { mongoType: "String", isArray: false };
  }

  const lower = rawType.toLowerCase();

  if (
    lower === "varchar" ||
    lower === "text" ||
    lower === "uuid" ||
    lower === "char" ||
    lower === "enum" ||
    lower === "character varying" ||
    lower === "tsvector" ||
    lower === ""
  ) {
    return { mongoType: "String", isArray };
  }

  if (
    lower === "int" ||
    lower === "integer" ||
    lower === "smallint" ||
    lower === "bigint" ||
    lower === "decimal" ||
    lower === "numeric" ||
    lower === "real" ||
    lower === "float" ||
    lower === "double" ||
    lower === "double precision" ||
    lower === "float4" ||
    lower === "float8" ||
    lower === "int2" ||
    lower === "int4" ||
    lower === "int8" ||
    lower === "money"
  ) {
    return { mongoType: "Number", isArray };
  }

  if (lower === "boolean" || lower === "bool") {
    return { mongoType: "Boolean", isArray };
  }

  if (
    lower === "timestamp" ||
    lower === "timestamptz" ||
    lower === "timestamp with time zone" ||
    lower === "timestamp without time zone" ||
    lower === "date" ||
    lower === "time" ||
    lower === "timetz"
  ) {
    return { mongoType: "Date", isArray };
  }

  if (lower === "json" || lower === "jsonb") {
    return { mongoType: "Object", isArray };
  }

  if (lower === "simple-array" || lower === "simple-json") {
    return { mongoType: "String", isArray: true };
  }

  return { mongoType: "String", isArray };
}

function resolveTargetClassName(typeValue: unknown): string | null {
  if (typeof typeValue === "string") {
    return typeValue.length > 0 ? typeValue : null;
  }

  if (typeof typeValue === "function") {
    const asCtor = typeValue as NamedCallable;
    if (asCtor.name && /^[A-Z]/.test(asCtor.name)) {
      return asCtor.name;
    }
    try {
      const resolved = (typeValue as (t?: unknown) => unknown)();
      if (typeof resolved === "function" && (resolved as NamedCallable).name) {
        return (resolved as NamedCallable).name;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function resolveInverseFkField(inverseSideProperty: unknown): string | null {
  if (typeof inverseSideProperty === "string") {
    return inverseSideProperty.length > 0 ? `${inverseSideProperty}Id` : null;
  }

  if (typeof inverseSideProperty === "function") {
    const fnSource = (inverseSideProperty as NamedCallable).toString();
    const match = fnSource.match(/=>\s*[A-Za-z_$][\w$]*\s*[.[]\s*["']?([A-Za-z_$][\w$]*)/);
    if (match?.[1]) {
      return `${match[1]}Id`;
    }
  }

  return null;
}

function collectAncestorChain(entityClass: EntityClass): Set<EntityClass> {
  const chain = new Set<EntityClass>([entityClass]);
  let proto = Object.getPrototypeOf(entityClass) as EntityClass | null;
  while (proto?.name) {
    chain.add(proto);
    proto = Object.getPrototypeOf(proto) as EntityClass | null;
  }
  return chain;
}

function processEntity(entityClass: EntityClass, tableName: string): EntitySchema {
  const storage = getMetadataArgsStorage();
  const className = entityClass.name;
  const ancestorChain = collectAncestorChain(entityClass);

  const allColumns = storage.columns.filter(
    (c) => isEntityClass(c.target) && ancestorChain.has(c.target),
  );

  const allGenerations = storage.generations.filter(
    (g) => isEntityClass(g.target) && ancestorChain.has(g.target),
  );

  const generatedProps = new Set(allGenerations.map((g) => g.propertyName));

  const allRelations = storage.relations.filter(
    (r) => isEntityClass(r.target) && ancestorChain.has(r.target),
  );

  const columns: ProcessedColumn[] = allColumns.map((col) => {
    const opts = col.options as Record<string, unknown>;
    const isGenerated = generatedProps.has(col.propertyName);
    const isPrimary = !!opts["primary"];
    const isNullable = !!opts["nullable"];
    const { mongoType, isArray } = typeormColToMongoType(opts, isGenerated);

    return {
      propertyName: col.propertyName,
      mongoType,
      isArray,
      required: !isNullable && !isPrimary && col.mode !== "createDate" && col.mode !== "updateDate",
      isPrimary,
    };
  });

  const relations: ProcessedRelation[] = allRelations.map((rel) => ({
    propertyName: rel.propertyName,
    relationType: rel.relationType,
    targetClassName: resolveTargetClassName(rel.type),
    inverseFkField:
      rel.relationType === "one-to-many" ? resolveInverseFkField(rel.inverseSideProperty) : null,
  }));

  return { className, collectionName: tableName, columns, relations };
}

function mongoTypeToTsType(mongoType: string): string {
  if (mongoType === "String") return "string";
  if (mongoType === "Number") return "number";
  if (mongoType === "Boolean") return "boolean";
  if (mongoType === "Date") return "Date";
  return "Record<string, unknown>";
}

function renderSchema(schema: EntitySchema, idTypeByClass: Map<string, string>): string {
  const lines: string[] = [];

  lines.push('import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";');
  lines.push('import type { HydratedDocument } from "mongoose";');
  lines.push("");
  lines.push(`export type ${schema.className}Document = HydratedDocument<${schema.className}>;`);
  lines.push("");
  lines.push(
    `@Schema({ collection: "${schema.collectionName}", timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })`,
  );
  lines.push(`export class ${schema.className} {`);

  const existingPropNames = new Set<string>();

  for (const col of schema.columns) {
    existingPropNames.add(col.propertyName);

    if (col.isPrimary) {
      lines.push(`  @Prop({ type: ${col.mongoType} })`);
      lines.push(`  _id: ${mongoTypeToTsType(col.mongoType)};`);
      lines.push("");
      continue;
    }

    if (col.isArray) {
      lines.push(`  @Prop({ type: [${col.mongoType}], required: ${col.required} })`);
    } else {
      lines.push(`  @Prop({ type: ${col.mongoType}, required: ${col.required} })`);
    }
    lines.push(`  ${col.propertyName}: ${mongoTypeToTsType(col.mongoType)};`);
    lines.push("");
  }

  for (const rel of schema.relations) {
    if (rel.relationType === "many-to-one" || rel.relationType === "one-to-one") {
      const idPropName = `${rel.propertyName}Id`;
      if (!existingPropNames.has(idPropName)) {
        const targetIdMongoType =
          (rel.targetClassName && idTypeByClass.get(rel.targetClassName)) || "Number";
        lines.push(`  @Prop({ type: ${targetIdMongoType}, required: false })`);
        lines.push(`  ${idPropName}: ${mongoTypeToTsType(targetIdMongoType)};`);
        lines.push("");
      }
    } else if (rel.relationType === "many-to-many") {
      lines.push("  // TODO #298: relation needs embed-vs-ref review");
      lines.push(`  // ${rel.relationType}: ${rel.propertyName}`);
      lines.push("");
    }
  }

  lines.push("}");
  lines.push("");
  lines.push(
    `export const ${schema.className}Schema = SchemaFactory.createForClass(${schema.className});`,
  );
  lines.push("");

  const schemaVar = `${schema.className}Schema`;

  for (const rel of schema.relations) {
    if (rel.relationType === "many-to-one" || rel.relationType === "one-to-one") {
      if (rel.targetClassName) {
        lines.push(
          `${schemaVar}.virtual("${rel.propertyName}", { ref: "${rel.targetClassName}", localField: "${rel.propertyName}Id", foreignField: "_id", justOne: true });`,
        );
        lines.push("");
      } else {
        lines.push("// TODO #298: relation needs embed-vs-ref review");
        lines.push(`// ${rel.relationType}: ${rel.propertyName}`);
        lines.push("");
      }
    } else if (rel.relationType === "one-to-many") {
      if (rel.targetClassName && rel.inverseFkField) {
        lines.push(
          `${schemaVar}.virtual("${rel.propertyName}", { ref: "${rel.targetClassName}", localField: "_id", foreignField: "${rel.inverseFkField}", justOne: false });`,
        );
        lines.push("");
      } else {
        lines.push("// TODO #298: relation needs embed-vs-ref review");
        lines.push(`// ${rel.relationType}: ${rel.propertyName}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function main(): void {
  console.log(`Discovering entity files under ${SRC_DIR} ...`);

  const entityFiles: string[] = findEntityFiles(SRC_DIR);

  console.log(`Found ${entityFiles.length} entity file(s). Loading...`);

  const loadErrors: string[] = [];
  for (const file of entityFiles) {
    try {
      require(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      loadErrors.push(`${file}: ${message}`);
    }
  }

  if (loadErrors.length > 0) {
    console.warn(`\nFailed to load ${loadErrors.length} entity file(s):`);
    for (const e of loadErrors) {
      console.warn(`  ${e}`);
    }
  }

  const storage = getMetadataArgsStorage();
  const tableArgs = storage.tables.filter((t) => t.type === "regular" && isEntityClass(t.target));

  console.log(`\nProcessing ${tableArgs.length} entity table(s)...`);

  const result: GeneratorResult = { generated: [], failed: [] };

  const processed = tableArgs
    .map((tableArg) => {
      if (!isEntityClass(tableArg.target)) {
        return null;
      }
      const entityClass = tableArg.target;
      const className = entityClass.name;
      try {
        const schema = processEntity(entityClass, tableArg.name || className.toLowerCase());
        return { entityClass, className, schema };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.failed.push({ file: className, error: message });
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const idTypeByClass = new Map<string, string>();
  for (const { className, schema } of processed) {
    const primary = schema.columns.find((col) => col.isPrimary);
    if (primary) {
      idTypeByClass.set(className, primary.mongoType);
    }
  }

  for (const { entityClass, className, schema } of processed) {
    try {
      const entityFile = entityFiles.find((f) => {
        try {
          const mod = require.cache[require.resolve(f)];
          if (!mod) return false;
          return Object.values(mod.exports).includes(entityClass);
        } catch {
          return false;
        }
      });

      let schemaDir: string;
      if (entityFile) {
        const entityDir = path.dirname(entityFile);
        const parentDir =
          entityDir.endsWith("/entities") || entityDir.endsWith("\\entities")
            ? path.dirname(entityDir)
            : entityDir;
        schemaDir = path.join(parentDir, "schemas");
      } else {
        schemaDir = path.join(SRC_DIR, "schemas");
      }

      fs.mkdirSync(schemaDir, { recursive: true });

      const kebab = className
        .replace(/([A-Z])/g, (m, ch, offset) => (offset > 0 ? "-" : "") + ch.toLowerCase())
        .replace(/^-/, "");
      const schemaFile = path.join(schemaDir, `${kebab}.schema.ts`);

      fs.writeFileSync(schemaFile, renderSchema(schema, idTypeByClass), "utf-8");
      result.generated.push(schemaFile);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.failed.push({ file: className, error: message });
    }
  }

  console.log("\n=== Generator complete ===");
  console.log(`Generated: ${result.generated.length} schema file(s)`);

  if (result.failed.length > 0) {
    console.error(`\nFailed (${result.failed.length}):`);
    for (const f of result.failed) {
      console.error(`  ${f.file}: ${f.error}`);
    }
  }

  if (loadErrors.length > 0) {
    console.error(`\nEntity load errors (${loadErrors.length}):`);
    for (const e of loadErrors) {
      console.error(`  ${e}`);
    }
  }
}

try {
  main();
} catch (err) {
  console.error("Generator failed:", err);
  process.exit(1);
}
