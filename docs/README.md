# Branchwright Documentation

This directory contains the GitHub Pages documentation site for Branchwright.

## Local Development

To view the documentation locally, you can use any static file server:

```bash
# Using Python
python -m http.server 8000 --directory docs

# Using Node.js http-server
npx http-server docs -p 8000

# Using PHP
php -S localhost:8000 -t docs
```

Then open http://localhost:8000 in your browser.

## Structure

```
docs/
├── index.html              # Homepage
├── getting-started.html    # Installation and quick start
├── configuration.html      # Configuration guide
├── api.html               # API reference
├── examples.html          # Usage examples
└── assets/
    └── style.css          # Stylesheet
```

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch via the `.github/workflows/pages.yml` workflow.

## Contributing

When adding new documentation:
1. Follow the existing HTML structure and styling
2. Update navigation links in all pages
3. Test locally before committing
4. Ensure all links work correctly
