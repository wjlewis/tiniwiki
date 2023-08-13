import { Entity, EntityType } from './parse';

export default function toPlainText(entities: Entity[]): string {
  return entities.map(entityToPlainText).join('');
}

function entityToPlainText(entity: Entity): string {
  switch (entity.type) {
    case EntityType.plain:
      return entity.text;
    case EntityType.emph:
      return toPlainText(entity.children);
    case EntityType.strong:
      return toPlainText(entity.children);
    case EntityType.mono:
      return entity.text;
    case EntityType.link:
      return toPlainText(entity.children);
    case EntityType.footnoteRef:
      return '';
  }
}
