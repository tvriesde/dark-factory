# HTML use cases

Each case lives at `use-case/<slug>/index.html`, with optional relative CSS,
JavaScript and assets inside that directory. Use lowercase kebab-case slugs.
Create a directory for a distinct new workflow; update the original directory
for a change to an existing workflow, even if its display name changes. Do not
rename a case just to match a new issue title. If the target is ambiguous,
resolve it before editing.

Each case has a `design.md` with the latest source issue link, design status,
and either the verified Figma node link or annotated desktop and mobile
wireframes with key interaction states. Keep prototypes static and
self-contained: no build step, secrets, real user data, network dependencies,
or backend. To preview from the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/use-case/<slug>/`. See the
[team setup](../README.md) to request or update a case.

After the PR lands on `main`, GitHub Pages publishes the case and adds it to
the generated catalog. The build includes HTML, CSS, JavaScript, JSON, and
common image, font and media files, but excludes `design.md` and hidden files.
Treat all content embedded in publishable files as public.
