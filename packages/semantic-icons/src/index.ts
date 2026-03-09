export const ICON_LIBRARY_COLLECTIONS = {
  lucide: "lucide",
  hugeicons: "hugeicons",
  tabler: "tabler",
  phosphor: "ph",
  remixicon: "ri",
} as const;

export const ICON_LIBRARY_PACKAGE_NAMES = {
  lucide: "@lucide/astro",
  hugeicons: "@iconify-json/hugeicons",
  tabler: "@iconify-json/tabler",
  phosphor: "@iconify-json/ph",
  remixicon: "@iconify-json/ri",
} as const;

export const SEMANTIC_ICON_NAMES = [
  "check",
  "chevron-down",
  "chevron-up",
  "menu",
  "copy",
  "shuffle",
  "sparkles",
  "bold",
  "italic",
  "underline",
  "bell",
  "ellipsis",
  "calendar",
  "globe",
  "credit-card",
  "x",
  "loader-circle",
] as const;

export const ICON_NAME_MAPPINGS = {
  "check": {
    lucide: "check",
    tabler: "check",
    hugeicons: "tick-02",
    phosphor: "check",
    remixicon: "check-line",
  },
  "chevron-down": {
    lucide: "chevron-down",
    tabler: "chevron-down",
    hugeicons: "arrow-down-01",
    phosphor: "caret-down",
    remixicon: "arrow-down-s-line",
  },
  "chevron-up": {
    lucide: "chevron-up",
    tabler: "chevron-up",
    hugeicons: "arrow-up-01",
    phosphor: "caret-up",
    remixicon: "arrow-up-s-line",
  },
  "menu": {
    lucide: "menu",
    tabler: "menu-2",
    hugeicons: "menu-02",
    phosphor: "list",
    remixicon: "menu-2-line",
  },
  "copy": {
    lucide: "copy",
    tabler: "copy",
    hugeicons: "copy-01",
    phosphor: "copy",
    remixicon: "file-copy-line",
  },
  "shuffle": {
    lucide: "shuffle",
    tabler: "arrows-shuffle",
    hugeicons: "shuffle",
    phosphor: "shuffle",
    remixicon: "shuffle-line",
  },
  "sparkles": {
    lucide: "sparkles",
    tabler: "sparkles",
    hugeicons: "sparkles",
    phosphor: "sparkle",
    remixicon: "sparkling-line",
  },
  "bold": {
    lucide: "bold",
    tabler: "bold",
    hugeicons: "text-bold",
    phosphor: "text-bolder",
    remixicon: "bold",
  },
  "italic": {
    lucide: "italic",
    tabler: "italic",
    hugeicons: "text-italic",
    phosphor: "text-italic",
    remixicon: "italic",
  },
  "underline": {
    lucide: "underline",
    tabler: "underline",
    hugeicons: "text-underline",
    phosphor: "text-underline",
    remixicon: "underline",
  },
  "bell": {
    lucide: "bell",
    tabler: "bell",
    hugeicons: "notification-03",
    phosphor: "bell",
    remixicon: "bell-line",
  },
  "ellipsis": {
    lucide: "ellipsis",
    tabler: "dots",
    hugeicons: "more-horizontal",
    phosphor: "dots-three",
    remixicon: "more-2-line",
  },
  "calendar": {
    lucide: "calendar",
    tabler: "calendar",
    hugeicons: "calendar-01",
    phosphor: "calendar",
    remixicon: "calendar-2-line",
  },
  "globe": {
    lucide: "globe",
    tabler: "globe",
    hugeicons: "globe",
    phosphor: "globe",
    remixicon: "globe-line",
  },
  "credit-card": {
    lucide: "credit-card",
    tabler: "credit-card",
    hugeicons: "credit-card",
    phosphor: "credit-card",
    remixicon: "bank-card-line",
  },
  "x": {
    lucide: "x",
    tabler: "x",
    hugeicons: "cancel-01",
    phosphor: "x",
    remixicon: "close-line",
  },
  "loader-circle": {
    lucide: "loader-circle",
    tabler: "loader-2",
    hugeicons: "loading-03",
    phosphor: "spinner",
    remixicon: "loader-2-line",
  },
} as const;

