"""End-to-end smoke test of 一页 design system.

Captures 8 screenshots (4 pages × 2 themes) for visual review.
"""
from playwright.sync_api import sync_playwright
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(os.path.dirname(__file__), '.artifacts', 'visual_smoke')
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ('login', os.path.join(REPO_ROOT, 'login.html')),
    ('index', os.path.join(REPO_ROOT, 'index.html')),
    ('create', os.path.join(REPO_ROOT, 'create.html')),
    ('editor', os.path.join(REPO_ROOT, 'editor.html')),
]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel='chrome')
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        # Pre-set auth so index/editor don't redirect
        page.add_init_script("""
            sessionStorage.setItem('moyun_auth_user', JSON.stringify({name:'yyy'}));
            localStorage.setItem('moyun_user_name', 'yyy');
        """)
        for name, path in PAGES:
            for theme in ['light', 'dark']:
                page.goto('file://' + path.replace(os.sep, '/'))
                page.wait_for_load_state('networkidle', timeout=5000)
                page.evaluate(f"localStorage.setItem('moyun_theme', '{theme}')")
                page.evaluate(f"document.documentElement.setAttribute('data-theme', '{theme}')")
                page.wait_for_timeout(400)
                page.screenshot(path=os.path.join(OUT, f'{name}_{theme}.png'), full_page=True)
                print(f'[shot] {name}_{theme}.png')
        browser.close()
    print('done')


if __name__ == '__main__':
    main()
