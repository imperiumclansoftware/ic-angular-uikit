// server.mjs (médias) — options sanitize-html AVEC MÉDIAS, pour un éditeur avec [mediaSource] ou [media].
// À ajouter dans server.mjs après SANITIZE_OPTIONS, puis nettoyer avec sanitizeWithMedia(html).

const dimension = (value) => (/^\d{1,5}$/.test(value ?? '') && Number(value) > 0 && Number(value) <= 10000 ? value : undefined);

const SANITIZE_MEDIA_OPTIONS = {
  ...SANITIZE_OPTIONS,
  allowedTags: [...SANITIZE_OPTIONS.allowedTags, 'figure', 'figcaption', 'img', 'video'],
  allowedAttributes: {
    ...SANITIZE_OPTIONS.allowedAttributes,
    img: ['src', 'alt', 'width', 'height'],
    video: ['src', 'poster', 'title', 'controls', 'preload'],
  },
  // Médias en http(s) ou relatifs : data:, javascript:… refusés (poster compris).
  allowedSchemesByTag: { img: ['http', 'https'], video: ['http', 'https'] },
  allowedSchemesAppliedToAttributes: ['href', 'src', 'poster', 'cite'],
  allowProtocolRelative: false,
  // Restreindre à vos domaines (pas de pixel de pistage) : allowedScriptHostnames ne s'applique pas aux images,
  // filtrez avec exclusiveFilter, par exemple : (frame) => frame.tag === 'img' && !frame.attribs.src?.startsWith('/')
  transformTags: {
    ...SANITIZE_OPTIONS.transformTags,
    img: (tagName, attribs) => {
      const width = dimension(attribs.width);
      const height = dimension(attribs.height);
      return { tagName, attribs: { src: attribs.src, alt: attribs.alt ?? '', ...(width && height ? { width, height } : {}) } };
    },
    video: (tagName, attribs) => ({ tagName, attribs: { src: attribs.src, ...(attribs.poster ? { poster: attribs.poster } : {}), ...(attribs.title ? { title: attribs.title } : {}), controls: '', preload: 'metadata' } }),
  },
  // Image ou vidéo sans adresse valide : retirée.
  exclusiveFilter: (frame) => (frame.tag === 'img' || frame.tag === 'video') && !frame.attribs.src,
};

const sanitizeWithMedia = (html) => sanitizeHtml(html, SANITIZE_MEDIA_OPTIONS);
