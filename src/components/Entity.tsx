import React from 'react';
import katex from 'katex';
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
      return <>&ldquo;{<Entities entities={entity.children} />}&rdquo;</>;
    case EntityType.mono:
      return <code className="inline code">{entity.text}</code>;
    case EntityType.math:
      return (
        <span
          className="inline math"
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
    case EntityType.footnoteRef: {
      const id = `__footnote_ref_${entity.key}`;
      const href = `#__footnote_${entity.key}`;
      return (
        <a id={id} href={href} className="footnote-ref">
          <sup>{entity.key}</sup>
        </a>
      );
    }
    case EntityType.image: {
      return <img src={entity.src} alt={entity.alt} />;
    }
  }
};

export default Entity;
