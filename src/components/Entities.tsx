import React from 'react';
import { Entity as EntityType } from '../parse';
import Entity from './Entity';

export interface EntitiesProps {
  entities: EntityType[];
}

const Entities: React.FC<EntitiesProps> = ({ entities }) => {
  return (
    <>
      {entities.map((entity, i) => (
        <Entity key={i} entity={entity} />
      ))}
    </>
  );
};

export default Entities;
