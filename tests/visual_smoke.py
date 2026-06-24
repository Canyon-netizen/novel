"""End-to-end smoke test of 一页 design system.

Captures 8 screenshots (4 pages × 2 themes) for visual review.
"""
from playwright.sync_api import sync_playwright
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / '.artifacts' / 'visual_smoke'
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [
    ('login', REPO_ROOT / 'login.html'),
    ('index', REPO_ROOT / 'index.html'),
    ('create', REPO_ROOT / 'create.html'),
    ('editor', REPO_ROOT / 'editor.html'),
]


def main():
    with sync_playwright() as p:
        # channel= omitted on purpose: CI runner only installs Playwright's
        # bundled chromium (see .github/workflows/test.yml), not Chrome stable.
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        # Pre-set auth so index/editor don't redirect
        page.add_init_script("""
            sessionStorage.setItem('moyun_auth_user', JSON.stringify({name:'yyy'}));
            localStorage.setItem('moyun_user_name', 'yyy');
        """)
        for name, path in PAGES:
            for theme in ['light', 'dark']:
                page.goto(path.as_uri())
                # 'load' not 'networkidle': file:// pages load instantly but
                # <link href="fonts.googleapis.com"> triggers cross-network fetches
                # that time out in CI sandbox — 'load' waits for DOM + local assets only.
                page.wait_for_load_state('load', timeout=10000)
                page.evaluate(f"localStorage.setItem('moyun_theme', '{theme}')")
                page.evaluate(f"document.documentElement.setAttribute('data-theme', '{theme}')")
                page.wait_for_timeout(400)
                page.screenshot(path=str(OUT / f'{name}_{theme}.png'), full_page=True)
                print(f'[shot] {name}_{theme}.png')
        browser.close()
    print('done')


if __name__ == '__main__':
    main()