export const ICON_DATA = {
  lucide: {
    "check": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 6L9 17l-5-5\"/>", width: 24, height: 24 },
    "chevron-down": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\"/>", width: 24, height: 24 },
    "chevron-up": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m18 15l-6-6l-6 6\"/>", width: 24, height: 24 },
    "menu": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 5h16M4 12h16M4 19h16\"/>", width: 24, height: 24 },
    "copy": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/></g>", width: 24, height: 24 },
    "shuffle": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"m18 14l4 4l-4 4m0-20l4 4l-4 4\"/><path d=\"M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22M2 6h1.972a4 4 0 0 1 3.6 2.2M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45\"/></g>", width: 24, height: 24 },
    "sparkles": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594zM20 2v4m2-2h-4\"/><circle cx=\"4\" cy=\"20\" r=\"2\"/></g>", width: 24, height: 24 },
    "bold": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8\"/>", width: 24, height: 24 },
    "italic": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 4h-9m4 16H5M15 4L9 20\"/>", width: 24, height: 24 },
    "underline": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 4v6a6 6 0 0 0 12 0V4M4 20h16\"/>", width: 24, height: 24 },
    "bell": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M10.268 21a2 2 0 0 0 3.464 0m-10.47-5.674A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\"/>", width: 24, height: 24 },
    "ellipsis": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/><circle cx=\"5\" cy=\"12\" r=\"1\"/></g>", width: 24, height: 24 },
    "calendar": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M8 2v4m8-4v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/></g>", width: 24, height: 24 },
    "globe": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20M2 12h20\"/></g>", width: 24, height: 24 },
    "credit-card": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/><path d=\"M2 10h20\"/></g>", width: 24, height: 24 },
    "x": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 6L6 18M6 6l12 12\"/>", width: 24, height: 24 },
    "loader-circle": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 12a9 9 0 1 1-6.219-8.56\"/>", width: 24, height: 24 },
  },
  hugeicons: {
    "check": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m5 14l3.5 3.5L19 6.5\"/>", width: 24, height: 24 },
    "chevron-down": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M18 9s-4.419 6-6 6s-6-6-6-6\"/>", width: 24, height: 24 },
    "chevron-up": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M18 15s-4.42-6-6-6s-6 6-6 6\"/>", width: 24, height: 24 },
    "menu": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M4 5h12M4 12h16M4 19h8\"/>", width: 24, height: 24 },
    "copy": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"><path d=\"M9 15c0-2.828 0-4.243.879-5.121C10.757 9 12.172 9 15 9h1c2.828 0 4.243 0 5.121.879C22 10.757 22 12.172 22 15v1c0 2.828 0 4.243-.879 5.121C20.243 22 18.828 22 16 22h-1c-2.828 0-4.243 0-5.121-.879C9 20.243 9 18.828 9 16z\"/><path d=\"M17 9c-.003-2.957-.047-4.489-.908-5.538a4 4 0 0 0-.554-.554C14.43 2 12.788 2 9.5 2c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C2 4.57 2 6.212 2 9.5c0 3.287 0 4.931.908 6.038a4 4 0 0 0 .554.554c1.05.86 2.58.906 5.538.908\"/></g>", width: 24, height: 24 },
    "shuffle": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m19.558 4l.897.976c.401.436.602.654.531.839S20.632 6 20.065 6c-1.27 0-2.788-.205-3.954.473c-.72.42-1.223 1.152-2.072 2.527M3 18h1.58c1.929 0 2.893 0 3.706-.473c.721-.42 1.223-1.152 2.072-2.527m9.2 5l.897-.976c.401-.436.602-.654.531-.839S20.632 18 20.065 18c-1.27 0-2.788.205-3.954-.473c-.813-.474-1.348-1.346-2.418-3.09l-2.99-4.875C9.635 7.82 9.1 6.947 8.287 6.473S6.51 6 4.581 6H3\"/>", width: 24, height: 24 },
    "sparkles": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m15 2l.539 2.392a5.39 5.39 0 0 0 4.07 4.07L22 9l-2.392.539a5.39 5.39 0 0 0-4.07 4.07L15 16l-.539-2.392a5.39 5.39 0 0 0-4.07-4.07L8 9l2.392-.539a5.39 5.39 0 0 0 4.07-4.07zM7 12l.385 1.708a3.85 3.85 0 0 0 2.907 2.907L12 17l-1.708.385a3.85 3.85 0 0 0-2.907 2.907L7 22l-.385-1.708a3.85 3.85 0 0 0-2.907-2.907L2 17l1.708-.385a3.85 3.85 0 0 0 2.907-2.907z\"/>", width: 24, height: 24 },
    "bold": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"><path d=\"M5 6c0-1.414 0-2.121.44-2.56C5.878 3 6.585 3 8 3h4.579C15.02 3 17 5.015 17 7.5S15.02 12 12.579 12H5z\" clip-rule=\"evenodd\"/><path d=\"M12.429 12h1.238C16.06 12 18 14.015 18 16.5S16.06 21 13.667 21H8c-1.414 0-2.121 0-2.56-.44C5 20.122 5 19.415 5 18v-6\"/></g>", width: 24, height: 24 },
    "italic": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"1.5\" d=\"M12 4h7M8 20l8-16M5 20h7\"/>", width: 24, height: 24 },
    "underline": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"1.5\"><path stroke-linejoin=\"round\" d=\"M5.5 3v8.5a6.5 6.5 0 1 0 13 0V3\"/><path d=\"M3 21h18\"/></g>", width: 24, height: 24 },
    "bell": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"><path d=\"M20 18.501L18.349 7.934a6.426 6.426 0 0 0-12.698 0L4 18.501\"/><path d=\"M20 18.5c0-1.657-3.582-3-8-3s-8 1.343-8 3s3.582 3 8 3s8-1.343 8-3m-7 0h-2\"/></g>", width: 24, height: 24 },
    "ellipsis": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M12.005 11.5a1 1 0 1 1 0 2a1 1 0 0 1 0-2m6 0a1 1 0 1 1 0 2a1 1 0 0 1 0-2m-12.001 0a1 1 0 1 1 0 2a1 1 0 0 1 0-2\"/>", width: 24, height: 24 },
    "calendar": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"><path d=\"M16 2v4M8 2v4m5-2h-2C7.229 4 5.343 4 4.172 5.172S3 8.229 3 12v2c0 3.771 0 5.657 1.172 6.828S7.229 22 11 22h2c3.771 0 5.657 0 6.828-1.172S21 17.771 21 14v-2c0-3.771 0-5.657-1.172-6.828S16.771 4 13 4M3 10h18\"/><path d=\"M10 18.5v-4.653c0-.191-.137-.347-.305-.347H9m5 4.998l1.486-4.606a.3.3 0 0 0-.286-.392H13\"/></g>", width: 24, height: 24 },
    "globe": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12.5 19v3m-2 0h4\"/><circle cx=\"7\" cy=\"7\" r=\"7\" stroke-linecap=\"round\" transform=\"matrix(-1 0 0 1 20.5 2)\"/><path stroke-linejoin=\"round\" d=\"M8.5 4c.654.038.992.359 1.573.973c1.05 1.11 2.1 1.202 2.8.832c1.049-.555.167-1.453 1.399-1.94c.803-.32.915-1.185.468-1.865M20 10c-1.5 0-1.766 1.247-3 1c-2.5-.5-3.208.059-3.208 1.251s0 1.192-.52 2.086c-.338.582-.457 1.163.217 1.663\"/><path stroke-linecap=\"round\" d=\"M6.5 2a9.85 9.85 0 0 0-3 7.083C3.5 14.56 7.977 19 13.5 19a10 10 0 0 0 7-2.835\"/></g>", width: 24, height: 24 },
    "credit-card": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\"1.5\"><path stroke-linecap=\"round\" d=\"M2 12c0-3.537 0-5.306 1.053-6.487q.253-.284.554-.522C4.862 4 6.741 4 10.5 4h3c3.759 0 5.638 0 6.892.99q.302.24.555.523C22 6.693 22 8.463 22 12s0 5.306-1.053 6.487a4.4 4.4 0 0 1-.555.522C19.138 20 17.26 20 13.5 20h-3c-3.759 0-5.638 0-6.893-.99a4.4 4.4 0 0 1-.554-.523C2 17.307 2 15.537 2 12\"/><path stroke-linecap=\"round\" stroke-miterlimit=\"10\" d=\"M10 16h1.5m3 0H18\"/><path d=\"M2 9h20\"/></g>", width: 24, height: 24 },
    "x": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M18 6L6 18m12 0L6 6\"/>", width: 24, height: 24 },
    "loader-circle": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"1.5\" d=\"M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.363l-2.122 2.121m-8.484 8.484l-2.121 2.121m12.727.001l-2.122-2.122M7.758 7.758L5.637 5.637\"/>", width: 24, height: 24 },
  },
  tabler: {
    "check": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m5 12l5 5L20 7\"/>", width: 24, height: 24 },
    "chevron-down": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\"/>", width: 24, height: 24 },
    "chevron-up": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 15l6-6l6 6\"/>", width: 24, height: 24 },
    "menu": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 6h16M4 12h16M4 18h16\"/>", width: 24, height: 24 },
    "copy": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z\"/><path d=\"M4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1\"/></g>", width: 24, height: 24 },
    "shuffle": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"m18 4l3 3l-3 3m0 10l3-3l-3-3\"/><path d=\"M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5m0-10h-5a4.98 4.98 0 0 0-3 1m-4 8a5 5 0 0 1-3 1H3\"/></g>", width: 24, height: 24 },
    "sparkles": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6\"/>", width: 24, height: 24 },
    "bold": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M7 5h6a3.5 3.5 0 0 1 0 7H7zm6 7h1a3.5 3.5 0 0 1 0 7H7v-7\"/>", width: 24, height: 24 },
    "italic": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M11 5h6M7 19h6m1-14l-4 14\"/>", width: 24, height: 24 },
    "underline": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M7 5v5a5 5 0 0 0 10 0V5M5 19h14\"/>", width: 24, height: 24 },
    "bell": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1\"/>", width: 24, height: 24 },
    "ellipsis": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0\"/>", width: 24, height: 24 },
    "calendar": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm12-4v4M8 3v4m-4 4h16m-9 4h1m0 0v3\"/>", width: 24, height: 24 },
    "globe": { body: "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9a4 4 0 1 0 8 0a4 4 0 0 0-8 0\"/><path d=\"M5.75 15A8.015 8.015 0 1 0 15 2m-4 15v4m-4 0h8\"/></g>", width: 24, height: 24 },
    "credit-card": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm0 2h18M7 15h.01M11 15h2\"/>", width: 24, height: 24 },
    "x": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 6L6 18M6 6l12 12\"/>", width: 24, height: 24 },
    "loader-circle": { body: "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 3a9 9 0 1 0 9 9\"/>", width: 24, height: 24 },
  },
  phosphor: {
    "check": { body: "<path fill=\"currentColor\" d=\"m229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69L218.34 66.34a8 8 0 0 1 11.32 11.32\"/>", width: 256, height: 256 },
    "chevron-down": { body: "<path fill=\"currentColor\" d=\"m213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32\"/>", width: 256, height: 256 },
    "chevron-up": { body: "<path fill=\"currentColor\" d=\"M213.66 165.66a8 8 0 0 1-11.32 0L128 91.31l-74.34 74.35a8 8 0 0 1-11.32-11.32l80-80a8 8 0 0 1 11.32 0l80 80a8 8 0 0 1 0 11.32\"/>", width: 256, height: 256 },
    "menu": { body: "<path fill=\"currentColor\" d=\"M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8M40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16m176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16\"/>", width: 256, height: 256 },
    "copy": { body: "<path fill=\"currentColor\" d=\"M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z\"/>", width: 256, height: 256 },
    "shuffle": { body: "<path fill=\"currentColor\" d=\"M237.66 178.34a8 8 0 0 1 0 11.32l-24 24a8 8 0 0 1-11.32-11.32L212.69 192h-11.75a72.12 72.12 0 0 1-58.59-30.15l-41.72-58.4A56.1 56.1 0 0 0 55.06 80H32a8 8 0 0 1 0-16h23.06a72.12 72.12 0 0 1 58.59 30.15l41.72 58.4A56.1 56.1 0 0 0 200.94 176h11.75l-10.35-10.34a8 8 0 0 1 11.32-11.32ZM143 107a8 8 0 0 0 11.16-1.86l1.2-1.67A56.1 56.1 0 0 1 200.94 80h11.75l-10.35 10.34a8 8 0 0 0 11.32 11.32l24-24a8 8 0 0 0 0-11.32l-24-24a8 8 0 0 0-11.32 11.32L212.69 64h-11.75a72.12 72.12 0 0 0-58.59 30.15l-1.2 1.67A8 8 0 0 0 143 107m-30 42a8 8 0 0 0-11.16 1.86l-1.2 1.67A56.1 56.1 0 0 1 55.06 176H32a8 8 0 0 0 0 16h23.06a72.12 72.12 0 0 0 58.59-30.15l1.2-1.67A8 8 0 0 0 113 149\"/>", width: 256, height: 256 },
    "sparkles": { body: "<path fill=\"currentColor\" d=\"M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8\"/>", width: 256, height: 256 },
    "bold": { body: "<path fill=\"currentColor\" d=\"M170.5 115.7A44 44 0 0 0 140 40H64a7.9 7.9 0 0 0-8 8v152a8 8 0 0 0 8 8h88a48 48 0 0 0 18.5-92.3ZM72 56h68a28 28 0 0 1 0 56H72Zm80 136H72v-64h80a32 32 0 0 1 0 64Z\"/>", width: 256, height: 256 },
    "italic": { body: "<path fill=\"currentColor\" d=\"M200 56a8 8 0 0 1-8 8h-34.23L115.1 192H144a8 8 0 0 1 0 16H64a8 8 0 0 1 0-16h34.23L140.9 64H112a8 8 0 0 1 0-16h80a8 8 0 0 1 8 8\"/>", width: 256, height: 256 },
    "underline": { body: "<path fill=\"currentColor\" d=\"M200 224a8 8 0 0 1-8 8H64a8 8 0 0 1 0-16h128a8 8 0 0 1 8 8m-72-24a64.07 64.07 0 0 0 64-64V56a8 8 0 0 0-16 0v80a48 48 0 0 1-96 0V56a8 8 0 0 0-16 0v80a64.07 64.07 0 0 0 64 64\"/>", width: 256, height: 256 },
    "bell": { body: "<path fill=\"currentColor\" d=\"M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z\"/>", width: 256, height: 256 },
    "ellipsis": { body: "<path fill=\"currentColor\" d=\"M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-136 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12\"/>", width: 256, height: 256 },
    "calendar": { body: "<path fill=\"currentColor\" d=\"M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160zm-96-88v64a8 8 0 0 1-16 0v-51.06l-4.42 2.22a8 8 0 0 1-7.16-14.32l16-8A8 8 0 0 1 112 120m59.16 30.45L152 176h16a8 8 0 0 1 0 16h-32a8 8 0 0 1-6.4-12.8l28.78-38.37a8 8 0 1 0-13.31-8.83a8 8 0 1 1-13.85-8A24 24 0 0 1 176 136a23.76 23.76 0 0 1-4.84 14.45\"/>", width: 256, height: 256 },
    "globe": { body: "<path fill=\"currentColor\" d=\"M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6\"/>", width: 256, height: 256 },
    "credit-card": { body: "<path fill=\"currentColor\" d=\"M224 48H32a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m0 16v24H32V64Zm0 128H32v-88h192zm-16-24a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8m-64 0a8 8 0 0 1-8 8h-16a8 8 0 0 1 0-16h16a8 8 0 0 1 8 8\"/>", width: 256, height: 256 },
    "x": { body: "<path fill=\"currentColor\" d=\"M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z\"/>", width: 256, height: 256 },
    "loader-circle": { body: "<path fill=\"currentColor\" d=\"M136 32v32a8 8 0 0 1-16 0V32a8 8 0 0 1 16 0m37.25 58.75a8 8 0 0 0 5.66-2.35l22.63-22.62a8 8 0 0 0-11.32-11.32L167.6 77.09a8 8 0 0 0 5.65 13.66M224 120h-32a8 8 0 0 0 0 16h32a8 8 0 0 0 0-16m-45.09 47.6a8 8 0 0 0-11.31 11.31l22.62 22.63a8 8 0 0 0 11.32-11.32ZM128 184a8 8 0 0 0-8 8v32a8 8 0 0 0 16 0v-32a8 8 0 0 0-8-8m-50.91-16.4l-22.63 22.62a8 8 0 0 0 11.32 11.32l22.62-22.63a8 8 0 0 0-11.31-11.31M72 128a8 8 0 0 0-8-8H32a8 8 0 0 0 0 16h32a8 8 0 0 0 8-8m-6.22-73.54a8 8 0 0 0-11.32 11.32L77.09 88.4A8 8 0 0 0 88.4 77.09Z\"/>", width: 256, height: 256 },
  },
  remixicon: {
    "check": { body: "<path fill=\"currentColor\" d=\"m10 15.17l9.192-9.191l1.414 1.414L10 17.999l-6.364-6.364l1.414-1.414z\"/>", width: 24, height: 24 },
    "chevron-down": { body: "<path fill=\"currentColor\" d=\"m12 13.171l4.95-4.95l1.414 1.415L12 16L5.636 9.636L7.05 8.222z\"/>", width: 24, height: 24 },
    "chevron-up": { body: "<path fill=\"currentColor\" d=\"m12 10.828l-4.95 4.95l-1.414-1.414L12 8l6.364 6.364l-1.414 1.414z\"/>", width: 24, height: 24 },
    "menu": { body: "<path fill=\"currentColor\" d=\"M3 4h18v2H3zm0 7h12v2H3zm0 7h18v2H3z\"/>", width: 24, height: 24 },
    "copy": { body: "<path fill=\"currentColor\" d=\"M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1 1 0 0 1 3 21l.003-14c0-.552.45-1 1.006-1zM5.002 8L5 20h10V8zM9 6h8v10h2V4H9z\"/>", width: 24, height: 24 },
    "shuffle": { body: "<path fill=\"currentColor\" d=\"M18 17.883V16l5 3l-5 3v-2.09a9 9 0 0 1-6.997-5.365L11 14.54l-.003.006A9 9 0 0 1 2.725 20H2v-2h.725a7 7 0 0 0 6.434-4.243L9.912 12l-.753-1.757A7 7 0 0 0 2.725 6H2V4h.725a9 9 0 0 1 8.272 5.455L11 9.46l.003-.006A9 9 0 0 1 18 4.09V2l5 3l-5 3V6.117a7 7 0 0 0-5.159 4.126L12.088 12l.753 1.757A7 7 0 0 0 18 17.883\"/>", width: 24, height: 24 },
    "sparkles": { body: "<path fill=\"currentColor\" d=\"M14 4.438A2.437 2.437 0 0 0 16.438 2h1.125A2.437 2.437 0 0 0 20 4.438v1.125A2.437 2.437 0 0 0 17.563 8h-1.125A2.437 2.437 0 0 0 14 5.563zM1 11a6 6 0 0 0 6-6h2a6 6 0 0 0 6 6v2a6 6 0 0 0-6 6H7a6 6 0 0 0-6-6zm3.876 1A8.04 8.04 0 0 1 8 15.124A8.04 8.04 0 0 1 11.124 12A8.04 8.04 0 0 1 8 8.876A8.04 8.04 0 0 1 4.876 12m12.374 2A3.25 3.25 0 0 1 14 17.25v1.5A3.25 3.25 0 0 1 17.25 22h1.5A3.25 3.25 0 0 1 22 18.75v-1.5A3.25 3.25 0 0 1 18.75 14z\"/>", width: 24, height: 24 },
    "bold": { body: "<path fill=\"currentColor\" d=\"M8 11h4.5a2.5 2.5 0 0 0 0-5H8zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.5 4.5 0 0 1 18 15.5M8 13v5h5.5a2.5 2.5 0 0 0 0-5z\"/>", width: 24, height: 24 },
    "italic": { body: "<path fill=\"currentColor\" d=\"M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z\"/>", width: 24, height: 24 },
    "underline": { body: "<path fill=\"currentColor\" d=\"M8 3v9a4 4 0 0 0 8 0V3h2v9a6 6 0 0 1-12 0V3zM4 20h16v2H4z\"/>", width: 24, height: 24 },
    "bell": { body: "<path fill=\"currentColor\" d=\"M14.121 9.879c4.296 4.295 6.829 8.728 5.657 9.9c-.475.474-1.486.34-2.807-.273a9.01 9.01 0 0 1-10.59-.474l-.038.039l-1.414-1.414l.038-.04A9.01 9.01 0 0 1 4.495 7.03c-.614-1.322-.748-2.333-.273-2.808c1.128-1.128 5.277 1.177 9.417 5.182zm-1.414 1.414C10.823 9.409 8.87 7.842 7.236 6.87l-.186.18a7 7 0 0 0-.657 9.142l1.846-1.846a2 2 0 0 1 3.347-1.932a2 2 0 0 1-1.931 3.347l-1.848 1.846a7 7 0 0 0 9.143-.657l.179-.188l-.053-.089c-.976-1.615-2.52-3.53-4.369-5.38m7.071-7.071a2 2 0 0 1-.165 2.976a9.02 9.02 0 0 1 .663 8.345a21 21 0 0 0-1.386-2.306a6.99 6.99 0 0 0-1.94-6.187a6.99 6.99 0 0 0-6.187-1.94a21 21 0 0 0-2.306-1.386a9.02 9.02 0 0 1 8.347.663q.066-.086.146-.165a2 2 0 0 1 2.828 0\"/>", width: 24, height: 24 },
    "ellipsis": { body: "<path fill=\"currentColor\" d=\"M12 3c-.825 0-1.5.675-1.5 1.5S11.175 6 12 6s1.5-.675 1.5-1.5S12.825 3 12 3m0 15c-.825 0-1.5.675-1.5 1.5S11.175 21 12 21s1.5-.675 1.5-1.5S12.825 18 12 18m0-7.5c-.825 0-1.5.675-1.5 1.5s.675 1.5 1.5 1.5s1.5-.675 1.5-1.5s-.675-1.5-1.5-1.5\"/>", width: 24, height: 24 },
    "calendar": { body: "<path fill=\"currentColor\" d=\"M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1zm11 10H4v8h16zM8 13v2H6v-2zm5 0v2h-2v-2zm5 0v2h-2v-2zM7 5H4v4h16V5h-3v2h-2V5H9v2H7z\"/>", width: 24, height: 24 },
    "globe": { body: "<path fill=\"currentColor\" d=\"M13 21h5v2H6v-2h5v-1.05a10 10 0 0 1-7.684-4.988l1.737-.992A8 8 0 1 0 15.97 3.053l.993-1.737A10 10 0 0 1 22 10c0 5.185-3.946 9.449-9 9.95zm-1-4a7 7 0 1 1 0-14a7 7 0 0 1 0 14m0-2a5 5 0 1 0 0-10a5 5 0 0 0 0 10\"/>", width: 24, height: 24 },
    "credit-card": { body: "<path fill=\"currentColor\" d=\"M3.005 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m17 8h-16v8h16zm0-2V5h-16v4zm-6 6h4v2h-4z\"/>", width: 24, height: 24 },
    "x": { body: "<path fill=\"currentColor\" d=\"m12 10.587l4.95-4.95l1.414 1.414l-4.95 4.95l4.95 4.95l-1.415 1.414l-4.95-4.95l-4.949 4.95l-1.414-1.415l4.95-4.95l-4.95-4.95L7.05 5.638z\"/>", width: 24, height: 24 },
    "loader-circle": { body: "<path fill=\"currentColor\" d=\"M12 2a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1m0 15a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1m10-5a1 1 0 0 1-1 1h-3a1 1 0 1 1 0-2h3a1 1 0 0 1 1 1M7 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h3a1 1 0 0 1 1 1m12.071 7.071a1 1 0 0 1-1.414 0l-2.121-2.121a1 1 0 0 1 1.414-1.414l2.121 2.12a1 1 0 0 1 0 1.415M8.464 8.464a1 1 0 0 1-1.414 0l-2.12-2.12a1 1 0 0 1 1.414-1.415l2.12 2.121a1 1 0 0 1 0 1.414M4.93 19.071a1 1 0 0 1 0-1.414l2.121-2.121a1 1 0 0 1 1.414 1.414l-2.12 2.121a1 1 0 0 1-1.415 0M15.536 8.464a1 1 0 0 1 0-1.414l2.12-2.121a1 1 0 1 1 1.415 1.414L16.95 8.464a1 1 0 0 1-1.414 0\"/>", width: 24, height: 24 },
  },
} as const;

