# syntax=docker/dockerfile:1
# Site de documentation d'IC Angular UiKit : image statique (nginx non root, port 8080, CSP stricte).
#   docker build -t ic-angular-uikit-docs .
#   docker run -d -p 8080:8080 ic-angular-uikit-docs
# Derrière un reverse proxy qui sert le site sous un sous-chemin (et le retire avant de transmettre) :
#   docker build --build-arg BASE_HREF=/docs/ -t ic-angular-uikit-docs .

# ---------- Construction du site ----------
FROM node:24-alpine AS build
WORKDIR /src
# Dépendances d'abord (couche en cache tant que le lockfile ne change pas).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG BASE_HREF=/
RUN node tools/generate-docs.mjs \
 && npx ng build docs --configuration production --base-href "${BASE_HREF}"

# ---------- Service ----------
FROM nginxinc/nginx-unprivileged:1-alpine
ARG VERSION=dev
LABEL org.opencontainers.image.title="IC Angular UiKit — documentation" \
      org.opencontainers.image.description="Site de documentation de la librairie Angular ic-angular-uikit : exemples interactifs, API, guides." \
      org.opencontainers.image.source="https://github.com/imperiumclansoftware/ic-angular-uikit" \
      org.opencontainers.image.url="https://angular.uikit.imperiumclan.fr/" \
      org.opencontainers.image.documentation="https://angular.uikit.imperiumclan.fr/" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/dist/docs/browser /usr/share/nginx/html

# Utilisateur nginx (uid 101) hérité de l'image de base : aucun processus root.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
