# UBGForever

## Publish the site on GitHub Pages

Build the Scramjet demo for this repository's Pages URL and copy the generated
static site into `docs/`:

```sh
PAGES_BASE=/ubgforever/ \
VITE_WISP_URL=wss://ubgforever.onrender.com/wisp/ \
pnpm --dir scramjet --filter @mercuryworkshop/scramjet-demo build
mkdir -p docs
cp -a scramjet/packages/demo/dist/. docs/
touch docs/.nojekyll
```

Commit and push the generated `docs/` files to `main`, then in the repository's
GitHub settings open **Pages** and select **Deploy from a branch**, branch
`main`, folder `/docs`. The published site will be available at
`https://akilesh-him.github.io/ubgforever/`.

Rebuild and copy `docs/` again whenever the Scramjet demo or original hub assets
change. `VITE_WISP_URL` is public site configuration, not a secret.