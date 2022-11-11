import { Node, NodeType, Attrs, SpecialNodeType } from './nodes';

export function renderRoot(rootNode: Node): string {
  return `<!DOCTYPE html>${renderNode(rootNode)}`;
}

export function renderNode(node: Node): string {
  switch (node.type) {
    case NodeType.text:
      return node.text;
    case NodeType.element: {
      const { tagName, attrs, children } = node;
      if (selfClosingTagNames.includes(tagName)) {
        return `<${tagName}${renderAttrs(attrs)} />`;
      } else {
        const open = `<${tagName}${renderAttrs(attrs)}>`;
        const inner = renderNodes(children);
        const close = `</${tagName}>`;
        return [open, inner, close].join('');
      }
    }
    case NodeType.fragment:
      return renderNodes(node.children);
    case NodeType.special:
      switch (node.subtype) {
        case SpecialNodeType.quote:
          return `&ldquo;${renderNodes(node.children)}&rdquo;`;
      }
  }
}

const selfClosingTagNames = ['img', 'link', 'meta'];

function renderAttrs(attrs: Attrs | null): string {
  const pairs = Object.entries(attrs ?? {})
    .filter(([_name, value]) => !!value)
    .map(([name, value]) => `${name}="${value}"`);
  if (pairs.length === 0) {
    return '';
  } else {
    return ` ${pairs.join(' ')}`;
  }
}

export function renderNodes(nodes: Node[]): string {
  return nodes.map(renderNode).join('');
}
