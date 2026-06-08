import os
import json
import re
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
client = None

if ANTHROPIC_API_KEY:
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
    except ImportError:
        pass

# 主题专属系统提示词
THEME_PROMPTS = {
    'romance': """你是一位专业的言情小说写作助手，擅长：
- 细腻的情感描写和人物心理刻画
- 制造浪漫氛围和情感冲突
- 描绘人物内心变化和情感纠葛
- 把握言情小说的节奏和甜虐平衡

写作风格：注重细节，善用感官描写，文笔细腻温柔。""",

    'fantasy': """你是一位专业的玄幻小说写作助手，擅长：
- 构建完整的奇幻世界观和力量体系
- 设计修炼等级、功法招式
- 描绘仙侠/奇幻场景和战斗场面
- 塑造主角的成长弧线

写作风格：气势磅礴，想象力丰富，世界观宏大。""",

    'mystery': """你是一位专业的悬疑小说写作助手，擅长：
- 铺设悬念和埋设伏笔
- 设计线索和推理逻辑
- 制造反转和意想不到的结局
- 把握悬疑节奏，张弛有度

写作风格：逻辑严密，节奏紧凑，善于制造紧张感。""",

    'scifi': """你是一位专业的科幻小说写作助手，擅长：
- 设计符合逻辑的科技设定
- 描绘未来/太空场景
- 探讨科技与人性的关系
- 构建科幻世界观

写作风格：科技感强，逻辑自洽，视野宏大。""",

    'wuxia': """你是一位专业的武侠小说写作助手，擅长：
- 描绘江湖规矩和门派纷争
- 设计武功招式和内功心法
- 塑造侠客形象和江湖情义
- 运用古风语言和武侠叙事

写作风格：古风古韵，招式精彩，侠义为先。""",

    'urban': """你是一位专业的都市小说写作助手，擅长：
- 描绘现代都市生活和职场场景
- 塑造都市人物形象
- 描写人际关系和现实压力
- 把握都市节奏感

写作风格：贴近生活，语言现代，节奏明快。""",

    'historical': """你是一位专业的历史小说写作助手，擅长：
- 还原历史时代背景和细节
- 塑造历史人物形象
- 描绘古代社会风貌
- 把握历史小说的真实性与文学性

写作风格：考据严谨，语言符合时代背景，史诗感强。""",

    'horror': """你是一位专业的恐怖小说写作助手，擅长：
- 营造恐怖氛围和心理恐惧
- 善用环境描写和留白
- 设计超自然元素和灵异事件
- 制造惊悚感和代入感

写作风格：善于制造恐惧氛围，注重心理描写，适度留白。"""
}

DEFAULT_PROMPT = """你是一位专业的小说写作助手，擅长：
- 分析和细化小说主题
- 构建故事大纲和章节结构
- 续写和润色小说内容
- 提供写作建议和改进方案

请用中文回答，语气专业而富有创意。"""


def get_system_prompt(theme_type=None):
    return THEME_PROMPTS.get(theme_type, DEFAULT_PROMPT)


