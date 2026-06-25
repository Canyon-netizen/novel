"""Test: open editor with 1 project, click gear, click api warning - does settingsModal open?"""
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

    page.on("pageerror", lambda e: print(f"  ❌ PAGEERROR: {e}"))

    # 直接进 editor.html?project=0&chapter=0
    print("[1] seed 一个项目到 localStorage")
    page.goto("http://127.0.0.1:8765/index.html", wait_until="domcontentloaded")
    page.evaluate("""
        () => {
            localStorage.setItem('moyun_projects', JSON.stringify([{
                title: '测试', type: 'fantasy', description: '', protagonist: '',
                tropes: [], audience: 'male-youth', wordCount: 750000,
                plotStructure: 'linear',
                chapters: [{title: '第一章', summary: '', content: ''}],
                characters: [], createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }]));
            localStorage.setItem('moyun_current_project', '0');
            localStorage.setItem('moyun_current_chapter', '0');
        }
    """)

    print("\n[2] 进 editor.html")
    page.goto("http://127.0.0.1:8765/editor.html?project=0&chapter=0", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "ed_01_loaded.png"))

    # 检查 settingsModal 是否真的存在
    print("\n[3] 检查 #settingsModal 状态")
    sm = page.evaluate("""
        () => {
            const el = document.getElementById('settingsModal');
            if (!el) return {exists: false};
            return {
                exists: true,
                classList: el.className,
                children: el.children.length,
                parent: el.parentElement.tagName
            };
        }
    """)
    print(f"  {sm}")

    # 检查 aiStatus
    print("\n[4] 检查 #aiStatus")
    aistatus = page.evaluate("""
        () => {
            const el = document.getElementById('aiStatus');
            return {
                tag: el ? el.tagName : 'NOT FOUND',
                text: el ? el.textContent : '',
                classes: el ? el.className : ''
            };
        }
    """)
    print(f"  {aistatus}")

    # 尝试点齿轮
    print("\n[5] 点击右上角齿轮")
    page.locator(".settings-btn").click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / "ed_02_gear_clicked.png"))
    after_gear = page.evaluate("""
        () => {
            const el = document.getElementById('settingsModal');
            return {class: el.className, hasShow: el.classList.contains('show')};
        }
    """)
    print(f"  settingsModal 状态: {after_gear}")

    # 关掉, 点击 aiStatus
    print("\n[6] 点击 #aiStatus")
    # 先 close modal
    page.evaluate("() => document.getElementById('settingsModal').classList.remove('show')")
    page.wait_for_timeout(200)
    try:
        page.locator("#aiStatus").click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "ed_03_aistatus_clicked.png"))
        after_status = page.evaluate("""
            () => {
                const el = document.getElementById('settingsModal');
                return {class: el.className, hasShow: el.classList.contains('show')};
            }
        """)
        print(f"  settingsModal 状态: {after_status}")
    except Exception as e:
        print(f"  点击 aiStatus 失败: {e}")

    browser.close()