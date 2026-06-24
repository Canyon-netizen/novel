// ==================== Writing Tools Integration ====================
// 集成 NovelAutosave + NovelUndo + NovelStats + NovelExporter
// 在 editor.html 引入：<script src="js/editor-integration.js"></script>
// 监听 DOMContentLoaded，等 editor.js 的 init() 跑完后自动挂载
let autosaveController = null;
let undoController = null;
let statsController = null;
let lastWordCount = 0;

function setupWritingTools() {
    const editor = document.getElementById('contentEditor');
    if (!editor) return;

    const draftKey = 'editor:project-' + projectIndex + ':chapter-' + chapterIndex;
    autosaveController = NovelAutosave.watch(editor, {
        key: draftKey,
        debounceMs: 2000,
        onSave: function () { updateWordCount(); },
        onStatusChange: function (status) { updateSaveStatus(status); }
    });

    let prevValue = editor.value;
    undoController = NovelUndo.create({
        maxSize: 200,
        onChange: function (state) { updateUndoButtons(state.canUndo, state.canRedo); }
    });
    editor.addEventListener('input', function () {
        const ops = NovelUndo.diff(prevValue, editor.value);
        prevValue = editor.value;
        if (!ops) return;
        if (Array.isArray(ops)) {
            ops.forEach(function (op) { undoController.commit(op); });
        } else {
            undoController.commit(ops);
        }
    });
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            if (undoController && undoController.canUndo()) {
                e.preventDefault();
                const op = undoController.undo();
                if (op) {
                    NovelUndo.applyToTextarea(editor, op);
                    prevValue = editor.value;
                }
            }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            if (undoController && undoController.canRedo()) {
                e.preventDefault();
                const op = undoController.redo();
                if (op) {
                    NovelUndo.applyToTextarea(editor, op);
                    prevValue = editor.value;
                }
            }
        }
    });

    lastWordCount = NovelAutosave.countWords(editor.value);
    statsController = NovelStats.create({
        dailyGoal: 3000,
        onUpdate: function (stats) { updateStatsPanel(stats); }
    });
    statsController.addSession();
    editor.addEventListener('input', function () {
        const cur = NovelAutosave.countWords(editor.value);
        const delta = cur - lastWordCount;
        if (delta > 0) statsController.addWords(delta);
        lastWordCount = cur;
    });

    const draft = autosaveController.getDraft();
    if (draft && draft.content !== editor.value && draft.savedAt > Date.now() - 7 * 24 * 3600 * 1000) {
        const recovered = confirm(
            '检测到未保存的草稿（' + NovelAutosave.formatRelativeTime(draft.savedAt) + '保存）。是否恢复草稿内容？'
        );
        if (recovered) {
            editor.value = draft.content;
            prevValue = draft.content;
            updateWordCount();
            updateSaveStatus('restored');
        } else {
            autosaveController.clearDraft();
        }
    }

    updateUndoButtons(false, false);
    updateSaveStatus('idle');
}

function updateSaveStatus(status) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const map = {
        idle: { text: '', cls: '' },
        dirty: { text: '编辑中...', cls: 'status-dirty' },
        saving: { text: '保存中...', cls: 'status-saving' },
        saved: { text: '已保存 · ' + stamp, cls: 'status-saved' },
        error: { text: '保存失败 · ' + stamp, cls: 'status-error' },
        restored: { text: '已恢复草稿', cls: 'status-restored' }
    };
    const s = map[status] || map.idle;
    el.textContent = s.text;
    el.className = 'save-status ' + s.cls;
}

function updateUndoButtons(canUndo, canRedo) {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
}

function updateStatsPanel(stats) {
    const todayEl = document.getElementById('todayWords');
    const goalEl = document.getElementById('goalProgress');
    const streakEl = document.getElementById('streak');
    const readingEl = document.getElementById('readingTime');
    if (todayEl) todayEl.textContent = NovelStats.formatWords(stats.todayWords);
    if (goalEl) {
        goalEl.textContent = NovelStats.formatProgressBar(stats.goalProgress, 12);
        goalEl.title = '今日 ' + stats.todayWords + ' / ' + stats.dailyGoal + ' 字';
    }
    if (streakEl) streakEl.textContent = stats.streak + ' 天';
    if (readingEl) {
        const total = NovelAutosave.countWords(editor.value);
        readingEl.textContent = NovelStats.estimateReadingTime(total);
    }
}

function exportCurrentProjectAs(format) {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) { alert('没有项目可导出'); return; }
    const projects = JSON.parse(saved);
    const project = projects[projectIndex];
    if (!project) { alert('项目不存在'); return; }
    const r = NovelExporter.exportAs(project, format);
    if (!r.ok) alert('导出失败: ' + r.error);
}

function exportCurrentProjectMenu() {
    const format = prompt(
        '选择导出格式：1. markdown 2. html 3. text 4. json 5. pdf',
        'markdown'
    );
    if (format) exportCurrentProjectAs(format.trim());
}

// ==================== Auto-init ====================
// 等 editor.js 的 init() 跑完后自动挂载 writing tools
// （用 setTimeout 0 让出主线程，确保 init() 先执行完）
function tryInitWritingTools(retries) {
    retries = retries || 0;
    if (retries > 50) {
        console.warn('Writing tools: timed out waiting for contentEditor');
        return;
    }
    const editor = document.getElementById('contentEditor');
    if (editor) {
        setupWritingTools();
    } else {
        setTimeout(function () { tryInitWritingTools(retries + 1); }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(tryInitWritingTools, 0);
    });
} else {
    setTimeout(tryInitWritingTools, 0);
}
