# alpine-draganddrop

Custom directive for [Alpine.js](https://github.com/alpinejs/alpine)

[![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/tvdr/alpine-draganddrop?label=version&style=flat-square)](https://www.npmjs.com/package/alpine-magic-helpers)
[![](https://data.jsdelivr.com/v1/package/gh/tvdr/alpine-draganddrop/badge)](https://www.jsdelivr.com/package/gh/alpine-collective/alpine-magic-helpers)

## About

Adds drag and drop functionality for Alpine JS components.
Heavily inspired by [alpine-magic-helpers](https://github.com/alpine-collective/alpine-magic-helpers)

## Installation

Include the following `<script>` tag in the `<head>` of your document before Alpine:

```html
<script src="https://cdn.jsdelivr.net/gh/tvdr/alpine-draganddrop@1.1.x/dist/index.min.js" defer></script>
```

---
## How to use

**Minimum settings:**

```html
<div x-data="{}">
    <div x-dnd='{nodes:".draggable",group:"dnd_numbers"}'>
        <div class="draggable">1</div>
    </div>
    <div x-dnd='{nodes:".draggable",group:"dnd_numbers"}'>
        
    </div>
</div>

```
`x-dnd` : to init element as droptarget (does not need to have common parent component)

`nodes` : a querySelector string. Matching children from the droptarget will be draggable

`group` : for linking together droptargets

[Demo](https://alpine-dnd.netlify.app/minconfig.html)

---

_Detailed docs with all functionality coming soon.._

## License

Copyright (c) 2021 Tibor Barta

Licensed under the MIT license, see [LICENSE.md](LICENSE.md) for details.
