"""End-to-end smoke test of 一页 design system.

Captures 8 screenshots (4 pages × 2 themes) for visual review.
"""
from playwright.sync_api import sync_playwright
import os

OUT = 'e:/tmp/visual_smoke'
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ('login', 'e:/study/novel/login.html'),
    ('index', 'e:/study/novel/index.html'),
    ('create', 'e:/study/novel/create.html'),
    ('editor', 'e:/study/novel/editor.html'),
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
                page.goto(f'file:///{path}')
                page.wait_for_load_state('networkidle', timeout=5000)
                page.evaluate(f"localStorage.setItem('moyun_theme', '{theme}')")
                page.evaluate(f"document.documentElement.setAttribute('data-theme', '{theme}')")
                page.wait_for_timeout(400)
                page.screenshot(path=f'{OUT}/{name}_{theme}.png', full_page=True)
                print(f'[shot] {name}_{theme}.png')
        browser.close()
    print('done')


if __name__ == '__main__':
    main()
