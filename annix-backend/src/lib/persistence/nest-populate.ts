import type { PopulateOptions } from "mongoose";

function mergeSegments(nodes: PopulateOptions[], segments: string[]): PopulateOptions[] {
  const [head, ...rest] = segments;
  const match = nodes.find((node) => node.path === head);
  const others = nodes.filter((node) => node.path !== head);
  const existingChildren =
    match?.populate == null
      ? []
      : Array.isArray(match.populate)
        ? (match.populate as PopulateOptions[])
        : [match.populate as PopulateOptions];
  const merged: PopulateOptions =
    rest.length === 0
      ? { ...(match ?? { path: head }) }
      : { ...(match ?? { path: head }), populate: mergeSegments(existingChildren, rest) };
  return [...others, merged];
}

export function nestPopulate(relations: string[]): PopulateOptions[] {
  return relations.reduce<PopulateOptions[]>(
    (roots, relation) => mergeSegments(roots, relation.split(".")),
    [],
  );
}
