"use client";

import { useForm } from "react-hook-form";
import type { ColumnSchemaInfo, RelationSchemaInfo } from "@/app/lib/api/adminApi";
import {
  coerceFormValue,
  formatDefaultValue,
  HtmlInputType,
  htmlInputType,
  isJsonType,
} from "@/app/lib/reference-data/columnTypes";

interface ReferenceDataFormModalProps {
  entityDisplayName: string;
  columns: ColumnSchemaInfo[];
  relations: RelationSchemaInfo[];
  initialData: Record<string, any> | null;
  isSaving: boolean;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
}

export function ReferenceDataFormModal({
  entityDisplayName,
  columns,
  relations,
  initialData,
  isSaving,
  onSave,
  onCancel,
}: ReferenceDataFormModalProps) {
  const isEditing = initialData !== null;

  const editableColumns = columns.filter(
    (col) => !col.isPrimary && !col.isGenerated && !isJsonType(col.type),
  );

  const relationJoinColumns = new Set(relations.map((r) => r.joinColumnName).filter(Boolean));

  const formColumns = editableColumns.filter((col) => !relationJoinColumns.has(col.databaseName));

  const defaultValues: Record<string, any> = {};
  formColumns.forEach((col) => {
    if (isEditing && initialData) {
      defaultValues[col.propertyName] = formatDefaultValue(initialData[col.propertyName], col.type);
    } else {
      defaultValues[col.propertyName] = "";
    }
  });

  relations.forEach((rel) => {
    if (isEditing && initialData) {
      const relValue = initialData[rel.propertyName];
      defaultValues[`__rel_${rel.propertyName}`] = relValue?.id ?? "";
    } else {
      defaultValues[`__rel_${rel.propertyName}`] = "";
    }
  });

  const { register, handleSubmit } = useForm({ defaultValues });

  const onSubmit = (formData: Record<string, any>) => {
    const payload: Record<string, any> = {};

    formColumns.forEach((col) => {
      payload[col.propertyName] = coerceFormValue(formData[col.propertyName], col.type);
    });

    relations.forEach((rel) => {
      const relId = formData[`__rel_${rel.propertyName}`];
      if (rel.joinColumnName) {
        const joinPropName = editableColumns.find(
          (c) => c.databaseName === rel.joinColumnName,
        )?.propertyName;
        if (joinPropName) {
          payload[joinPropName] = relId ? Number(relId) : null;
        }
      } else {
        payload[rel.propertyName] = relId ? { id: Number(relId) } : null;
      }
    });

    onSave(payload);
  };

  const labelForColumn = (col: ColumnSchemaInfo): string => {
    return col.propertyName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? "Edit" : "Create"} {entityDisplayName}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formColumns.map((col) => {
              const inputType = htmlInputType(col.type);
              const isBooleanInput = inputType === HtmlInputType.Checkbox;

              return (
                <div key={col.propertyName}>
                  {isBooleanInput ? (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register(col.propertyName)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {labelForColumn(col)}
                      </span>
                    </label>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700">
                        {labelForColumn(col)}
                        {!col.nullable && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={inputType}
                        step={inputType === HtmlInputType.Number ? "any" : undefined}
                        {...register(col.propertyName, { required: !col.nullable })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {relations.map((rel) => (
              <div key={rel.propertyName}>
                <label className="block text-sm font-medium text-gray-700">
                  {rel.propertyName
                    .replace(/([A-Z])/g, " $1")
                    .trim()
                    .replace(/^./, (c) => c.toUpperCase())}{" "}
                  (ID)
                </label>
                <input
                  type="number"
                  {...register(`__rel_${rel.propertyName}`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder={`Enter ${rel.targetEntityName} ID`}
                />
                <p className="mt-1 text-xs text-gray-500">Related to: {rel.targetEntityName}</p>
              </div>
            ))}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
