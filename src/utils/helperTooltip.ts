export default {
  // 当元素被插入到 DOM 中时...
  mounted(el: any, binding: any) {
    const helper: any = document.querySelector('#helper');
    el.addEventListener('mouseenter', () => {
      const titleText = el.getAttribute('title');
      if (titleText) {
        window.variables.helperTaskId++;
        helper.textContent = titleText;
      }
    });

    // 鼠标离开事件
    el.addEventListener('mouseleave', () => {
      const currentTask = window.variables.helperTaskId;
      setTimeout(() => {
        if (currentTask === window.variables.helperTaskId) {
          helper.textContent = '';
        }
      }, window.config.helperTimeout);
    });
  }
};