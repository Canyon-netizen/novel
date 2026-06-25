"""Test project badge on index.html"""
import sys, io
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = Path(r"E:/study/novel/tests/.verify")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    ctx.add_init_script("""
        sessionStorage.setItem('moyun_auth_user', JSON.stringify({name: 'verify-bot'}));
    """)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))

    # 1. 空状态: 徽章 hidden
    page.goto("http://127.0.0.1:8765/index.html", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.clear()")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "badge_01_empty.png"))
    hidden = page.locator("#projectBadge").is_hidden()
    print(f"空状态 hidden: {hidden}")
    assert hidden

    # 2. 加 2 个项目
    page.evaluate("""
        () => {
            localStorage.setItem('moyun_projects', JSON.stringify([
                {title: '项目甲', chapters: [{title: '第1章'}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
                {title: '项目乙', chapters: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}
            ]));
        }
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "badge_02_with_2.png"))
    visible = page.locator("#projectBadge").is_visible()
    count = page.locator("#projectBadgeCount").inner_text()
    print(f"2 个项目 - visible: {visible}, count: {count}")
    assert visible and count == "2"

    # 3. 点击徽章 -> 滚到 #projectSection
    page.locator("#projectBadge").click()
    page.wait_for_timeout(500)
    # 检查 #projectSection 位置
    pos = page.evaluate("() => document.getElementById('projectSection').getBoundingClientRect().top")
    print(f"点击后 #projectSection top: {pos} (应接近 0-100)")
    page.screenshot(path=str(OUT / "badge_03_scrolled.png"))

    # 4. 加到 5 个看 count
    page.evaluate("""
        () => {
            const arr = JSON.parse(localStorage.getItem('moyun_projects'));
            for (let i = 3; i <= 5; i++) {
                arr.push({title: '项目' + i, chapters: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()});
            }
            localStorage.setItem('moyun_projects', JSON.stringify(arr));
        }
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    count5 = page.locator("#projectBadgeCount").inner_text()
    print(f"5 个项目 count: {count5}")
    assert count5 == "5"
    page.screenshot(path=str(OUT / "badge_04_with_5.png"))

    # 5. 删光 -> hidden
    page.evaluate("() => localStorage.setItem('moyun_projects', '[]')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    hidden2 = page.locator("#projectBadge").is_hidden()
    print(f"删光后 hidden: {hidden2}")
    assert hidden2

    print(f"\n控制台错误: {len(errs)}")
    for e in errs:
        print(f"  ⚠️ {e}")
    browser.close()
    print("\n✅ 全部通过")