export type IconLibraryName = keyof typeof ICON_LIBRARY_COLLECTIONS;
export type SemanticIconName = (typeof SEMANTIC_ICON_NAMES)[number];

type IconRecord = {
  body: string;
  width: number;
  height: number;
};

export const LUCIDE_EXPORT_TO_SEMANTIC_ICON = {
  Check: "check",
  CheckIcon: "check",
  ChevronDown: "chevron-down",
  ChevronDownIcon: "chevron-down",
  ChevronUp: "chevron-up",
  ChevronUpIcon: "chevron-up",
  Copy: "copy",
  CopyIcon: "copy",
  CreditCard: "credit-card",
  CreditCardIcon: "credit-card",
  Ellipsis: "ellipsis",
  EllipsisIcon: "ellipsis",
  Globe: "globe",
  GlobeIcon: "globe",
  Bell: "bell",
  BellIcon: "bell",
  Bold: "bold",
  BoldIcon: "bold",
  Italic: "italic",
  ItalicIcon: "italic",
  Underline: "underline",
  UnderlineIcon: "underline",
  Sparkles: "sparkles",
  SparklesIcon: "sparkles",
  Calendar: "calendar",
  CalendarIcon: "calendar",
  Menu: "menu",
  MenuIcon: "menu",
  Shuffle: "shuffle",
  ShuffleIcon: "shuffle",
  X: "x",
  XIcon: "x",
  LoaderCircle: "loader-circle",
  Loader2: "loader-circle",
  Loader2Icon: "loader-circle",
  LoaderIcon: "loader-circle",
} as const satisfies Record<string, SemanticIconName>;

