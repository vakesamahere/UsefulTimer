<template>
  <div class="home">
    <div class="header">
      <div class="header-title">
        <h1>Timer Manager</h1>
        <p>专业的时间管理工具</p>
      </div>
      <div class="header-actions">
        <button @click="showAudioTemplateModal" class="header-btn template-btn">
          <span class="btn-icon">🎵</span>
          <span>声音模板</span>
        </button>
        <button @click="addNewTimer" class="header-btn add-timer-btn">
          <span class="btn-icon">➕</span>
          <span>添加 Timer</span>
        </button>
      </div>
    </div>
    <div class="main-content">
      <div class="timer-list" :key="timerListUpdateKey">
        <TimerDispaly
          v-for="timer in timerList"
          :key="timer.id"
          :timer="(timer as any)"
          :ref="(el) => { if (el) timerDisplays.push(el) }"
          @delete="deleteTimer"
        />
        <div v-if="timerList.length === 0" class="empty-state">
          <div class="empty-icon">⏰</div>
          <h3>暂无计时器</h3>
          <p>点击上方的"添加 Timer"按钮创建你的第一个计时器</p>
        </div>
      </div>
    </div>

    <!-- 声音模板管理模态框 -->
    <AudioTemplateModal
      v-model="showAudioTemplateModalFlag"
      :templates="audioTemplates"
      @save="saveAudioTemplates"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue';

import { Timer, AudioObjTemplate } from '@/utils/timer';
import TimerDispaly from '@/components/TimerDisplay.vue';
import AudioTemplateModal from '@/components/AudioTemplateModal.vue';
import { dataManager } from '@/utils/dataManager';

const timerList = ref<Timer[]>([]);
const timerDisplays: Ref<any[]> = ref([]);

const timerListUpdateKey = ref(0);
const updateTimerList = () => { timerListUpdateKey.value++; };

// 声音模板管理 - 使用新的数据管理系统
const audioTemplates = ref<AudioObjTemplate[]>([]);

const showAudioTemplateModalFlag = ref(false);

const showAudioTemplateModal = () => {
  showAudioTemplateModalFlag.value = true;
};

const saveAudioTemplates = (templates: AudioObjTemplate[]) => {
  audioTemplates.value = templates;
  // 保存所有音频模板到数据管理器
  templates.forEach(template => {
    dataManager.saveAudioTemplate(template);
  });
  console.log(`已保存 ${templates.length} 个音频模板`);
};

const addNewTimer = () => {
  const timerName = prompt('请输入计时器名称:') || `Timer ${timerList.value.length + 1}`;
  const newTimer = new Timer(timerName);

  // 保存到数据管理器
  dataManager.saveTimer(newTimer);

  // 添加到列表
  timerList.value.push(newTimer as any);
  updateTimerList();

  console.log(`新计时器已创建: ${timerName} (${newTimer.id})`);
};

// 删除计时器
const deleteTimer = (timerId: string) => {
  try {
    const timerIndex = timerList.value.findIndex(timer => timer.id === timerId);
    if (timerIndex !== -1) {
      const timer = timerList.value[timerIndex];

      // 确认删除
      if (confirm(`确定要删除计时器 "${timer.name}" 吗？此操作不可恢复。`)) {
        // 从数据管理器中删除
        dataManager.deleteTimer(timerId);

        // 从列表中移除
        timerList.value.splice(timerIndex, 1);
        updateTimerList();

        console.log(`计时器已删除: ${timer.name} (${timerId})`);
      }
    } else {
      console.warn(`未找到要删除的计时器: ${timerId}`);
    }
  } catch (error) {
    console.error('删除计时器失败:', error);
    alert('删除计时器失败，请重试');
  }
};

onMounted(async () => {
  console.log('TimerManager 开始初始化...');

  // 加载所有计时器
  await loadTimers();

  // 加载所有音频模板
  await loadAudioTemplates();

  console.log(`TimerManager 初始化完成: ${timerList.value.length} 个计时器, ${audioTemplates.value.length} 个音频模板`);
});

// 加载计时器数据
const loadTimers = async () => {
  try {
    // 首先清理重复数据
    const removedCount = dataManager.cleanupDuplicateTimers();
    if (removedCount > 0) {
      console.log(`清理了 ${removedCount} 个重复计时器`);
    }

    const savedTimers = dataManager.getTimerList();
    timerList.value = savedTimers;

    // 如果没有保存的计时器，创建一个示例计时器
    if (savedTimers.length === 0) {
      console.log('没有找到保存的计时器，创建示例计时器');
      const exampleTimer = new Timer('示例计时器');
      dataManager.saveTimer(exampleTimer);
      // 重新从数据管理器加载，确保数据一致性
      const updatedTimers = dataManager.getTimerList();
      timerList.value = updatedTimers;
    }

    // 强制更新所有计时器的渲染
    timerList.value.forEach((timer) => {
      if (timer && typeof timer.forceUpdate === 'function') {
        timer.forceUpdate();
      }
    });

    updateTimerList();
    console.log(`已加载 ${timerList.value.length} 个计时器`);
  } catch (error) {
    console.error('加载计时器失败:', error);
  }
};

// 加载音频模板数据
const loadAudioTemplates = async () => {
  try {
    const savedTemplates = dataManager.getAudioTemplateList();
    audioTemplates.value = savedTemplates;
    console.log(`已加载 ${savedTemplates.length} 个音频模板`);
  } catch (error) {
    console.error('加载音频模板失败:', error);
  }
};

</script>

<style scoped>
.home {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px 30px;
  margin-bottom: 30px;
  border: 1px solid var(--border-primary);
}

.header-title h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 700;
}

.header-title p {
  margin: 5px 0 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-normal);
  background-color: var(--btn-secondary-bg);
  color: var(--text-primary);
}

.template-btn {
  background-color: var(--btn-warning-bg);
  color: var(--bg-primary);
  border-color: var(--btn-warning-bg);
}

.template-btn:hover {
  background-color: var(--btn-warning-hover);
  border-color: var(--btn-warning-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
}

.add-timer-btn {
  background-color: var(--btn-success-bg);
  color: var(--bg-primary);
  border-color: var(--btn-success-bg);
}

.add-timer-btn:hover {
  background-color: var(--btn-success-hover);
  border-color: var(--btn-success-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
}

.btn-icon {
  font-size: 16px;
}

.main-content {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-primary);
  min-height: 400px;
}

.timer-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
  color: var(--text-muted);
}

.empty-state h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  color: var(--text-secondary);
}
</style>