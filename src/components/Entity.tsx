import React from 'react';
import { Entity, EntityType } from '../text/parse';
import Entities from './Entities';

export interface EntityProps {
  entity: Entity;
}

const Entity: React.FC<EntityProps> = ({ entity }) => {
  switch (entity.type) {
    case EntityType.plain:
      return <>{entity.text}</>;
    case EntityType.emph:
      return <em>{<Entities entities={entity.children} />}</em>;
    case EntityType.strong:
      return <strong>{<Entities entities={entity.children} />}</strong>;
    case EntityType.quote:
      return (
        <span>&ldquo;{<Entities entities={entity.children} />}&rdquo;</span>
      );
    case EntityType.mono:
      return <code className="inline">{entity.text}</code>;
    case EntityType.link:
      return (
        <a href={entity.href}>
          <Entities entities={entity.children} />
        </a>
      );
    case EntityType.footnoteRef: {
      const id = `__footnote_ref_${entity.key}`;
      const href = `#__footnote_${entity.key}`;
      return (
        <a id={id} href={href}>
          <sup>[{entity.key}]</sup>
        </a>
      );
    }
  }
};

export default Entity;