export const LUCIDE_PATH_TO_SEMANTIC_ICON = {
  check: "check",
  "chevron-down": "chevron-down",
  "chevron-up": "chevron-up",
  copy: "copy",
  "credit-card": "credit-card",
  ellipsis: "ellipsis",
  globe: "globe",
  bell: "bell",
  bold: "bold",
  italic: "italic",
  underline: "underline",
  sparkles: "sparkles",
  calendar: "calendar",
  menu: "menu",
  shuffle: "shuffle",
  x: "x",
  "loader-circle": "loader-circle",
} as const satisfies Record<string, SemanticIconName>;

function escapeHtmlAttribute(value: string) {
  return value
    .split("&")
    .join("&amp;")
    .split('"')
    .join("&quot;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;");
}

function buildAttributeString(attributes?: Record<string, string | number | boolean | null | undefined>) {
  if (!attributes) {
    return "";
  }

  return Object.entries(attributes)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([key, value]) => {
      if (value === true) {
        return ` ${key}`;
      }

      return ` ${key}="${escapeHtmlAttribute(String(value))}"`;
    })
    .join("");
}

export function getSemanticIconNameFromLucidePath(path: string) {
  return LUCIDE_PATH_TO_SEMANTIC_ICON[path as keyof typeof LUCIDE_PATH_TO_SEMANTIC_ICON];
}

export function getSemanticIconNameFromLucideExport(name: string) {
  return LUCIDE_EXPORT_TO_SEMANTIC_ICON[name as keyof typeof LUCIDE_EXPORT_TO_SEMANTIC_ICON];
}

export function getIconData(
  library: IconLibraryName,
  name: SemanticIconName,
): IconRecord {
  return ICON_DATA[library][name];
}

export function renderSemanticIconSvg(
  library: IconLibraryName,
  name: SemanticIconName,
  attributes?: Record<string, string | number | boolean | null | undefined>,
) {
  const icon = getIconData(library, name);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width} ${icon.height}"${buildAttributeString(
    attributes,
  )}>${icon.body}</svg>`;
}

export function renderSemanticIconSvgWithAttributeString(
  library: IconLibraryName,
  name: SemanticIconName,
  attributeString = "",
) {
  const icon = getIconData(library, name);
  const normalizedAttributes = attributeString.trim();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width} ${icon.height}"${
    normalizedAttributes ? ` ${normalizedAttributes}` : ""
  }>${icon.body}</svg>`;
}
