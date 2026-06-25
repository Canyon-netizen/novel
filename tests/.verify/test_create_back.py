"""Quick: check create.html header now has '我的项目' link"""
import sys, io
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace') if False else sys.stdout  # noop
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = Path(r"E:/study/novel/tests/.verify")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    ctx.add_init_script("""
        sessionStorage.setItem('moyun_auth_user', JSON.stringify({name: 'verify-bot'}));
    """)
    page = ctx.new_page()
    page.goto("http://127.0.0.1:8765/create.html", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.clear()")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "create_01_header.png"))
    info = page.evaluate("""
        () => {
            const el = document.querySelector('.header-back-btn');
            return el ? {text: el.innerText.trim(), href: el.href, visible: el.offsetWidth > 0} : {found: false};
        }
    """)
    print(f"header-back-btn: {info}")
    # 点击
    page.locator(".header-back-btn").click()
    page.wait_for_timeout(500)
    print(f"after click URL: {page.url}")
    browser.close()