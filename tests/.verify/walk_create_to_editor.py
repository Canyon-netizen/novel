"""
验证: create.html -> editor.html 跳转流程
目标: 找按钮, 点击, 看是否跳到 editor, URL 是否带 ?project=&chapter=
"""
import sys
import io
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

OUT = Path(r"E:/study/novel/tests/.verify")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1400, "height": 900})
        ctx.add_init_script("""
            sessionStorage.setItem('moyun_auth_user', JSON.stringify({name: 'verify-bot'}));
        """)
        page = ctx.new_page()

        page_errors = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        # 步骤 1: 加载 create.html
        print("\n[1] 加载 create.html")
        page.goto("http://127.0.0.1:8765/create.html", wait_until="domcontentloaded")
        page.evaluate("() => localStorage.clear()")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(500)

        # 步骤 2: 找创建按钮 - 列出页面上所有按钮
        print("\n[2] 列出页面上所有 button / a 元素(找'创建'按钮)")
        buttons = page.evaluate("""
            () => {
                const els = Array.from(document.querySelectorAll('button, a, [role=button], .btn'));
                return els.map(e => ({
                    tag: e.tagName,
                    id: e.id,
                    class: e.className,
                    text: (e.innerText || '').trim().slice(0, 50),
                    visible: e.offsetWidth > 0 && e.offsetHeight > 0
                })).filter(e => e.text);
            }
        """)
        for b in buttons:
            print(f"  {b['tag']}#{b['id']} .{b['class'][:30]} | '{b['text']}' visible={b['visible']}")

        # 步骤 3: 看看 createNovelBtn 在哪 / 是否可见
        print("\n[3] createNovelBtn 状态")
        btn_info = page.evaluate("""
            () => {
                const btn = document.getElementById('createNovelBtn');
                if (!btn) return {found: false};
                const rect = btn.getBoundingClientRect();
                return {
                    found: true,
                    visible: rect.width > 0 && rect.height > 0,
                    rect: {x: rect.x, y: rect.y, w: rect.width, h: rect.height},
                    parent_display: getComputedStyle(btn.parentElement).display,
                    parent_visibility: getComputedStyle(btn.parentElement).visibility,
                    text: btn.innerText.trim()
                };
            }
        """)
        print(f"  {btn_info}")

        # 步骤 4: 填小说名, 找按钮, 监听 navigation
        print("\n[4] 填小说名, 准备点击创建")
        page.fill("#novelName", "测试跳转小说")
        page.screenshot(path=str(OUT / "walk_01_filled.png"))

        # 在所有可见按钮里找含"创建"或"开始"或"进入"的
        candidates = [b for b in buttons if b['visible'] and ('创建' in b['text'] or '开始' in b['text'] or '进入' in b['text'])]
        print(f"  候选按钮: {candidates}")

        # 步骤 5: 拦截 navigation, 点 createNovelBtn, 看跳到哪
        print("\n[5] 拦截导航 + 点击 createNovelBtn")
        navigated_to = []
        page.on("framenavigated", lambda frame: navigated_to.append(frame.url) if frame == page.main_frame else None)
        try:
            btn = page.locator("#createNovelBtn")
            if btn.count() == 0:
                print("  ❌ #createNovelBtn 不存在")
            else:
                print(f"  按钮可见: {btn.is_visible()}")
                # 先滚到视口内
                btn.scroll_into_view_if_needed()
                page.wait_for_timeout(300)
                btn.click(timeout=5000)
                page.wait_for_timeout(2000)
        except Exception as e:
            print(f"  点击异常: {e}")

        page.screenshot(path=str(OUT / "walk_02_after_click.png"))

        print(f"\n[6] 当前 URL: {page.url}")
        print(f"  导航事件流: {navigated_to}")

        # 步骤 7: localStorage 状态
        print("\n[7] localStorage 状态")
        ls = page.evaluate("""
            () => {
                const out = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    const v = localStorage.getItem(k);
                    out[k] = v.length > 200 ? v.slice(0, 200) + '...' : v;
                }
                return out;
            }
        """)
        for k, v in ls.items():
            print(f"  {k} = {v}")

        print(f"\n[8] 控制台错误: {len(page_errors)}")
        for e in page_errors[:5]:
            print(f"  ⚠️ {e}")

        browser.close()


if __name__ == "__main__":
    main()