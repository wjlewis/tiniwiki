import katex from 'katex';
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
    case EntityType.math:
      return (
        <span
          className="math"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(entity.text, { throwOnError: false }),
          }}
        />
      );
    case EntityType.link:
      return (
        <a href={entity.href}>
          <Entities entities={entity.children} />
        </a>
      );
  }
};

export default Entity;
