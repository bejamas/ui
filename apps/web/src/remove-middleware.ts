import { defineMiddleware } from "astro:middleware";

// `context` and `next` are automatically typed
export const onRequest = defineMiddleware((context, next) => {
  // console.log('onRequest', context);
  const cookies = context.cookies;
  console.log('cookies', cookies);
  const theme = cookies.get('theme');
  console.log('theme middleware', theme);

  context.locals.theme = theme;
  return next();
});