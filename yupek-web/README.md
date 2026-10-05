# YUPEK web (Next.js 14 + TypeScript + Tailwind)

    npm install
    npm run dev        # http://localhost:3000

## Images
Drop files into `public/images` (hero.jpg, collection.jpg, heritage.jpg, about*.jpg, look-1..5.jpg, look-1b..5b.jpg, journal-1..5.jpg, og.jpg)
and `public/products` (then list them in `data/products.ts` > images). Missing files show a clean placeholder.

## Config
- Announcement text, nav, social links, countries: `config/site.ts`
- Products: `data/products.ts` (swap `lib/catalog.ts` for fetch calls to the YUPEK API when ready)
