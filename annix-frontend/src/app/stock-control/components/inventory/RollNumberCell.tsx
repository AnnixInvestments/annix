"use client";

interface RollNumberCellProps {
  rollNumbers: string[] | null | undefined;
  rollNumber: string | null | undefined;
}

export function RollNumberCell(props: RollNumberCellProps) {
  const rolls = props.rollNumbers;
  const single = props.rollNumber;

  if (rolls && rolls.length > 1) {
    const title = rolls.join(", ");
    const count = rolls.length;
    return (
      <span title={title} className="cursor-help">
        {count} rolls
      </span>
    );
  }

  if (rolls && rolls.length === 1) {
    return <>{rolls[0]}</>;
  }

  if (single == null) {
    return null;
  }

  return <>{single}</>;
}
