# Historical chat-adapter wireframes

The current review viewer and its 67 SVGs remain in [`wireframes-v8/`](./wireframes-v8/). The 455 generated v1-v7 SVGs were removed from the working tree for release review size; their exact contents remain available in the [pre-prune archive commit](https://github.com/paperclipai/paperclip/tree/1c4a45f0ef7d627aa98e4f3ae3116d4507386d1a/doc/plans/chat-adapters).

The retained generators are an ordered chain, not standalone snapshot builders; in particular, the v8 generator reads v7 outputs. In a scratch checkout, run `node generate-wireframes.mjs` for v1 independently; then run `node generate-wireframes-v2.mjs`, `node generate-provider-wireframes.mjs`, and `node generate-wireframes-v3.mjs` through `node generate-wireframes-v8.mjs` in numeric order. These scripts also overwrite viewer/specification files such as `index.html`, so do not run them in a working tree with documentation changes you intend to keep.
