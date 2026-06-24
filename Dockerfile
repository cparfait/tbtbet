# ─── Stage 1 : dépendances ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# --ignore-scripts : évite que postinstall (prisma generate) tourne ici
# sans le schéma prisma. Le generate se fait dans le stage builder.
RUN npm ci --ignore-scripts

# ─── Stage 2 : build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate (binaire Linux) + next build (standalone)
RUN npm run build

# ─── Stage 3 : runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Fichiers statiques
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma : schéma + binaire natif Linux
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/lib/generated ./lib/generated

# Dossier uploads : créé avec le bon owner pour que l'app puisse écrire
# (le volume Docker sera monté ici en prod pour persister les fichiers)
RUN mkdir -p /app/public/uploads/logos \
 && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

# ─── Stage 4 : migrator ──────────────────────────────────────────────────────
# Image autonome dédiée à `prisma db push`. Fait son propre `npm ci` complet
# pour garantir un node_modules cohérent (CLI Prisma + toutes ses deps
# transitives : effect, c12, etc.) — indépendant de tout cache cross-stage.
FROM node:22-alpine AS migrator
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

CMD ["node", "node_modules/prisma/build/index.js", "db", "push", "--skip-generate"]
