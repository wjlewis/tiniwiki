import * as P from '../parser';
import * as H from '../html';
import { highlightCode } from '../hl';
import { collectInfo } from './collectInfo';
import katex from 'katex';

export function renderArticle(text: string): string {
  const blocks = P.parse(text);
  return H.renderRoot(layoutArticle(blocks));
}

function layoutArticle(blocks: P.Block[]): H.Node {
  const {
    title,
    blocks: bodyBlocks,
    footnotes,
    usesMath,
  } = collectInfo(blocks);

  const head = H.elt('head', null, [
    H.elt('meta', { charset: 'utf-8' }, []),
    addKatexCss(usesMath),
    H.elt('link', { rel: 'stylesheet', href: 'assets/main.css' }, []),
    H.elt('title', null, [H.text(title ?? '')]),
  ]);

  const body = H.elt('body', null, [
    H.elt('article', null, layoutBlocks(bodyBlocks)),
    H.elt('div', { class: 'footnotes' }, footnotes.map(layoutFootnoteBlock)),
  ]);

  return H.elt('html', null, [head, body]);
}

function addKatexCss(usesMath: boolean): H.Node {
  if (usesMath) {
    const katexCssHref =
      'https://cdn.jsdelivr.net/npm/katex@0.16.3/dist/katex.min.css';
    return H.elt(
      'link',
      {
        rel: 'stylesheet',
        href: katexCssHref,
        crossorigin: 'anonymous',
      },
      []
    );
  } else {
    return H.fragment([]);
  }
}

function layoutBlock(block: P.Block): H.Node {
  switch (block.type) {
    case P.BlockType.heading:
      return layoutHeadingBlock(block);
    case P.BlockType.para:
      return layoutParaBlock(block);
    case P.BlockType.code:
      return layoutCodeBlock(block);
    case P.BlockType.math:
      return layoutMathBlock(block);
    case P.BlockType.quote:
      return layoutQuoteBlock(block);
    case P.BlockType.footnote:
      return layoutFootnoteBlock(block);
  }
}

function layoutBlocks(blocks: P.Block[]): H.Node[] {
  return blocks.map(layoutBlock);
}

function layoutHeadingBlock(block: P.HeadingBlock): H.Node {
  const children = layoutEntities(block.content);
  const tagName = `h${block.order}`;
  return H.elt(tagName, null, children);
}

function layoutParaBlock(block: P.ParaBlock): H.Node {
  const children = layoutEntities(block.content);
  return H.elt('p', null, children);
}

function layoutCodeBlock(block: P.CodeBlock): H.Node {
  return H.elt('figure', { class: 'code' }, [
    H.elt('figcaption', null, layoutEntities(block.desc)),
    highlightCode(block.text, block.lang),
  ]);
}

function layoutMathBlock(block: P.MathBlock): H.Node {
  const tex = katex.renderToString(block.text, {
    displayMode: true,
    throwOnError: false,
  });
  return H.elt('figure', { class: 'math' }, [
    H.elt('figcaption', null, layoutEntities(block.desc)),
    H.elt('div', null, [H.text(tex)]),
  ]);
}

function layoutQuoteBlock(block: P.QuoteBlock): H.Node {
  return H.elt('figure', { class: 'blockquote' }, [
    H.elt('blockquote', null, layoutBlocks(block.children)),
    H.elt('figcaption', null, layoutEntities(block.desc)),
  ]);
}

function layoutFootnoteBlock(block: P.FootnoteBlock): H.Node {
  const id = `__fn-${block.ref}`;
  const href = `#__fn-${block.ref}-origin`;
  return H.elt('div', { id, class: 'footnote' }, [
    H.elt('span', null, [H.text(block.ref)]),
    ...layoutBlocks(block.children),
    H.elt('a', { href }, [H.text('->')]),
  ]);
}

function layoutEntity(entity: P.Entity): H.Node {
  switch (entity.type) {
    case P.EntityType.text:
      return layoutTextEntity(entity);
    case P.EntityType.simple:
      return layoutSimpleEntity(entity);
    case P.EntityType.compound:
      return layoutCompoundEntity(entity);
    case P.EntityType.footnoteRef:
      return layoutFootnoteRefEntity(entity);
    case P.EntityType.link:
      return layoutLinkEntity(entity);
    case P.EntityType.img:
      return layoutImgEntity(entity);
  }
}

function layoutEntities(entities: P.Entity[]): H.Node[] {
  return entities.map(layoutEntity);
}

function layoutTextEntity(entity: P.TextEntity): H.Node {
  return H.text(entity.text);
}

function layoutSimpleEntity(entity: P.SimpleEntity): H.Node {
  switch (entity.subtype) {
    case P.SimpleEntityType.math: {
      const tex = katex.renderToString(entity.text, { throwOnError: false });
      return H.elt('span', { class: 'math' }, [H.text(tex)]);
    }
    case P.SimpleEntityType.mono:
      return H.elt('code', null, [H.text(entity.text)]);
  }
}

function layoutCompoundEntity(entity: P.CompoundEntity): H.Node {
  const children = layoutEntities(entity.children);
  switch (entity.subtype) {
    case P.CompoundEntityType.em:
      return H.elt('em', null, children);
    case P.CompoundEntityType.strong:
      return H.elt('strong', null, children);
    case P.CompoundEntityType.quote:
      return H.special(H.SpecialNodeType.quote, children);
  }
}

function layoutFootnoteRefEntity(entity: P.FootnoteRefEntity): H.Node {
  const id = `__fn-${entity.ref}-origin`;
  const href = `#__fn-${entity.ref}`;
  return H.elt('sup', { class: 'footnote-ref', id }, [
    H.elt('a', { href }, [H.text(entity.ref)]),
  ]);
}

function layoutLinkEntity(entity: P.LinkEntity): H.Node {
  const children = layoutEntities(entity.children);
  return H.elt('a', { href: entity.href }, children);
}

function layoutImgEntity(entity: P.ImgEntity): H.Node {
  const { src, alt } = entity;
  return H.elt('img', { src, alt }, []);
}
