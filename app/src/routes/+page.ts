// The homepage is prerendered so its HTML arrives with the content in it; the
// interactive demos mount on top in the browser. The rest of the site stays
// client-rendered (see +layout.ts).
export const ssr = true;
export const csr = true;
export const prerender = true;
