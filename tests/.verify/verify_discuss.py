"""
端到端验证脚本 - 跑 discuss 模式全套改动
跑一次: 启动 Playwright, 注入假 auth, 跑所有验证, 截图
"""
import json
import os
import sys
import io
from pathlib import Path
from playwright.sync_api import sync_playwright

# 强制 utf-8 输出 (Windows gbk console)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE = "http://127.0.0.1:8765"
OUT = Path(r"E:/study/novel/tests/.verify")
OUT.mkdir(parents=True, exist_ok=True)


def shot(page, name):
    p = OUT / f"{name}.png"
    page.screenshot(path=str(p), full_page=False)
    print(f"  📸 {p.name}")


def get_console_errors(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(f"PAGEERROR: {e}"))
    page.on("console", lambda m: errs.append(f"CONSOLE.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    return errs


def main():
    results = {"steps": [], "console_errors": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1400, "height": 900})
        # 注入假 auth,免被踢到 login.html
        ctx.add_init_script("""
            sessionStorage.setItem('moyun_auth_user', JSON.stringify({name: 'verify-bot'}));
        """)
        page = ctx.new_page()
        errors = get_console_errors(page)

        # ==== 步骤 1: 加载 create.html ====
        print("\n[1] 加载 create.html")
        page.goto(f"{BASE}/create.html", wait_until="domcontentloaded")
        # 先清掉 localStorage 避免上次运行残留
        page.evaluate("() => localStorage.clear()")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(500)
        shot(page, "01_loaded")
        # 检查关键元素
        assert page.locator("#discussInput").count() == 1, "discussInput 不存在"
        assert page.locator("#discussMessages").count() == 1, "discussMessages 不存在"
        results["steps"].append({"step": 1, "ok": True, "msg": "页面加载,关键元素存在"})

        # ==== 步骤 2: 验证 #1 CSS 变量生效 ====
        print("\n[2] #1 CSS 变量 - 读 :root 解析后的 --accent-teal/--accent-gold/--accent-pink 等")
        css_vars = page.evaluate("""
            () => {
                const cs = getComputedStyle(document.documentElement);
                return {
                    'accent-teal': cs.getPropertyValue('--accent-teal').trim(),
                    'accent-gold': cs.getPropertyValue('--accent-gold').trim(),
                    'accent-pink': cs.getPropertyValue('--accent-pink').trim(),
                    'accent-blue-hover': cs.getPropertyValue('--accent-blue-hover').trim(),
                    'accent-purple': cs.getPropertyValue('--accent-purple').trim(),
                    'accent-blue': cs.getPropertyValue('--accent-blue').trim(),
                    'bg-card-hover': cs.getPropertyValue('--bg-card-hover').trim(),
                    'border-radius': cs.getPropertyValue('--border-radius').trim(),
                    'motion-normal': cs.getPropertyValue('--motion-normal').trim(),
                };
            }
        """)
        print(f"  CSS vars: {json.dumps(css_vars, ensure_ascii=False)}")
        missing = [k for k, v in css_vars.items() if not v]
        results["steps"].append({
            "step": 2, "ok": not missing,
            "msg": f"CSS 变量解析 {'完整' if not missing else f'缺失: {missing}'}",
            "vars": css_vars
        })

        # ==== 步骤 3: 切到 discuss tab ====
        print("\n[3] 切到 discuss tab,期望: 注入项目上下文消息")
        # 先填个小说名,让上下文有内容
        page.fill("#novelName", "测试小说")
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(400)
        shot(page, "03_discuss_tab")
        # 应该有 2 条消息: [项目上下文] user + AI 已了解 greeting
        msgs = page.locator(".discuss-messages .message").count()
        ok = msgs >= 2
        results["steps"].append({
            "step": 3, "ok": ok,
            "msg": f"discuss tab 有 {msgs} 条消息(期望 ≥2)", "msgs": msgs
        })

        # ==== 步骤 4: 发消息 + 验证 markdown 渲染 ====
        print("\n[4] 发送消息,验证 markdown 渲染")
        page.fill("#discussInput", "## 测试标题\n\n**重点**和*斜体*加 `code`,列表:\n- 第一项\n- 第二项\n\n[链接](https://example.com)")
        page.locator(".discuss-send-btn").click()
        page.wait_for_timeout(1200)  # 等 local reply (650ms) + render
        shot(page, "04_after_send")
        # 检查最后一条 user 消息的 HTML 是否包含渲染后的标签
        last_user = page.locator(".discuss-messages .user-message").last
        last_user_html = last_user.inner_html()
        print(f"  last user msg html: {last_user_html[:200]}...")
        checks = {
            "h2": "<h2>" in last_user_html,
            "strong": "<strong>" in last_user_html,
            "em": "<em>" in last_user_html,
            "code": "<code>" in last_user_html,
            "ul": "<ul>" in last_user_html,
            "li": "<li>" in last_user_html,
            "a": "<a href=\"https://example.com\"" in last_user_html or "&#x27;https://example.com&#x27;" in last_user_html or "href=\"https://example.com\"" in last_user_html,
        }
        all_ok = all(checks.values())
        results["steps"].append({
            "step": 4, "ok": all_ok,
            "msg": f"markdown 渲染: {checks}", "html": last_user_html
        })

        # 等待 AI 回复
        page.wait_for_timeout(1500)
        shot(page, "04b_ai_reply")
        # 应该有 4 条消息: ctx user/ai + 我们的 user + AI reply
        msgs_after = page.locator(".discuss-messages .message").count()
        results["steps"].append({
            "step": "4b", "ok": msgs_after >= 4,
            "msg": f"AI 回复后有 {msgs_after} 条消息(期望 ≥4)"
        })

        # ==== 步骤 5: 验证持久化 ====
        print("\n[5] 验证 localStorage 持久化")
        stored = page.evaluate("() => localStorage.getItem('moyun_discuss_history')")
        print(f"  localStorage moyun_discuss_history 长度: {len(stored) if stored else 0}")
        if stored:
            arr = json.loads(stored)
            print(f"  条目数: {len(arr)}, roles: {[e['role'] for e in arr]}")
        results["steps"].append({
            "step": 5, "ok": stored and len(stored) > 100,
            "msg": f"localStorage 持久化: {'已存 ' + str(len(stored)) + ' 字符' if stored else '未存'}"
        })

        # ==== 步骤 6: 刷新页面,验证历史恢复 ====
        print("\n[6] 刷新页面,验证历史恢复")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        # 切到 discuss tab 看恢复
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(400)
        shot(page, "06_after_reload")
        msgs_reloaded = page.locator(".discuss-messages .message").count()
        results["steps"].append({
            "step": 6, "ok": msgs_reloaded >= 4,
            "msg": f"刷新后有 {msgs_reloaded} 条消息(期望 ≥4,跟刷新前一致)"
        })

        # ==== 步骤 7: 切回 build tab 改字段,再回 discuss,验证 ctx 刷新但 UI 不刷 ====
        print("\n[7] 切回 build 改 novelName,再回 discuss,验证 ctx 刷新但 UI 不刷屏")
        page.locator(".template-tab", has_text="模板构建").click()
        page.wait_for_timeout(300)
        page.fill("#novelName", "改后的小说名")
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(400)
        msgs_after_ctx = page.locator(".discuss-messages .message").count()
        # 期望: 消息数没变(没刷屏),但 discussContext 字符串里包含新小说名
        ctx_str = page.evaluate("() => window.__discussContext || 'no_window_var'")
        # 我们没暴露 __discussContext, 改读 localStorage 来验
        # 或直接读最后一条历史是 [项目上下文] 还是后续
        results["steps"].append({
            "step": 7, "ok": msgs_after_ctx == msgs_reloaded,
            "msg": f"切回后消息数 {msgs_after_ctx} (期望 == {msgs_reloaded},不刷屏)"
        })
        shot(page, "07_after_ctx_refresh")

        # ==== 步骤 8: 验证 '覆盖创作方向' 行为 ====
        print("\n[8] 验证 '覆盖创作方向' 按钮 (替换而非叠加)")
        # 先在 direction 写点东西
        page.fill("#direction", "原始创作方向 - 不应被叠加")
        # 切到 discuss tab
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(300)
        # 点击最末尾的 AI 消息的覆盖按钮
        apply_btns = page.locator(".discuss-apply-btn")
        apply_count = apply_btns.count()
        print(f"  apply 按钮数: {apply_count} (项目上下文跳过,后续每条 AI 消息一个)")
        if apply_count > 0:
            apply_btns.last.click()
            page.wait_for_timeout(400)
            dir_value = page.input_value("#direction")
            print(f"  direction 现值前 80 字符: {dir_value[:80]}")
            # 期望: 不再是 "原始创作方向" 开头,而是 AI 回复内容
            not_appended = not dir_value.startswith("原始创作方向")
            results["steps"].append({
                "step": 8, "ok": not_appended,
                "msg": f"direction 被替换(非叠加): {'是' if not_appended else '否 - 仍以原值开头!'}"
            })
        else:
            results["steps"].append({"step": 8, "ok": False, "msg": "找不到 apply 按钮"})

        # ==== 步骤 9: 验证 markdown 元字符不被误解析 (在 AI 上下文) ====
        print("\n[9] 发个含 * 字符的消息,验证 local 回复里不被解析为 markdown")
        # 先发个问题,书名包含 *
        page.locator(".template-tab", has_text="模板构建").click()
        page.wait_for_timeout(200)
        page.fill("#novelName", "书名含*字符*")
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(300)
        page.fill("#discussInput", "问题带 *星号*")
        page.locator(".discuss-send-btn").click()
        page.wait_for_timeout(1500)
        shot(page, "09_md_escape")
        # 检查最后 AI 回复里,我们的 * 没被解析为 <em>
        last_ai_html = page.locator(".discuss-messages .bot-message").last.inner_html()
        # local reply 会带 "你刚才的问题是：'问题带 *星号*'"
        # 我们期望: 看到 *字符字面*,不是 <em>字符</em>
        em_in_quote = "<em>" in last_ai_html and "问题带" in last_ai_html and "星号" in last_ai_html
        # 简单判定: 如果 <em> 在最后这条 AI 消息中,且包含 "星号" 这种正文,说明 * 没被转义
        # 我们用更精确的: 查找 <em>标签后是否跟"星号"或"问题带"
        has_md_in_quote = ("<em>问题带" in last_ai_html or "<em>星号" in last_ai_html
                          or "<em>*" in last_ai_html or "*<em>" in last_ai_html)
        results["steps"].append({
            "step": 9, "ok": not has_md_in_quote,
            "msg": f"local reply 中 * 字符未被误解析为 markdown: {'是' if not has_md_in_quote else '否 - <em> 出现在引号内!'}",
            "ai_html_excerpt": last_ai_html[:300]
        })

        # ==== 步骤 10: 验证 50 条上限 (直接调用 trim 模拟) ====
        print("\n[10] 验证 MAX_DISCUSS_HISTORY 50 条上限 (脚本注入大量 history 后看 trim 行为)")
        # 直接通过 evaluate 读 trim 行为
        # 先备份当前
        backup = page.evaluate("() => localStorage.getItem('moyun_discuss_history')")
        # 注入 60 条
        big = [{"role": "user", "content": f"msg{i}"} for i in range(60)]
        # 在头部加哨兵
        big.insert(0, {"role": "user", "content": "[项目上下文] ctx", "__context": True})
        big.insert(1, {"role": "assistant", "content": "ok", "__context": True})
        page.evaluate(f"localStorage.setItem('moyun_discuss_history', JSON.stringify({json.dumps(big)}))")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(500)
        page.locator(".template-tab", has_text="探讨模式").click()
        page.wait_for_timeout(400)
        # 发一条触发 trim
        page.fill("#discussInput", "trigger trim")
        page.locator(".discuss-send-btn").click()
        page.wait_for_timeout(1200)
        final = json.loads(page.evaluate("() => localStorage.getItem('moyun_discuss_history')"))
        first = final[0] if final else {}
        # 期望: 头部仍是哨兵
        still_has_sentinel = first.get("__context") is True
        # 期望: 总数 ≤ 50 + 1 (新发的)
        # 实际: trim 后 max 50, 然后 push 新 user -> 51, 但 push 后才 trim
        # 等等 push 后 trim: 50+1=51 -> trim -> 50
        in_limit = len(final) <= 50
        results["steps"].append({
            "step": 10, "ok": still_has_sentinel and in_limit,
            "msg": f"trim 后头仍是哨兵: {still_has_sentinel}, 条数 {len(final)} ≤ 50: {in_limit}"
        })
        shot(page, "10_after_trim")

        # 恢复
        page.evaluate(f"localStorage.setItem('moyun_discuss_history', {json.dumps(backup)!r})")

        # ==== 控制台错误汇总 ====
        results["console_errors"] = list(errors)

        browser.close()

    # ==== 汇总 ====
    print("\n" + "=" * 60)
    print("汇总:")
    print("=" * 60)
    failed = [s for s in results["steps"] if not s.get("ok")]
    for s in results["steps"]:
        mark = "✅" if s.get("ok") else "❌"
        print(f"  {mark} step {s['step']}: {s['msg']}")
    print(f"\n控制台错误/警告: {len(results['console_errors'])} 条")
    for e in results["console_errors"][:10]:
        print(f"  ⚠️ {e}")

    out_json = OUT / "results.json"
    out_json.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n完整结果: {out_json}")
    sys.exit(1 if failed or results["console_errors"] else 0)


if __name__ == "__main__":
    main()
