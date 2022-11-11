import * as P from '../parser';

export function collectInfo(blocks: P.Block[]): BodyInfo {
  const [footnotes, body] = partition(
    blocks,
    bl => bl.type === P.BlockType.footnote
  );

  const title =
    body[0]?.type === P.BlockType.heading && body[0].order === 1
      ? entitiesToPlainText(body[0].content)
      : undefined;

  const remapResult = remapFootnotesInBlocks(body, {});

  // Update the footnote refs in `footnotes` using the refMap constructed in the
  // previous step.
  const updatedFootnotes = (footnotes as P.FootnoteBlock[]).map(fn => {
    const updatedRef = remapResult.refMap[fn.ref];
    if (!updatedRef) {
      console.warn(`footnote has ref not referenced in document: '${fn.ref}'`);
      return fn;
    } else {
      return { ...fn, ref: updatedRef };
    }
  });

  const usesMath = blocksUseMath(blocks);

  return {
    blocks: remapResult.updated,
    title,
    footnotes: updatedFootnotes,
    usesMath,
  };
}

interface BodyInfo {
  blocks: P.Block[];
  title?: string;
  footnotes: P.FootnoteBlock[];
  usesMath: boolean;
}

function remapFootnotesInBlock(
  block: P.Block,
  refMap: RefMap
): WithRefMap<P.Block> {
  switch (block.type) {
    case P.BlockType.heading:
    case P.BlockType.para:
      const res = remapFootnotesInEntities(block.content, refMap);
      return {
        updated: { ...block, content: res.updated },
        refMap: res.refMap,
      };
    case P.BlockType.code:
    case P.BlockType.math:
      return { updated: block, refMap };
    case P.BlockType.quote: {
      const res = remapFootnotesInBlocks(block.children, refMap);
      return {
        updated: { ...block, children: res.updated },
        refMap: res.refMap,
      };
    }
    case P.BlockType.footnote:
      return { updated: block, refMap };
  }
}

function remapFootnotesInBlocks(
  blocks: P.Block[],
  refMap: RefMap
): WithRefMap<P.Block[]> {
  return blocks.reduce(
    ({ updated, refMap }, block) => {
      const res = remapFootnotesInBlock(block, refMap);
      return { updated: [...updated, res.updated], refMap: res.refMap };
    },
    { updated: [], refMap } as WithRefMap<P.Block[]>
  );
}

function remapFootnotesInEntity(
  entity: P.Entity,
  refMap: RefMap
): WithRefMap<P.Entity> {
  switch (entity.type) {
    case P.EntityType.text:
    case P.EntityType.simple:
      return { updated: entity, refMap };
    case P.EntityType.compound: {
      const res = remapFootnotesInEntities(entity.children, refMap);
      return {
        updated: { ...entity, children: res.updated },
        refMap: res.refMap,
      };
    }
    case P.EntityType.footnoteRef: {
      const nextRef = Object.keys(refMap).length + 1;
      return {
        updated: { ...entity, ref: nextRef.toString() },
        refMap: { ...refMap, [entity.ref]: nextRef.toString() },
      };
    }
    case P.EntityType.link:
    case P.EntityType.img:
      return { updated: entity, refMap };
  }
}

function remapFootnotesInEntities(
  entities: P.Entity[],
  refMap: RefMap
): WithRefMap<P.Entity[]> {
  return entities.reduce(
    ({ updated, refMap }, entity) => {
      const res = remapFootnotesInEntity(entity, refMap);
      return {
        updated: [...updated, res.updated],
        refMap: res.refMap,
      };
    },
    { updated: [], refMap } as WithRefMap<P.Entity[]>
  );
}

interface WithRefMap<T> {
  updated: T;
  refMap: RefMap;
}

type RefMap = { [oldRef: string]: string };

function partition<T>(xs: T[], pred: (x: T) => boolean): [T[], T[]] {
  const yes = [];
  const no = [];
  for (const x of xs) {
    if (pred(x)) {
      yes.push(x);
    } else {
      no.push(x);
    }
  }
  return [yes, no];
}

function entitiesToPlainText(entities: P.Entity[]): string {
  return entities.map(entityToPlainText).join('');
}

function entityToPlainText(entity: P.Entity): string {
  switch (entity.type) {
    case P.EntityType.text:
      return entity.text;
    case P.EntityType.simple:
      return entity.text;
    case P.EntityType.compound:
      switch (entity.subtype) {
        case P.CompoundEntityType.em:
        case P.CompoundEntityType.strong:
          return entitiesToPlainText(entity.children);
        case P.CompoundEntityType.quote:
          return `"${entitiesToPlainText(entity.children)}"`;
      }
    case P.EntityType.footnoteRef:
      return '';
    case P.EntityType.link:
      return entitiesToPlainText(entity.children);
    case P.EntityType.img:
      return '';
  }
}

function blockUsesMath(block: P.Block): boolean {
  switch (block.type) {
    case P.BlockType.heading:
    case P.BlockType.para:
      return entitiesUseMath(block.content);
    case P.BlockType.code:
      return entitiesUseMath(block.desc);
    case P.BlockType.math:
      return true;
    case P.BlockType.quote:
      return blocksUseMath(block.children) || entitiesUseMath(block.desc);
    case P.BlockType.footnote:
      return blocksUseMath(block.children);
  }
}

function blocksUseMath(blocks: P.Block[]): boolean {
  return blocks.some(blockUsesMath);
}

function entityUsesMath(entity: P.Entity): boolean {
  switch (entity.type) {
    case P.EntityType.text:
      return false;
    case P.EntityType.simple:
      switch (entity.subtype) {
        case P.SimpleEntityType.math:
          return true;
        default:
          return false;
      }
    case P.EntityType.compound:
      switch (entity.subtype) {
        case P.CompoundEntityType.em:
        case P.CompoundEntityType.strong:
        case P.CompoundEntityType.quote:
          return entitiesUseMath(entity.children);
      }
    case P.EntityType.footnoteRef:
      return false;
    case P.EntityType.link:
      return entitiesUseMath(entity.children);
    case P.EntityType.img:
      return false;
  }
}

function entitiesUseMath(entities: P.Entity[]): boolean {
  return entities.some(entityUsesMath);
}
