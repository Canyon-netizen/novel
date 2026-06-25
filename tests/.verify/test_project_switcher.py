"""Test project switcher dropdown in editor.html"""
import sys, io, json
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

    # Seed 3 projects
    page.goto("http://127.0.0.1:8765/index.html", wait_until="domcontentloaded")
    page.evaluate("""
        () => {
            const projects = [
                {title: '项目甲', type: 'fantasy', description: '', protagonist: '', tropes: [], audience: 'male-youth', wordCount: 750000, plotStructure: 'linear', chapters: [{title: '第一章', summary: '', content: ''}, {title: '第二章', summary: '', content: ''}], characters: [], createdAt: new Date(Date.now() - 86400000*3).toISOString(), updatedAt: new Date(Date.now() - 3600000*2).toISOString()},
                {title: '项目乙', type: 'urban', description: '', protagonist: '', tropes: [], audience: 'male-youth', wordCount: 750000, plotStructure: 'linear', chapters: [{title: '第一章', summary: '', content: ''}], characters: [], createdAt: new Date(Date.now() - 86400000*10).toISOString(), updatedAt: new Date(Date.now() - 86400000*5).toISOString()},
                {title: '项目丙', type: 'scifi', description: '', protagonist: '', tropes: [], audience: 'male-youth', wordCount: 750000, plotStructure: 'linear', chapters: [{title: '第一章', summary: '', content: ''}, {title: '第二章', summary: '', content: ''}, {title: '第三章', summary: '', content: ''}], characters: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}
            ];
            localStorage.setItem('moyun_projects', JSON.stringify(projects));
            localStorage.setItem('moyun_current_project', '0');
            localStorage.setItem('moyun_current_chapter', '0');
        }
    """)

    # 进 editor
    page.goto("http://127.0.0.1:8765/editor.html?project=0&chapter=0", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "sw_01_loaded.png"))

    # 1. 当前 title 显示
    title = page.locator("#projectSwitcherTitle").inner_text()
    print(f"当前 title: '{title}'")
    assert title == "项目甲", f"期望 '项目甲', 实际 '{title}'"

    # 2. 点击展开
    page.locator("#projectSwitcherBtn").click()
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / "sw_02_open.png"))
    item_count = page.locator(".project-switcher__item").count()
    print(f"下拉条数: {item_count}")
    assert item_count == 3, f"期望 3 条, 实际 {item_count}"

    # 3. 检查高亮 (项目甲 高亮)
    active = page.locator(".project-switcher__item.is-active").count()
    print(f"高亮条目: {active}")
    assert active == 1

    # 4. 点击其他项目 -> 跳 URL
    page.locator('.project-switcher__item[data-index="2"]').click()
    page.wait_for_timeout(500)
    print(f"点击项目丙后 URL: {page.url}")
    assert "project=2" in page.url
    page.wait_for_timeout(500)
    new_title = page.locator("#projectSwitcherTitle").inner_text()
    print(f"新 title: '{new_title}'")
    assert new_title == "项目丙"

    # 5. 点击外部关闭
    page.locator("#projectSwitcherBtn").click()
    page.wait_for_timeout(150)
    page.locator(".editor-title").click()  # 模拟点击外部
    page.wait_for_timeout(150)
    hidden = page.locator("#projectSwitcherMenu").is_hidden()
    print(f"点击外部后 menu hidden: {hidden}")
    assert hidden

    # 6. Escape 关闭
    page.locator("#projectSwitcherBtn").click()
    page.wait_for_timeout(150)
    page.keyboard.press("Escape")
    page.wait_for_timeout(150)
    hidden2 = page.locator("#projectSwitcherMenu").is_hidden()
    print(f"Escape 后 menu hidden: {hidden2}")
    assert hidden2

    # 7. 无项目状态: 清空后 editor 会自动跳 index.html, 验证跳转
    page.evaluate("() => localStorage.setItem('moyun_projects', '[]')")
    page.goto("http://127.0.0.1:8765/editor.html?project=0&chapter=0", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    print(f"清空后 URL: {page.url}")
    assert page.url.endswith("index.html"), f"期望跳到 index.html, 实际 {page.url}"

    # 8. 直接进 index.html, 验证下拉还是 hidden (因为无项目)
    # 已在 index.html 上, 但下拉是 editor 专属, 这步跳过

    print(f"\n控制台错误: {len(errs)}")
    for e in errs:
        print(f"  ⚠️ {e}")
    browser.close()
    print("\n✅ 全部通过")