/**
 * Remove duplicates, leaving only the _first_ occurrence of each distinct item
 * in `xs`.
 */
export function unique<T>(xs: T[]): T[] {
  const seen = new Set();
  const out: T[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }

  return out;
}

/**
 * Sort in ascending order according to the value of `fn(x)` for each `x` in
 * `xs`.
 */
export function sortBy<T>(xs: T[], fn: (x: T) => any): T[] {
  if (xs.length === 0) {
    return [];
  } else if (xs.length === 1) {
    return [xs[0]];
  } else {
    const mid = Math.floor(xs.length / 2);
    const init = xs.slice(0, mid);
    const rest = xs.slice(mid);
    return mergeBy(sortBy(init, fn), sortBy(rest, fn), fn);
  }
}

function mergeBy<T>(xs: T[], ys: T[], fn: (x: T) => any): T[] {
  if (xs.length === 0) {
    return ys;
  } else if (ys.length === 0) {
    return xs;
  } else {
    const [x1, ...xs1] = xs;
    const [y1, ...ys1] = ys;

    if (fn(x1) < fn(y1)) {
      return [x1, ...mergeBy(xs1, ys, fn)];
    } else {
      return [y1, ...mergeBy(xs, ys1, fn)];
    }
  }
}
