export function text(text: string): Node {
  return { type: NodeType.text, text };
}

export function elt(
  tagName: string,
  attrs: Attrs | null,
  children: Node[]
): Node {
  return { type: NodeType.element, tagName, attrs, children };
}

export function fragment(children: Node[]): Node {
  return { type: NodeType.fragment, children };
}

export function special(subtype: SpecialNodeType, children: Node[]): Node {
  return { type: NodeType.special, subtype, children };
}

export type Node = TextNode | ElementNode | FragmentNode | SpecialNode;

export enum NodeType {
  text = 'TEXT',
  element = 'ELEMENT',
  fragment = 'FRAGMENT',
  special = 'SPECIAL',
}

export enum SpecialNodeType {
  quote = 'QUOTE',
}

export interface TextNode extends BaseNode {
  type: NodeType.text;
  text: string;
}

export interface ElementNode extends BaseNode {
  type: NodeType.element;
  tagName: string;
  attrs: Attrs | null;
  children: Node[];
}

export type Attrs = { [attr: string]: string | undefined };

export interface FragmentNode extends BaseNode {
  type: NodeType.fragment;
  children: Node[];
}

export interface SpecialNode extends BaseNode {
  type: NodeType.special;
  subtype: SpecialNodeType;
  children: Node[];
}

interface BaseNode {
  type: NodeType;
}