@app.route('/api/analyze-theme', methods=['POST'])
def analyze_theme():
    data = request.json
    theme = data.get('theme', '')
    theme_type = data.get('themeType', '')

    if not theme:
        return jsonify({'error': '请提供主题'}), 400

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"""请分析并细化以下小说主题，提供具体的写作建议：

题材类型：{theme_type or '未指定'}
主题：{theme}

请从以下几个方面给出建议：
1. 题材定位和风格把控
2. 核心人物设定（主角、配角）
3. 故事背景和世界观
4. 主要情节点安排
5. 写作技巧和注意事项"""
                }]
            )
            return jsonify({'suggestion': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # 模拟响应
    suggestions = {
        'romance': f"""基于「{theme}」这个言情题材，我建议：

📚 **题材定位**
言情小说核心在于情感刻画，建议注重人物内心变化，善用细节描写来表现情感。

👥 **人物设定**
设计2-3个主要人物，突出他们之间的情感纠葛和性格差异。建议女主清新独立，男主深情专一。

🌍 **背景设定**
选择一个能衬托情感的典型环境，如：都市豪门、校园青春、古风宫廷等。

📖 **结构建议**
建议按照：相识→相知→相恋→误解→和好→升华的情感线来安排情节。

✍️ **写作技巧**
多使用感官描写（触觉、听觉、嗅觉）来增强代入感，善于制造甜虐反转。""",

        'fantasy': f"""基于「{theme}」这个玄幻题材，我建议：

📚 **题材定位**
玄幻小说需要构建完整的世界观和力量体系，建议提前规划修炼等级和势力分布。

👥 **人物设定**
主角建议设计成平凡出身但有特殊体质或机缘，配角要各有特色（正派、反派、师友等）。

🌍 **世界观构建**
建议规划：境界等级划分、势力分布图、功法类型、地图设定等。

📖 **结构建议**
建议按照：平凡→觉醒→修炼→历练→势力→巅峰的成长线来安排。

✍️ **写作技巧**
注意力量体系的逻辑自洽，战斗场面要精彩纷呈，适时加入爽点。""",

        'mystery': f"""基于「{theme}」这个悬疑题材，我建议：

📚 **题材定位**
悬疑小说关键是悬念和节奏，建议设置多个谜题，适时揭示答案，保持读者好奇心。

👥 **人物设定**
侦探/调查者要智慧过人，配角要有各自的秘密。反派要足够狡猾，让读者难以猜测。

🌍 **背景设定**
选择一个封闭或半封闭的环境，如：孤岛、古宅、雪夜山庄等，增强悬疑感。

📖 **结构建议**
建议按照：案发→调查→迷局→推理→破案→反转的结构来安排。

✍️ **写作技巧**
注意伏笔和线索的埋设，反转要合理且出人意料，善用误导信息。""",

        'scifi': f"""基于「{theme}」这个科幻题材，我建议：

📚 **题材定位**
科幻小说需要逻辑自洽的科技设定，建议提前规划技术水平线，避免设定矛盾。

👥 **人物设定**
主角建议具有创新精神和冒险精神，配角团队要有多元化的专业技能。

🌍 **科技设定**
建议规划：核心科技原理、武器装备、社会结构、未来生活细节等。

📖 **结构建议**
建议按照：现状→变革→冲突→解决→新常态的结构来安排情节。

✍️ **写作技巧**
确保科技设定的逻辑自洽，使用专业术语增强可信度，探讨科技与人性的关系。""",

        'wuxia': f"""基于「{theme}」这个武侠题材，我建议：

📚 **题材定位**
武侠小说要注重江湖规矩和武功招式的描写，对话要符合古代语境，有古风韵味。

👥 **人物设定**
主角建议侠义心肠但有成长空间，配角要有江湖特色（掌门、侠客、绿林好汉等）。

🌍 **江湖设定**
建议规划：门派分布、江湖规矩、武功路数、兵器谱等。

📖 **结构建议**
建议按照：新手→拜师→历练→纷争→华山论剑→归隐的江湖线来安排。

✍️ **写作技巧**
武功招式要精彩但不繁琐，江湖情义要动人，对话要简洁有力。"""
    }

    default_suggestion = f"""基于「{theme}」这个主题，我建议：

📚 **题材定位**
建议创作一篇中长篇小说，注重情节的起承转合。

👥 **人物设定**
设计2-3个主要人物，让他们之间形成有趣的关系和张力。

🌍 **背景构建**
考虑故事发生的时间、地点和社会环境，让背景服务于主题。

📖 **情节点**
预设开头、发展和结尾，让故事有清晰的结构。

✍️ **写作建议**
开头要制造吸引力，让读者想继续读下去。"""

    return jsonify({'suggestion': suggestions.get(theme_type, default_suggestion)})


@app.route('/api/analyze-world', methods=['POST'])
def analyze_world():
    data = request.json
    world_setting = data.get('worldSetting', {})
    theme_type = data.get('themeType', '')
    theme = data.get('theme', '')

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"""请根据以下世界观设定，提供细化建议：

题材：{theme_type or '通用'}
主题：{theme or '未指定'}

时代背景：{world_setting.get('era', '未指定')}
社会环境：{world_setting.get('society', '未指定')}
地理/空间：{world_setting.get('location', '未指定')}
特殊规则：{world_setting.get('rules', '未指定')}

请从以下几个方面给出建议：
1. 世界观的完整性和一致性
2. 细节填充建议
3. 与主题的契合度
4. 可能的故事元素"""
                }]
            )
            return jsonify({'suggestion': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({
        'suggestion': f"""根据你的设定，已生成详细的世界观描述：

🌍 **时代背景**: {world_setting.get('era', '通用时代')}
🏛 **社会环境**: {world_setting.get('society', '待补充')}
📍 **地理空间**: {world_setting.get('location', '待补充')}
⚡ **特殊规则**: {world_setting.get('rules', '待补充')}

建议进一步细化以上设定，以增强故事的沉浸感。"""
    })


@app.route('/api/generate-outline', methods=['POST'])
def generate_outline():
    data = request.json
    theme = data.get('theme', '')
    theme_type = data.get('themeType', '')
    theme_analysis = data.get('themeAnalysis', '')
    world_setting = data.get('worldSetting', {})

    if not theme:
        return jsonify({'error': '请提供主题'}), 400

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"""请为以下小说主题生成详细的章节大纲：

题材：{theme_type or '通用'}
主题：{theme}

{('已有分析：' + theme_analysis) if theme_analysis else ''}

时代背景：{world_setting.get('era', '')}
社会环境：{world_setting.get('society', '')}

请生成6-10章的详细大纲，每章包含标题和一句话简介。"""
                }]
            )
            response_text = message.content[0].text
            chapters = parse_chapters_from_text(response_text)
            return jsonify({'outline': chapters, 'raw': response_text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # 模拟大纲数据
    outline_templates = {
        'romance': [
            {"title": "缘起", "summary": "命运的相遇，心动的开始", "content": ""},
            {"title": "相识", "summary": "渐生情愫，了解加深", "content": ""},
            {"title": "相知", "summary": "深入了解，情感升温", "content": ""},
            {"title": "风波", "summary": "误会产生，情感危机", "content": ""},
            {"title": "真相", "summary": "误解解开，和好如初", "content": ""},
            {"title": "相守", "summary": "终成眷属，幸福圆满", "content": ""},
        ],
        'fantasy': [
            {"title": "觉醒", "summary": "发现特殊体质，命运转折", "content": ""},
            {"title": "拜师", "summary": "踏入修行之路", "content": ""},
            {"title": "修炼", "summary": "实力稳步提升", "content": ""},
            {"title": "历练", "summary": "初入江湖，风险与机遇并存", "content": ""},
            {"title": "纷争", "summary": "势力争夺，群雄并起", "content": ""},
            {"title": "巅峰", "summary": "终成大道，问鼎天下", "content": ""},
        ],
        'mystery': [
            {"title": "案发", "summary": "离奇事件发生", "content": ""},
            {"title": "调查", "summary": "深入现场，收集线索", "content": ""},
            {"title": "线索", "summary": "发现关键证据", "content": ""},
            {"title": "迷局", "summary": "案情扑朔迷离", "content": ""},
            {"title": "推理", "summary": "真相浮出水面", "content": ""},
            {"title": "破局", "summary": "真相大白", "content": ""},
        ],
        'scifi': [
            {"title": "起点", "summary": "科技改变生活", "content": ""},
            {"title": "异变", "summary": "发现异常现象", "content": ""},
            {"title": "探索", "summary": "深入调查真相", "content": ""},
            {"title": "危机", "summary": "面临生存威胁", "content": ""},
            {"title": "抉择", "summary": "寻找解决方案", "content": ""},
            {"title": "新生", "summary": "开创未来", "content": ""},
        ],
        'wuxia': [
            {"title": "少年", "summary": "初入江湖", "content": ""},
            {"title": "拜师", "summary": "偶遇高人", "content": ""},
            {"title": "成长", "summary": "武功精进", "content": ""},
            {"title": "纷争", "summary": "卷入门派恩怨", "content": ""},
            {"title": "论剑", "summary": "华山之巅", "content": ""},
            {"title": "归隐", "summary": "江湖再见", "content": ""},
        ],
        'urban': [
            {"title": "相遇", "summary": "命运安排", "content": ""},
            {"title": "交集", "summary": "生活交织", "content": ""},
            {"title": "职场", "summary": "现实压力", "content": ""},
            {"title": "矛盾", "summary": "冲突爆发", "content": ""},
            {"title": "解决", "summary": "共同面对", "content": ""},
            {"title": "未来", "summary": "携手前行", "content": ""},
        ],
        'historical': [
            {"title": "乱世", "summary": "时代背景", "content": ""},
            {"title": "抉择", "summary": "人物登场", "content": ""},
            {"title": "纷争", "summary": "势力角逐", "content": ""},
            {"title": "情义", "summary": "爱恨情仇", "content": ""},
            {"title": "变局", "summary": "历史转折", "content": ""},
            {"title": "落幕", "summary": "时代终结", "content": ""},
        ],
        'horror': [
            {"title": "日常", "summary": "平静生活", "content": ""},
            {"title": "异象", "summary": "诡异征兆", "content": ""},
            {"title": "逼近", "summary": "恐惧加深", "content": ""},
            {"title": "危机", "summary": "生死边缘", "content": ""},
            {"title": "真相", "summary": "揭开秘密", "content": ""},
            {"title": "余韵", "summary": "噩梦终结", "content": ""},
        ]
    }

    chapters = outline_templates.get(theme_type, outline_templates['romance'])
    return jsonify({'outline': chapters})


def parse_chapters_from_text(text):
    chapters = []
    lines = text.split('\n')
    current_chapter = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if '章' in line or 'Chapter' in line.upper() or re.match(r'^[0-9]+[\.、]', line):
            if current_chapter:
                chapters.append(current_chapter)

            title = re.sub(r'^(第[一二三四五六七八九十百零\d]+章|第[0-9]+章|Chapter\s*[0-9]+|[0-9]+[\.、])\s*', '', line)
            title = title.strip('"""「」')

            current_chapter = {"title": title, "summary": "", "content": ""}
        elif current_chapter and line:
            if not current_chapter["summary"]:
                current_chapter["summary"] = line
            else:
                current_chapter["summary"] += " " + line

    if current_chapter:
        chapters.append(current_chapter)

    if not chapters:
        chapters = [
            {"title": "缘起", "summary": "故事开端", "content": ""},
            {"title": "发展", "summary": "情节推进", "content": ""},
            {"title": "高潮", "summary": "矛盾爆发", "content": ""},
        ]

    return chapters


@app.route('/api/ai-write', methods=['POST'])
def ai_write():
    data = request.json
    content = data.get('content', '')
    chapter_title = data.get('chapterTitle', '')
    theme_type = data.get('themeType', '')
    world_setting = data.get('worldSetting', {})

    if not content:
        return jsonify({'error': '请提供内容'}), 400

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"""请续写以下小说内容，保持相同的风格和节奏：

章节：{chapter_title}
题材：{theme_type or '通用'}

当前内容：
{content}

请续写150-300字，保持故事的连贯性和文笔质量。"""
                }]
            )
            return jsonify({'continuation': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # 模拟续写
    continuations = {
        'romance': [
            "\n\n她抬起头，目光与他相遇，心中涌起一股难以言喻的感觉。微风拂过，带起了她的发丝，也带起了那段尘封已久的记忆。",
            "\n\n他望着她的背影，心中泛起层层涟漪。月光洒落在两人之间，仿佛在诉说着某个古老的故事。",
        ],
        'fantasy': [
            "\n\n就在此时，他感到体内真气涌动，周身灵力开始汇聚。突破的契机已经来临，他必须抓住这个机会。",
            "\n\n天地灵气如潮水般涌入体内，他感觉到自己的修为正在发生质的飞跃。",
        ],
        'mystery': [
            "\n\n然而，当线索指向真相时，却发现一切远比想象中更加复杂。隐藏在背后的秘密，正在慢慢浮出水面。",
            "\n\n他仔细端详着现场，忽然注意到一个被所有人忽略的细节——那枚不起眼的纽扣。",
        ],
        'scifi': [
            "\n\n量子计算机的屏幕上，数据流如瀑布般倾泻而下。AI终于给出了答案——一个让所有人都震惊的答案。",
            "\n\n星际战舰的引擎轰鸣声中，他们踏上了前往未知星域的旅程。",
        ],
        'wuxia': [
            "\n\n剑光闪烁，剑气纵横。两人在月下交手，招式精妙绝伦，每一剑都蕴含着深不可测的内力。",
            "\n\n江湖风波骤起，门派之间的恩怨终于迎来了清算的时刻。",
        ],
        'urban': [
            "\n\n夜幕降临，城市的霓虹灯次第亮起。他站在落地窗前，俯瞰着这座不夜城，心中感慨万千。",
            "\n\n咖啡厅里，两人相对而坐。空气中弥漫着淡淡的咖啡香，也弥漫着某种微妙的情绪。",
        ],
        'historical': [
            "\n\n烽火连三月，家书抵万金。战争的阴云笼罩着这片土地，命运的齿轮开始转动。",
            "\n\n皇城根下，风云变幻。一场足以撼动朝野的大事，正在悄然酝酿。",
        ],
        'horror': [
            "\n\n黑暗中，仿佛有什么东西在注视着他们。寒意从脊背升起，让人不敢回头。",
            "\n\n古老的宅院中，传来若有若无的低语声。尘封的秘密，即将被唤醒。",
        ]
    }

    options = continuations.get(theme_type, continuations['romance'])
    return jsonify({'continuation': random.choice(options)})


@app.route('/api/ai-polish', methods=['POST'])
def ai_polish():
    data = request.json
    content = data.get('content', '')
    theme_type = data.get('themeType', '')

    if not content:
        return jsonify({'error': '请提供内容'}), 400

    if client:
        try:
            polish_prompt = f"""你是一位专业的中文写作润色专家，擅长优化{theme_type or '通用'}题材的文字表达，
使其更加流畅、生动、有文采。请直接返回润色后的内容，不要添加解释性文字。"""
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=polish_prompt,
                messages=[{
                    "role": "user",
                    "content": f"请润色以下内容：\n\n{content}"
                }]
            )
            return jsonify({'polished': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'polished': content + "\n\n【AI润色已完成】"})


@app.route('/api/ai-improve', methods=['POST'])
def ai_improve():
    data = request.json
    content = data.get('content', '')
    chapter_title = data.get('chapterTitle', '')
    theme_type = data.get('themeType', '')

    if not content:
        return jsonify({'error': '请提供内容'}), 400

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"""请为以下小说内容提供改进建议：

章节：{chapter_title}
题材：{theme_type or '通用'}

内容：
{content}

请从情节、人物描写、节奏、对话等方面给出具体建议。"""
                }]
            )
            return jsonify({'suggestion': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    suggestions = {
        'romance': """💡 **改进建议**：

1. **情感方面**：可以增加更多细腻的情感描写，让人物内心活动更加丰富

2. **人物描写**：建议增加更多心理独白，让读者更好地理解人物情感变化

3. **场景描写**：适当增加环境氛围描写，烘托情感

4. **对话优化**：让对话更自然，符合人物性格和情境""",

        'fantasy': """💡 **改进建议**：

1. **世界观**：加强设定体现，注意力量体系的逻辑性

2. **战斗场面**：增加更多招式和内力描写的细节

3. **环境描写**：融入仙侠氛围，营造奇幻感

4. **节奏把控**：高潮部分要精彩，低谷部分要适当舒缓""",

        'mystery': """💡 **改进建议**：

1. **悬念**：加强伏笔和线索的埋设，增加阅读吸引力

2. **节奏**：适当加快节奏，制造紧张感

3. **细节**：增加更多观察和推理过程的描写

4. **反转**：考虑在合适的地方加入反转""",

        'scifi': """💡 **改进建议**：

1. **科技设定**：确保逻辑自洽，使用专业术语增强可信度

2. **未来感**：增加科技生活细节的描写

3. **人文关怀**：探讨科技与人性的关系

4. **场景**：描绘未来城市和科技的视觉效果""",

        'wuxia': """💡 **改进建议**：

1. **武功描写**：增加招式和内功的细节描写

2. **江湖规矩**：融入更多江湖规矩和门派特色

3. **语言风格**：让对话更符合古代语境

4. **侠义精神**：突出侠客的精神内核""",

        'urban': """💡 **改进建议**：

1. **真实感**：贴近现代生活细节，增强代入感

2. **职场/社交**：增加真实场景的描写

3. **人物塑造**：让角色更立体，符合都市人物特征

4. **节奏**：保持明快的节奏，符合都市风格""",

        'historical': """💡 **改进建议**：

1. **时代感**：注意历史细节的准确性

2. **语言**：人物对话要符合时代背景和身份

3. **场景**：还原古代社会风貌

4. **人物**：符合历史人物的定位""",

        'horror': """💡 **改进建议**：

1. **氛围**：善用环境描写来营造恐怖感

2. **留白**：适度留白，不要过度描写

3. **心理**：增加更多心理恐惧的描写

4. **悬念**：设置更多悬念，吊读者胃口"""
    }

    return jsonify({'suggestion': suggestions.get(theme_type, suggestions['romance'])})


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    context = data.get('context', {})

    if not message:
        return jsonify({'error': '请提供消息'}), 400

    theme_type = context.get('themeType', '')

    if client:
        try:
            prompt = get_system_prompt(theme_type)
            context_prompt = ""
            if context.get('theme'):
                context_prompt += f"\n当前小说主题：{context['theme']}"
            if context.get('currentChapter'):
                chapter = context['currentChapter']
                context_prompt += f"\n当前章节：{chapter.get('title', '')}"
                if chapter.get('content'):
                    context_prompt += f"\n章节内容片段：{chapter['content'][:200]}..."

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=prompt,
                messages=[{
                    "role": "user",
                    "content": f"{context_prompt}\n\n用户问题：{message}"
                }]
            )
            return jsonify({'response': message.content[0].text})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    responses = [
        f"""好的，我来帮你分析！{('关于「' + context['theme'] + '」的' + (theme_type or '') + '题材') if context.get('theme') else ''}

根据你目前的情况，我可以给出以下建议：

1. 继续深化故事的主题和内核
2. 注意人物动机的合理性和成长性
3. 善用伏笔和呼应，让故事更加紧凑

有什么具体问题可以继续问我。""",

        "这是一个很好的问题！让我来分析一下...\n\n\n建议你可以继续丰富当前的故事情节，注意人物之间的互动和冲突设置。",

        "根据当前的写作进度，我建议：\n\n1. 注意节奏的把控\n2. 加强人物心理描写\n3. 适时埋下伏笔\n\n还有什么需要帮助的吗？"
    ]

    return jsonify({'response': random.choice(responses)})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # 默认纯前端模式：前端 JS 直接调用户配置的 LLM（OpenAI/Anthropic 兼容端点）。
    # 本 Flask 服务是可选后端 — 若需使用，export ANTHROPIC_API_KEY 后启动，
    # 并在前端代码里把 endpoint 指向 http://localhost:5000/api/...
    print(f"墨韵AI Flask 后端已启动: http://localhost:{port}")
    print("提示: 当前为可选服务，前端默认走用户配置的 LLM 端点。")
    app.run(host='0.0.0.0', port=port, debug=True)