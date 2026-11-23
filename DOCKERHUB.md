# IC Angular UiKit — documentation

Site de documentation de [**ic-angular-uikit**](https://www.npmjs.com/package/ic-angular-uikit), bibliothèque de
composants **Angular 22** accessibles (WCAG 2.1 AA) et thémables : exemples interactifs, API de chaque composant
(inputs, outputs, slots, variables CSS), guides thèmes, validation et accessibilité, exemples côté serveur. Interface
en français.

Site officiel : https://angular.uikit.imperiumclan.fr/ — code source : https://github.com/imperiumclansoftware/ic-angular-uikit

## Démarrage rapide

```bash
docker run -d --name ic-angular-uikit-docs -p 8080:8080 iemperor/ic-angular-uikit-docs:latest
```

Puis ouvrez http://localhost:8080.

## Docker Compose

```yaml
services:
  docs:
    image: iemperor/ic-angular-uikit-docs:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

## Caractéristiques

- **Statique** : nginx (image `nginx-unprivileged`), aucun processus root (uid 101), port **8080**, compatible
  `read_only` (seul `/tmp` doit être inscriptible).
- **Sécurité** : CSP stricte avec Trusted Types (`script-src 'self'`, aucun script inline), HSTS, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, COOP / CORP.
- **Cache** : fichiers avec empreinte (`main-XXXXXXXX.js`…) en cache un an, `index.html` jamais mis en cache ;
  compression gzip.
- **Santé** : `GET /healthz` répond `ok` (utilisé par le `HEALTHCHECK` de l'image).
- **Plateformes** : `linux/amd64` et `linux/arm64`.

## Derrière un reverse proxy

Terminez TLS au proxy (l'en-tête HSTS suppose HTTPS) et transmettez vers le port 8080. Pour servir le site sous un
sous-chemin (`https://exemple.fr/docs/`), reconstruisez l'image avec ce chemin ; le proxy doit retirer le préfixe
avant de transmettre :

```bash
docker build --build-arg BASE_HREF=/docs/ -t ic-angular-uikit-docs https://github.com/imperiumclansoftware/ic-angular-uikit.git
```

## Étiquettes

| Étiquette | Contenu |
| --- | --- |
| `latest` | Dernière version publiée |
| `0.1`, `0.1.0`… | Documentation de la version correspondante de la librairie |

Licence : MIT.
