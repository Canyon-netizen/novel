// ==================== Novel Undo Stack Module ====================
// 撤销/重做栈。基于"操作历史"而非快照（内存高效）。
// 4 个 view 共用，UMD 模式，暴露在 root.NovelUndo
//
// 用法：
//   const stack = NovelUndo.create({ maxSize: 100 });
//   stack.commit({ type: 'insert', position: 10, before: '', after: 'x' });
//   stack.commit({ type: 'delete', position: 15, before: 'x', after: '' });
//   stack.undo();     // 回到上一状态
//   stack.redo();     // 重做
//   stack.canUndo();  // boolean
//   stack.canRedo();

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelUndo = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== 操作合并 ====================
  // 相邻的字符输入操作可以合并成一个"长操作"
  // 例如用户连续打字 10 个字 = 1 次 undo
  const MERGE_WINDOW_MS = 800;

  function shouldMerge(prev, curr) {
    if (!prev || !curr) return false;
    if (prev.type !== curr.type) return false;
    if (curr.timestamp - prev.timestamp > MERGE_WINDOW_MS) return false;
    if (prev.type === 'insert') {
      // 同一个位置之后的连续插入
      return prev.position + prev.after.length === curr.position;
    }
    if (prev.type === 'delete') {
      // 同一位置向前删除（Backspace）
      return curr.position === prev.position;
    }
    return false;
  }

  function merge(prev, curr) {
    if (prev.type === 'insert') {
      return {
        type: 'insert',
        position: prev.position,
        before: prev.before,
        after: prev.after + curr.after,
        timestamp: curr.timestamp
      };
    }
    if (prev.type === 'delete') {
      return {
        type: 'delete',
        position: prev.position,
        before: curr.before + prev.before,
        after: curr.after,
        timestamp: curr.timestamp
      };
    }
    return curr;
  }

  // ==================== 栈 ====================
  function create(options) {
    const opts = options || {};
    const maxSize = opts.maxSize || 200;
    const onChange = opts.onChange || function () {};

    let stack = [];      // 撤销栈
    let redoStack = [];  // 重做栈
    let listeners = [];

    function notify() {
      onChange({
        canUndo: stack.length > 0,
        canRedo: redoStack.length > 0,
        undoCount: stack.length,
        redoCount: redoStack.length
      });
      listeners.forEach(function (fn) {
        try { fn(); } catch (e) { /* ignore */ }
      });
    }

    function commit(op) {
      if (!op || op.type === 'noop') return;
      const enriched = Object.assign({}, op, { timestamp: Date.now() });

      // 尝试与栈顶合并
      if (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (shouldMerge(top, enriched)) {
          stack[stack.length - 1] = merge(top, enriched);
          // 提交新操作后清空 redo 栈
          redoStack = [];
          notify();
          return;
        }
      }

      stack.push(enriched);
      // 限制大小
      if (stack.length > maxSize) {
        stack.shift();
      }
      // 提交新操作后清空 redo 栈
      redoStack = [];
      notify();
    }

    function undo() {
      if (stack.length === 0) return null;
      const op = stack.pop();
      redoStack.push(op);
      notify();
      return inverse(op);
    }

    function redo() {
      if (redoStack.length === 0) return null;
      const op = redoStack.pop();
      stack.push(op);
      notify();
      return op;
    }

    function canUndo() {
      return stack.length > 0;
    }

    function canRedo() {
      return redoStack.length > 0;
    }

    function clear() {
      stack = [];
      redoStack = [];
      notify();
    }

    function getHistory() {
      // 返回历史摘要（用于调试）
      return {
        undo: stack.map(function (op) {
          return { type: op.type, length: (op.after || '').length || (op.before || '').length };
        }),
        redo: redoStack.map(function (op) {
          return { type: op.type, length: (op.after || '').length || (op.before || '').length };
        })
      };
    }

    function onChangeListener(fn) {
      listeners.push(fn);
    }

    return {
      commit: commit,
      undo: undo,
      redo: redo,
      canUndo: canUndo,
      canRedo: canRedo,
      clear: clear,
      getHistory: getHistory,
      onChangeListener: onChangeListener,
      // 工具
      _shouldMerge: shouldMerge,
      _merge: merge
    };
  }

  // ==================== Diff 工具 ====================
  // 从 textarea 的 before/after 提取操作
  // 这是个简化实现：找第一个不同点 + 找最后一个不同点
  function diff(before, after) {
    if (before === after) return null;
    let start = 0;
    const minLen = Math.min(before.length, after.length);
    while (start < minLen && before[start] === after[start]) {
      start++;
    }
    let endBefore = before.length;
    let endAfter = after.length;
    while (
      endBefore > start && endAfter > start &&
      before[endBefore - 1] === after[endAfter - 1]
    ) {
      endBefore--;
      endAfter--;
    }
    const removed = before.slice(start, endBefore);
    const added = after.slice(start, endAfter);

    if (removed.length === 0 && added.length > 0) {
      return { type: 'insert', position: start, before: '', after: added };
    }
    if (added.length === 0 && removed.length > 0) {
      return { type: 'delete', position: start, before: removed, after: '' };
    }
    // 替换：拆成 delete + insert
    return [
      { type: 'delete', position: start, before: removed, after: '' },
      { type: 'insert', position: start, before: '', after: added }
    ];
  }

  // ==================== 应用操作 ====================
  function applyToTextarea(textarea, op) {
    if (!textarea) return;
    if (op.type === 'insert') {
      const before = textarea.value.slice(0, op.position);
      const after = textarea.value.slice(op.position);
      textarea.value = before + op.after + after;
      // 移动光标
      const newPos = op.position + op.after.length;
      setCaretPosition(textarea, newPos);
    } else if (op.type === 'delete') {
      const before = textarea.value.slice(0, op.position);
      const after = textarea.value.slice(op.position + op.before.length);
      textarea.value = before + after;
      setCaretPosition(textarea, op.position);
    }
  }

  function setCaretPosition(textarea, pos) {
    if (textarea.setSelectionRange) {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }
  }

  function inverse(op) {
    if (op.type === 'insert') {
      return { type: 'delete', position: op.position, before: op.after, after: '' };
    }
    if (op.type === 'delete') {
      return { type: 'insert', position: op.position, before: '', after: op.before };
    }
    return null;
  }

  return {
    create: create,
    diff: diff,
    applyToTextarea: applyToTextarea,
    inverse: inverse
  };
});
