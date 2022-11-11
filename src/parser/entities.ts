export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  let pos = 0;
  let wipPos = 0;

  function advance() {
    pos += 1;
  }

  function jump(to: number) {
    pos = to;
    wipPos = to;
  }

  function commitText(upTo: number) {
    if (upTo > wipPos) {
      entities.push({ type: EntityType.text, text: text.slice(wipPos, upTo) });
    }
  }

  function addEntity(closePos: number, fn: () => Entity, markerLength = 1) {
    commitText(pos);
    entities.push(fn());
    jump(closePos + markerLength);
  }

  while (pos < text.length) {
    if (['`', '$'].includes(text[pos])) {
      const marker = text[pos];
      const closePos = findNextInlineMarker(text, pos + 1, marker);
      if (closePos < 0) {
        advance();
      } else {
        addEntity(closePos, () => {
          const innerText = text.slice(pos + 1, closePos);
          return {
            type: EntityType.simple,
            subtype: simpleTypes[marker],
            text: innerText,
          };
        });
      }
    } else if (['_', '*', '"'].includes(text[pos])) {
      const marker = text[pos];
      const closePos = findNextInlineMarker(text, pos + 1, marker);
      if (closePos < 0) {
        advance();
      } else {
        addEntity(closePos, () => {
          const innerText = text.slice(pos + 1, closePos);
          const children = extractEntities(innerText);
          return {
            type: EntityType.compound,
            subtype: compoundTypes[marker],
            children,
          };
        });
      }
    } else if (text.slice(pos).startsWith('[^')) {
      const closePos = findNextInlineMarker(text, pos + 2, ']');
      if (closePos < 0) {
        advance();
      } else {
        addEntity(closePos, () => {
          const ref = text.slice(pos + 2, closePos);
          return { type: EntityType.footnoteRef, ref };
        });
      }
    } else if (text[pos] === '[') {
      const midPos = findNextInlineMarker(text, pos + 1, '](', ']');
      if (midPos < 0) {
        advance();
      } else {
        const closePos = findNextInlineMarker(text, midPos + 2, ')');
        if (closePos < 0) {
          advance();
        } else {
          addEntity(closePos, () => {
            const linkText = text.slice(pos + 1, midPos);
            const children = extractEntities(linkText);
            const href = text.slice(midPos + 2, closePos);
            return { type: EntityType.link, children, href };
          });
        }
      }
    } else if (text.slice(pos).startsWith('![')) {
      const midPos = findNextInlineMarker(text, pos + 2, '](', ']');
      if (midPos < 0) {
        advance();
      } else {
        const closePos = findNextInlineMarker(text, midPos + 2, ')');
        if (closePos < 0) {
          advance();
        } else {
          addEntity(closePos, () => {
            const alt = text.slice(pos + 2, midPos);
            const src = text.slice(midPos + 2, closePos);
            return { type: EntityType.img, alt, src };
          });
        }
      }
    } else {
      advance();
    }
  }

  commitText(text.length);

  return entities;
}

export function findNextInlineMarker(
  text: string,
  start: number,
  marker: string,
  ...avoid: string[]
): number {
  for (let i = start; i < text.length; i++) {
    if (text.slice(i).startsWith(marker)) {
      return i;
    } else if (avoid.some(a => text.slice(i).startsWith(a))) {
      return -1;
    }
  }
  return -1;
}

export type Entity =
  | TextEntity
  | SimpleEntity
  | CompoundEntity
  | FootnoteRefEntity
  | LinkEntity
  | ImgEntity;

export enum EntityType {
  text = 'TEXT',
  simple = 'SIMPLE',
  compound = 'COMPOUND',
  footnoteRef = 'FOOTNOTE_REF',
  link = 'LINK',
  img = 'IMG',
}

export enum SimpleEntityType {
  mono = 'MONO',
  math = 'MATH',
}

export enum CompoundEntityType {
  em = 'EM',
  strong = 'STRONG',
  quote = 'QUOTE',
}

export interface TextEntity extends BaseEntity {
  type: EntityType.text;
  text: string;
}

export interface SimpleEntity extends BaseEntity {
  type: EntityType.simple;
  subtype: SimpleEntityType;
  text: string;
}

export interface CompoundEntity extends BaseEntity {
  type: EntityType.compound;
  subtype: CompoundEntityType;
  children: Entity[];
}

export interface FootnoteRefEntity extends BaseEntity {
  type: EntityType.footnoteRef;
  ref: string;
}

export interface LinkEntity extends BaseEntity {
  type: EntityType.link;
  href: string;
  children: Entity[];
}

export interface ImgEntity extends BaseEntity {
  type: EntityType.img;
  src: string;
  alt: string;
}

interface BaseEntity {
  type: EntityType;
}

const simpleTypes: Record<string, SimpleEntityType> = {
  '`': SimpleEntityType.mono,
  $: SimpleEntityType.math,
};

const compoundTypes: Record<string, CompoundEntityType> = {
  _: CompoundEntityType.em,
  '*': CompoundEntityType.strong,
  '"': CompoundEntityType.quote,
};
