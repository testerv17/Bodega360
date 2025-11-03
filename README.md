# Bodega 360° — Ultra Static (HTML/CSS/JS + JSON + Assets locales + Poe link)
1) Coloca tus imágenes en `public/assets/products/` y tus mp4 en `public/assets/product_videos/`.
2) Edita `public/data/products.json` y `public/data/videos.json` con tus rutas.
3) En `public/data/config.json` cambia `poe_chat_url` al enlace de tu bot.
4) Despliegue estático (Firebase Hosting):
   - `npm i -g firebase-tools`
   - `firebase login`
   - `firebase init hosting` (elige tu proyecto, carpeta `public`)
   - `firebase deploy --only hosting`
